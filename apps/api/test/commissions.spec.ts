import { prisma, Prisma } from '@creatormarket/database';
import { CommissionService } from '../src/affiliates/commission.service';
import {
  resetDb,
  createUser,
  createFundedBuyer,
  createCreatorWithProduct,
  createPendingOrder,
} from './helpers';
import { randomUUID } from 'crypto';

/**
 * Integration coverage for the money engine: every sale's split is recorded on
 * the immutable ledger, affiliate conversions and denormalised counters stay
 * consistent, releases and reversals are exact. Requires a live Postgres
 * (see test/README.md).
 */
describe('CommissionService (integration)', () => {
  const service = new CommissionService();

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  async function createApprovedAffiliate(productId: string) {
    const user = await createUser();
    const affiliate = await prisma.affiliate.create({
      data: {
        userId: user.id,
        code: `aff-${randomUUID().slice(0, 8)}`,
        status: 'ACTIVE',
      },
    });
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        productId,
        code: `lnk-${randomUUID().slice(0, 8)}`,
        url: `https://creatormarket.ng/?ref=${randomUUID().slice(0, 8)}`,
        status: 'ACTIVE',
      },
    });
    return { user, affiliate, link };
  }

  async function attribute(
    orderId: string,
    productId: string,
    link: { id: string },
    affiliate: { id: string },
  ) {
    await prisma.affiliateAttribution.create({
      data: {
        affiliateId: affiliate.id,
        linkId: link.id,
        productId,
        orderId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  /**
   * Record commissions for an existing order. Returns the service result plus
   * the conversion row shape the spec asserts against.
   */
  async function record(
    order: {
      id: string;
      buyerId: string;
      items: Array<{
        id: string;
        totalPrice: Prisma.Decimal;
      }>;
    },
    product: { id: string; title: string; creatorId: string; affiliateCommissionRate: number | null },
    orderTotal: Prisma.Decimal,
    opts: { currency?: string; utm?: any; acquisitionSource?: string } = {},
  ) {
    return prisma.$transaction((tx) =>
      service.recordCommissions(
        tx,
        {
          id: order.id,
          buyerId: order.buyerId,
          currency: opts.currency ?? 'NGN',
          utm: opts.utm,
          acquisitionSource: opts.acquisitionSource as any,
          items: order.items.map((i) => ({
            id: i.id,
            productId: product.id,
            totalPrice: i.totalPrice,
            product: {
              id: product.id,
              title: product.title,
              creatorId: product.creatorId,
              affiliateCommissionRate: product.affiliateCommissionRate,
            },
          })),
        },
        orderTotal,
        { provider: 'paystack', fee: new Prisma.Decimal(15), currency: 'NGN', reference: 'PAYSTK-1' },
      ),
    );
  }

  it('direct sale: platform 10%, creator 90%, no conversion, gateway fee on ledger', async () => {
    const buyer = await createUser();
    const { profile, product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product);

    const result = await record(order, product, order.totalAmount);

    expect(result.creatorCredits).toEqual([
      { creatorId: profile.id, amount: new Prisma.Decimal(900) },
    ]);
    expect(result.affiliateConversionCount).toBe(0);

    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.platformAmount.toString()).toBe('100');
    expect(ledger.creatorAmount.toString()).toBe('900');
    expect(ledger.affiliateId).toBeNull();
    expect(ledger.acquisitionSource).toBe('UNKNOWN');
    expect(ledger.gatewayProvider).toBe('paystack');
    expect(ledger.gatewayFee.toString()).toBe('15');
    expect(ledger.gatewayReference).toBe('PAYSTK-1');

    const commission = await prisma.commission.findFirstOrThrow({ where: { orderId: order.id } });
    expect(commission.status).toBe('PENDING');
    expect(commission.amount.toString()).toBe('100');
    expect(await prisma.affiliateConversion.count({ where: { orderId: order.id } })).toBe(0);
  });

  it('affiliate sale: platform keeps its 10%, reward comes off the creator side', async () => {
    const buyer = await createUser();
    const { profile, product } = await createCreatorWithProduct(1000);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: 30 },
    });
    const { affiliate, link } = await createApprovedAffiliate(product.id);
    const order = await createPendingOrder(buyer.id, product);
    await attribute(order.id, product.id, link, affiliate);

    const result = await record(order, { ...product, affiliateCommissionRate: 30 }, order.totalAmount);

    expect(result.affiliateConversionCount).toBe(1);
    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.platformAmount.toString()).toBe('100');
    expect(ledger.affiliateAmount.toString()).toBe('300');
    expect(ledger.creatorAmount.toString()).toBe('600');
    expect(ledger.creatorRate.toString()).toBe('60');
    expect(ledger.acquisitionSource).toBe('AFFILIATE');
    expect(ledger.affiliateId).toBe(affiliate.id);

    const conversion = await prisma.affiliateConversion.findFirstOrThrow({ where: { orderId: order.id } });
    expect(conversion.amount.toString()).toBe('300');
    expect(conversion.status).toBe('PENDING');
    expect(conversion.heldUntil.getTime()).toBeGreaterThan(Date.now());

    const linkAfter = await prisma.affiliateLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(linkAfter.conversionCount).toBe(1);
    expect(linkAfter.grossSales.toString()).toBe('1000');
    expect(linkAfter.commissionEarned.toString()).toBe('300');
    const affAfter = await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } });
    expect(affAfter.totalConversions).toBe(1);
  });

  it('a legacy product without a stored rate pays the default 20% reward', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: null },
    });
    const { affiliate, link } = await createApprovedAffiliate(product.id);
    const order = await createPendingOrder(buyer.id, product);
    await attribute(order.id, product.id, link, affiliate);

    await record(order, { ...product, affiliateCommissionRate: null }, order.totalAmount);

    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.affiliateAmount.toString()).toBe('200');
    expect(ledger.affiliateRate.toString()).toBe('20');
    expect(ledger.creatorAmount.toString()).toBe('700');
  });

  it('a coupon discount shrinks the basis for all three shares', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: 20 },
    });
    const { affiliate, link } = await createApprovedAffiliate(product.id);
    const order = await createPendingOrder(buyer.id, product);
    await attribute(order.id, product.id, link, affiliate);

    await record(order, { ...product, affiliateCommissionRate: 20 }, new Prisma.Decimal(900));

    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.paidAmount.toString()).toBe('900');
    expect(ledger.platformAmount.toString()).toBe('90');
    expect(ledger.affiliateAmount.toString()).toBe('180');
    expect(ledger.creatorAmount.toString()).toBe('630');
  });

  it('aggregates credits per creator across multiple items', async () => {
    const buyer = await createUser();
    const { profile, product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product, 2);
    // A genuine second line so the ledger gets one row per item.
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        productName: product.title,
        unitPrice: product.price,
        price: product.price,
        quantity: 1,
        totalPrice: new Prisma.Decimal(1000),
        licenseType: 'PERSONAL',
      },
    });
    const fresh = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });

    const result = await record(fresh, product, new Prisma.Decimal(3000));

    expect(result.creatorCredits[0].amount.toString()).toBe('2700');
    expect(await prisma.commissionLedger.count({ where: { orderId: order.id } })).toBe(2);
  });

  it('an inactive affiliate is not credited — the creator keeps the full net', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: 20 },
    });
    // Affiliate account still PENDING review -> attribution must not pay out.
    const pendingUser = await createUser();
    const affiliate = await prisma.affiliate.create({
      data: { userId: pendingUser.id, code: `aff-${randomUUID().slice(0, 8)}`, status: 'PENDING' },
    });
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        productId: product.id,
        code: `lnk-${randomUUID().slice(0, 8)}`,
        url: 'https://creatormarket.ng/?ref=x',
      },
    });
    const order = await createPendingOrder(buyer.id, product);
    await attribute(order.id, product.id, link, affiliate);

    const result = await record(order, { ...product, affiliateCommissionRate: 20 }, order.totalAmount);

    expect(result.affiliateConversionCount).toBe(0);
    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.affiliateId).toBeNull();
    expect(ledger.creatorAmount.toString()).toBe('900');
  });

  it('records a utm-driven PLATFORM_CAMPAIGN source', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product);

    await record(order, product, order.totalAmount, { utm: { campaign: 'launch', source: 'newsletter' } });

    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.acquisitionSource).toBe('PLATFORM_CAMPAIGN');
  });

  it('an explicit source hint is persisted verbatim', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product);

    await record(order, product, order.totalAmount, { acquisitionSource: 'CREATOR_DIRECT' });

    const ledger = await prisma.commissionLedger.findFirstOrThrow({ where: { orderItemId: order.items[0].id } });
    expect(ledger.acquisitionSource).toBe('CREATOR_DIRECT');
  });

  it('a self-referral (buyer is the affiliate) is not credited', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: 20 },
    });
    const affiliate = await prisma.affiliate.create({
      data: { userId: buyer.id, code: `aff-${randomUUID().slice(0, 8)}`, status: 'ACTIVE' },
    });
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        productId: product.id,
        code: `lnk-${randomUUID().slice(0, 8)}`,
        url: 'https://creatormarket.ng/?ref=self',
      },
    });
    const order = await createPendingOrder(buyer.id, product);
    await attribute(order.id, product.id, link, affiliate);

    const result = await record(order, { ...product, affiliateCommissionRate: 20 }, order.totalAmount);

    expect(result.affiliateConversionCount).toBe(0);
  });
});

describe('CommissionService release + reverse (integration)', () => {
  const service = new CommissionService();

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  async function fundedAffiliateSale(price = 1000, rate = 20) {
    const buyer = await createFundedBuyer(price);
    const { profile, product } = await createCreatorWithProduct(price);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: rate },
    });
    const affUser = await createUser();
    const affiliate = await prisma.affiliate.create({
      data: { userId: affUser.id, code: `aff-${randomUUID().slice(0, 8)}`, status: 'ACTIVE' },
    });
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        productId: product.id,
        code: `lnk-${randomUUID().slice(0, 8)}`,
        url: 'https://creatormarket.ng/?ref=x',
      },
    });
    const order = await createPendingOrder(buyer.id, product);
    await prisma.affiliateAttribution.create({
      data: {
        affiliateId: affiliate.id,
        linkId: link.id,
        productId: product.id,
        orderId: order.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const item = order.items[0];
    await prisma.$transaction((tx) =>
      service.recordCommissions(
        tx,
        {
          id: order.id,
          buyerId: buyer.id,
          items: [
            {
              id: item.id,
              productId: product.id,
              totalPrice: item.totalPrice,
              product: {
                id: product.id,
                title: product.title,
                creatorId: profile.id,
                affiliateCommissionRate: rate,
              },
            },
          ],
        },
        order.totalAmount,
      ),
    );
    const conversion = await prisma.affiliateConversion.findFirstOrThrow({ where: { orderId: order.id } });
    return { buyer, profile, product, affiliate, link, order, conversion };
  }

  it('releaseDueConversions only pays out conversions past their holding period', async () => {
    const { affiliate, conversion } = await fundedAffiliateSale(1000);

    // Not yet due.
    expect(await service.releaseDueConversions(affiliate.id)).toBe(0);
    let row = await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } });
    expect(row.status).toBe('PENDING');

    // Expire the hold and release.
    await prisma.affiliateConversion.update({
      where: { id: conversion.id },
      data: { heldUntil: new Date(Date.now() - 1000) },
    });
    expect(await service.releaseDueConversions(affiliate.id)).toBe(1);

    row = await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } });
    expect(row.status).toBe('PAYABLE');
    expect(row.payableAt).not.toBeNull();
    const aff = await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } });
    expect(aff.totalEarnings.toString()).toBe('200');
  });

  it('fully reversing a conversion restores the affiliate counters', async () => {
    const { affiliate, link, conversion } = await fundedAffiliateSale(1000);
    // Expire the holding period and let the engine release (increments earnings).
    await prisma.affiliateConversion.update({
      where: { id: conversion.id },
      data: { heldUntil: new Date(Date.now() - 1000) },
    });
    await service.releaseDueConversions(affiliate.id);
    expect(
      (await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } }))
        .totalEarnings
        .toString(),
    ).toBe('200');

    await prisma.$transaction((tx) =>
      service.reverseConversion(tx, conversion.id, 'test reversal'),
    );

    const row = await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } });
    expect(row.status).toBe('REVERSED');
    expect(row.reversalAmount.toString()).toBe('200');
    expect(row.reversalReason).toBe('test reversal');
    const aff = await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } });
    expect(aff.totalConversions).toBe(0);
    expect(aff.totalEarnings.toString()).toBe('0');
    const linkAfter = await prisma.affiliateLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(linkAfter.conversionCount).toBe(0);
    expect(linkAfter.commissionEarned.toString()).toBe('0');
    expect(linkAfter.grossSales.toString()).toBe('0');
  });

  it('a partial reversal leaves the remainder available and adjusts earnings only by the reversed amount', async () => {
    const { affiliate, link, conversion } = await fundedAffiliateSale(1000);
    await prisma.affiliateConversion.update({
      where: { id: conversion.id },
      data: { heldUntil: new Date(Date.now() - 1000) },
    });
    await service.releaseDueConversions(affiliate.id);
    expect(
      (await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } }))
        .totalEarnings
        .toString(),
    ).toBe('200');

    await prisma.$transaction((tx) =>
      service.reverseConversion(tx, conversion.id, 'partial', new Prisma.Decimal(150)),
    );

    const row = await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } });
    expect(row.status).toBe('PAYABLE');
    expect(row.reversalAmount.toString()).toBe('150');
    const aff = await prisma.affiliate.findUniqueOrThrow({ where: { id: affiliate.id } });
    expect(aff.totalEarnings.toString()).toBe('50');
    expect(aff.totalConversions).toBe(1);
    const linkAfter = await prisma.affiliateLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(linkAfter.commissionEarned.toString()).toBe('50');
    expect(linkAfter.grossSales.toString()).toBe('250');
  });

  it('reverseOrderCommissions reverses platform rows and returns creator nets from the ledger', async () => {
    const { profile, order, conversion } = await fundedAffiliateSale(1000);

    const result = await prisma.$transaction((tx) =>
      service.reverseOrderCommissions(tx, order.id, 'refunded'),
    );

    expect(result.reversedConversions).toBe(1);
    expect((await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } })).status).toBe('REVERSED');
    const commission = await prisma.commission.findFirstOrThrow({ where: { orderId: order.id } });
    expect(commission.status).toBe('REVERSED');
    // ratio 1: full creator net (700) per the ledger.
    expect(result.creatorNets.get(profile.id)!.toString()).toBe('700');
  });

  it('a half refund (ratio 0.5) claws back half the creator net and half the reward', async () => {
    const { profile, order, conversion } = await fundedAffiliateSale(1000);

    const result = await prisma.$transaction((tx) =>
      service.reverseOrderCommissions(tx, order.id, 'partial refund', new Prisma.Decimal('0.5')),
    );

    expect(result.creatorNets.get(profile.id)!.toString()).toBe('350');
    const row = await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } });
    expect(row.status).toBe('PENDING'); // not fully reversed
    expect(row.reversalAmount.toString()).toBe('100');
  });
});
