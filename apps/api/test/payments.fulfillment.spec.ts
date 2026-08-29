import { prisma } from '@creatorplus/database';
import { PaymentsService } from '../src/payments/payments.service';
import { CommissionService } from '../src/affiliates/commission.service';
import {
  resetDb,
  createUser,
  createCreatorWithProduct,
  createPendingOrder,
  emailStub,
  notificationsStub,
  providerFactoryStub,
} from './helpers';

/**
 * Integration coverage for order fulfillment idempotency under duplicate and
 * concurrent webhook delivery — C1 + C2. `fulfillOrder` is private; we invoke
 * it directly to simulate a provider delivering the same success event twice.
 * Requires a live Postgres (see test/README.md).
 */
describe('PaymentsService.fulfillOrder idempotency (integration)', () => {
  const service = new PaymentsService(providerFactoryStub, emailStub, notificationsStub, new CommissionService());
  const fulfill = (orderId: string) => (service as any).fulfillOrder(orderId) as Promise<void>;

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it('credits the creator exactly once for a sequential duplicate webhook', async () => {
    const buyer = await createUser();
    const { profile, product } = await createCreatorWithProduct(2000);
    const order = await createPendingOrder(buyer.id, product);

    await fulfill(order.id);
    await fulfill(order.id); // duplicate delivery

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(wallet.availableBalance.toString()).toBe('1800'); // 2000 - 10%, once
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.download.count({ where: { orderItem: { orderId: order.id } } })).toBe(1);
    expect(await prisma.walletTransaction.count({ where: { referenceId: order.id, type: 'SALE' } })).toBe(1);
  });

  it('credits the creator exactly once under concurrent webhook delivery (C2)', async () => {
    const buyer = await createUser();
    const { profile, product } = await createCreatorWithProduct(2000);
    const order = await createPendingOrder(buyer.id, product);

    // Fire the same fulfillment in parallel — only one atomic claim can win.
    await Promise.all([fulfill(order.id), fulfill(order.id), fulfill(order.id)]);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(wallet.availableBalance.toString()).toBe('1800');
    expect(await prisma.commission.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.walletTransaction.count({ where: { referenceId: order.id, type: 'SALE' } })).toBe(1);
  });
});
