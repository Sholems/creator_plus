import { prisma } from '@creatormarket/database';
import { PaymentsService } from '../src/payments/payments.service';
import { RefundsService } from '../src/refunds/refunds.service';
import { CommissionService } from '../src/affiliates/commission.service';
import {
  resetDb,
  createUser,
  createFundedBuyer,
  createCreatorWithProduct,
  createPendingOrder,
  emailStub,
  notificationsStub,
  providerFactoryStub,
  refundProviderFactoryStub,
} from './helpers';

/**
 * Integration coverage for refund approval reversing creator earnings — C4.
 * Requires a live Postgres (see test/README.md).
 */
describe('RefundsService.approve reversal (integration)', () => {
  const payments = new PaymentsService(providerFactoryStub, emailStub, notificationsStub, new CommissionService());
  const refunds = new RefundsService(refundProviderFactoryStub, notificationsStub, new CommissionService());

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  async function fulfilledOrder(price = 1000) {
    const buyer = await createFundedBuyer(price);
    const { profile, product } = await createCreatorWithProduct(price);
    const order = await createPendingOrder(buyer.id, product);
    await payments.payWithWallet(order.id, buyer.id);
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    return { buyer, profile, product, order, payment };
  }

  it('debits the creator wallet and reverses commissions on approval', async () => {
    const { profile, order, payment } = await fulfilledOrder(1000);

    // Creator was credited 900 (1000 - 10%).
    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(before.availableBalance.toString()).toBe('900');

    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amount: order.totalAmount,
        reason: 'not as described',
        status: 'PENDING',
      },
    });
    const admin = await createUser();

    await refunds.approve(refund.id, admin.id);

    // Creator earnings reversed to zero.
    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(after.availableBalance.toString()).toBe('0');

    // Commission reversed, order + payment refunded, ledger records the reversal.
    const commission = await prisma.commission.findFirstOrThrow({ where: { orderId: order.id } });
    expect(commission.status).toBe('REVERSED');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('REFUNDED');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
    expect(
      await prisma.walletTransaction.count({ where: { referenceId: refund.id, type: 'REFUND' } }),
    ).toBe(1);
  });

  it('is idempotent — a second approval is rejected and does not double-debit', async () => {
    const { profile, order, payment } = await fulfilledOrder(1000);
    const refund = await prisma.refund.create({
      data: { orderId: order.id, paymentId: payment.id, amount: order.totalAmount, reason: 'x', status: 'PENDING' },
    });
    const admin = await createUser();

    await refunds.approve(refund.id, admin.id);
    await expect(refunds.approve(refund.id, admin.id)).rejects.toThrow(/pending/i);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: profile.userId } });
    expect(wallet.availableBalance.toString()).toBe('0'); // not -900
  });
});
