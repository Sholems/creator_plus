import { prisma, Prisma } from '@creatorplus/database';
import { CommissionService } from '../src/affiliates/commission.service';
import { AffiliatesService } from '../src/affiliates/affiliates.service';
import {
  resetDb,
  createUser,
  createFundedBuyer,
  createCreatorWithProduct,
  createPendingOrder,
  notificationsStub,
} from './helpers';
import { randomUUID } from 'crypto';

/**
 * Integration coverage for affiliate payout availability: derived from payout
 * items (not status), so a conversion can be paid out in several requests and
 * is marked PAID only when fully consumed. Requires a live Postgres.
 */
describe('AffiliatesService.requestPayout (integration)', () => {
  const affiliates = new AffiliatesService(notificationsStub, new CommissionService());

  beforeEach(async () => {
    await resetDb();
    await prisma.systemSetting.upsert({
      where: { key: 'affiliate.min_payout' },
      update: { value: 100 },
      create: { key: 'affiliate.min_payout', value: 100, group: 'commission' },
    });
  });
  afterAll(() => prisma.$disconnect());

  /** A sale of ₦10,000 with a 20% reward → a ₦2,000 conversion. */
  async function releasedSale() {
    const buyer = await createFundedBuyer(10000);
    const { profile, product } = await createCreatorWithProduct(10000);
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateStatus: 'APPROVED', affiliateCommissionRate: 20 },
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
        url: 'https://mycreatorplus.com/?ref=x',
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
      new CommissionService().recordCommissions(
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
                affiliateCommissionRate: 20,
              },
            },
          ],
        },
        order.totalAmount,
      ),
    );
    const conversion = await prisma.affiliateConversion.findFirstOrThrow({ where: { orderId: order.id } });
    await prisma.affiliateConversion.update({
      where: { id: conversion.id },
      data: { heldUntil: new Date(Date.now() - 1000) },
    });
    await new CommissionService().releaseDueConversions(affiliate.id);
    const released = await prisma.affiliateConversion.findFirstOrThrow({ where: { id: conversion.id } });
    expect(released.status).toBe('PAYABLE');
    return { buyer, profile, product, affiliate, conversion };
  }

  it('a full payout marks the conversion PAID', async () => {
    const { affiliate, conversion } = await releasedSale();

    const payout = await affiliates.requestPayout(affiliate.userId, { amount: 2000 });

    expect(payout.amount.toString()).toBe('2000');
    expect((await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } })).status).toBe('PAID');
    const items = await prisma.affiliatePayoutItem.findMany({ where: { payoutId: payout.id } });
    expect(items).toHaveLength(1);
    expect(items[0].amount.toString()).toBe('2000');
  });

  it('a partial payout leaves the conversion available for a second request', async () => {
    const { affiliate, conversion } = await releasedSale();

    const first = await affiliates.requestPayout(affiliate.userId, { amount: 1500 });
    expect(first.amount.toString()).toBe('1500');
    expect((await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } })).status).toBe('PAYABLE');

    const second = await affiliates.requestPayout(affiliate.userId, { amount: 500 });
    expect(second.amount.toString()).toBe('500');
    expect((await prisma.affiliateConversion.findUniqueOrThrow({ where: { id: conversion.id } })).status).toBe('PAID');

    // The conversion was never double-claimed: exactly 2000 across all items.
    const total = await prisma.affiliatePayoutItem.aggregate({
      where: { conversionId: conversion.id },
      _sum: { amount: true },
    });
    expect(total._sum.amount!.toString()).toBe('2000');
  });

  it('rejects a request that exceeds the available balance', async () => {
    const { affiliate } = await releasedSale();
    await expect(affiliates.requestPayout(affiliate.userId, { amount: 2500 })).rejects.toThrow(/exceeds/i);
  });

  it('availability excludes reversed amounts', async () => {
    const { affiliate, conversion } = await releasedSale();
    // Reverse half the reward; only 1000 stays available.
    await prisma.$transaction((tx) =>
      new CommissionService().reverseConversion(tx, conversion.id, 'fraud', new Prisma.Decimal(1000)),
    );

    await expect(affiliates.requestPayout(affiliate.userId, { amount: 1500 })).rejects.toThrow(/exceeds/i);
    const payout = await affiliates.requestPayout(affiliate.userId, { amount: 1000 });
    expect(payout.amount.toString()).toBe('1000');
  });
});
