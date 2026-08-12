import { prisma, Prisma } from '@creatormarket/database';
import { PaymentsService } from '../src/payments/payments.service';
import { CommissionService } from '../src/affiliates/commission.service';
import {
  resetDb,
  createFundedBuyer,
  createCreatorWithProduct,
  createPendingOrder,
  emailStub,
  notificationsStub,
  providerFactoryStub,
} from './helpers';

/**
 * Integration coverage for wallet checkout — C1 (atomic fulfillment) and
 * C3 (no wallet double-spend). Requires a live Postgres (see test/README.md).
 */
describe('PaymentsService.payWithWallet (integration)', () => {
  const service = new PaymentsService(providerFactoryStub, emailStub, notificationsStub, new CommissionService());

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it('debits buyer, credits creator net, and fulfills the order atomically', async () => {
    const buyer = await createFundedBuyer(1000);
    const { profile, product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product);

    await service.payWithWallet(order.id, buyer.id);

    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe('PAID');

    // Buyer wallet drained to zero.
    const buyerWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: buyer.id } });
    expect(buyerWallet.availableBalance.toString()).toBe('0');

    // Creator credited net of the 10% default commission.
    const creatorWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(creatorWallet.availableBalance.toString()).toBe('900');

    // Commission + download rows exist exactly once.
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1);
    const commission = await prisma.commission.findFirstOrThrow({ where: { orderId: order.id } });
    expect(commission.creatorId).toBe(profile.id); // keyed by creatorProfile.id
    expect(commission.amount.toString()).toBe('100');
    expect(await prisma.download.count({ where: { userId: buyer.id } })).toBe(1);
  });

  it('is idempotent — paying an already-paid order does not double-credit', async () => {
    const buyer = await createFundedBuyer(1000);
    const { profile, product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product);

    await service.payWithWallet(order.id, buyer.id);
    const second = await service.payWithWallet(order.id, buyer.id);

    expect(second).toMatchObject({ alreadyPaid: true });
    const creatorWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(creatorWallet.availableBalance.toString()).toBe('900'); // not 1800
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('rejects payment when the balance is insufficient', async () => {
    const buyer = await createFundedBuyer(500);
    const { product } = await createCreatorWithProduct(1000);
    const order = await createPendingOrder(buyer.id, product);

    await expect(service.payWithWallet(order.id, buyer.id)).rejects.toThrow(/Insufficient/);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: buyer.id } });
    expect(wallet.availableBalance.toString()).toBe('500'); // untouched
  });

  it('cannot be double-spent by concurrent orders (C3)', async () => {
    // Buyer can afford exactly ONE of two ₦1000 orders.
    const buyer = await createFundedBuyer(1000);
    const { product } = await createCreatorWithProduct(1000);
    const orderA = await createPendingOrder(buyer.id, product);
    const orderB = await createPendingOrder(buyer.id, product);

    const results = await Promise.allSettled([
      service.payWithWallet(orderA.id, buyer.id),
      service.payWithWallet(orderB.id, buyer.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: buyer.id } });
    expect(wallet.availableBalance.toString()).toBe('0'); // never negative
  });
});
