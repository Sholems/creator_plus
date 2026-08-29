import { prisma } from '@creatorplus/database';
import { PaymentsService } from './payments.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrPayment: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    qrEntitlement: { create: jest.fn() },
    payment: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
  Prisma: {},
}));

const p = prisma as any;

function build(event: any) {
  const provider = {
    name: 'paystack',
    verifyWebhook: jest.fn().mockReturnValue(true),
    parseWebhookEvent: jest.fn().mockReturnValue(event),
  };
  const factory = { get: jest.fn().mockReturnValue(provider) } as any;
  const service = new PaymentsService(
    factory,
    {} as any, // email
    {} as any, // notifications
    {} as any, // commission
    {} as any, // licenses
    {} as any, // events
  );
  return { service, provider };
}

const qrEvent = (over: any = {}) => ({
  type: 'checkout.completed',
  providerReference: 'QR_abc123',
  providerPaymentId: 'QR_abc123',
  amount: 1500,
  raw: { data: { metadata: { qrPaymentId: 'qrp-1', purpose: 'qr_studio' } } },
  ...over,
});

const qrPaymentRow = {
  id: 'qrp-1',
  userId: 'u1',
  offerCode: 'SINGLE',
  amount: { toNumber: () => 1500 },
  accessStartsAt: new Date('2026-10-01T00:00:00Z'),
  accessEndsAt: new Date('2027-10-01T00:00:00Z'),
  providerPaymentId: null,
  providerReference: 'QR_abc123',
};

describe('PaymentsService.handleWebhook — QR vs marketplace isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.QR_STUDIO_ENABLED;
  });

  it('routes a QR-intent event to QR fulfillment and never to marketplace order fulfillment (R7, AE2)', async () => {
    p.qrPayment.findFirst.mockResolvedValue(qrPaymentRow);
    const tx = {
      qrPayment: {
        findUnique: jest.fn().mockResolvedValue(qrPaymentRow),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      qrEntitlement: { create: jest.fn() },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const { service } = build(qrEvent());
    const res = await service.handleWebhook('paystack', '{}', 'sig');

    expect(res).toEqual({ received: true, qrStudio: true });
    expect(tx.qrEntitlement.create).toHaveBeenCalledTimes(1);
    expect(p.payment.findFirst).not.toHaveBeenCalled(); // marketplace path untouched
  });

  it('leaves an ordinary marketplace event on the marketplace path (QR lookup skipped)', async () => {
    p.payment.findFirst.mockResolvedValue(null); // marketplace payment missing -> markOrderPaid throws
    const { service } = build(
      qrEvent({ providerReference: 'CM_marketplace', providerPaymentId: 'CM_marketplace', raw: { data: {} } }),
    );

    await expect(service.handleWebhook('paystack', '{}', 'sig')).rejects.toThrow('Payment record not found');
    expect(p.qrPayment.findFirst).not.toHaveBeenCalled(); // QR classification did not claim it
  });

  it('blocks a QR-looking event with no QR payment row from falling through to marketplace (AE10-adjacent)', async () => {
    p.qrPayment.findFirst.mockResolvedValue(null);
    const { service } = build(qrEvent());

    const res = await service.handleWebhook('paystack', '{}', 'sig');
    expect(res).toEqual({ received: true, ignored: true });
    expect(p.payment.findFirst).not.toHaveBeenCalled();
  });

  it('does not fulfill a QR entitlement twice for a duplicate webhook (idempotent, R7)', async () => {
    p.qrPayment.findFirst.mockResolvedValue(qrPaymentRow);
    const create = jest.fn();
    const tx = {
      qrPayment: {
        findUnique: jest.fn().mockResolvedValue(qrPaymentRow),
        update: jest.fn(),
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 }) // first webhook claims it
          .mockResolvedValue({ count: 0 }), // duplicate finds nothing to claim
      },
      qrEntitlement: { create },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const { service } = build(qrEvent());
    await service.handleWebhook('paystack', '{}', 'sig');
    await service.handleWebhook('paystack', '{}', 'sig');

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects fulfillment when the paid amount does not match the offer (defense-in-depth)', async () => {
    p.qrPayment.findFirst.mockResolvedValue(qrPaymentRow);
    const tx = {
      qrPayment: {
        findUnique: jest.fn().mockResolvedValue(qrPaymentRow),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      qrEntitlement: { create: jest.fn() },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const { service } = build(qrEvent({ amount: 100 })); // wrong amount
    await expect(service.handleWebhook('paystack', '{}', 'sig')).rejects.toThrow(
      'amount does not match',
    );
    expect(tx.qrEntitlement.create).not.toHaveBeenCalled();
  });
});
