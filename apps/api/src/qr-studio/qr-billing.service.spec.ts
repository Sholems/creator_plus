import { ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { QrBillingService } from './qr-billing.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrPayment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  },
  Prisma: { Decimal: class { constructor(public v: number) {} toNumber() { return this.v; } } },
}));

const p = prisma as unknown as {
  qrPayment: { create: jest.Mock; update: jest.Mock; findFirst: jest.Mock };
};

function makeService(provider: any) {
  const factory = { get: jest.fn().mockReturnValue(provider) } as any;
  return new QrBillingService(factory);
}

describe('QrBillingService.createCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.QR_STUDIO_ENABLED;
  });

  it('refuses checkout when QR Studio is disabled (R41)', async () => {
    process.env.QR_STUDIO_ENABLED = 'false';
    const service = makeService({ name: 'paystack', createCheckout: jest.fn() });
    await expect(service.createCheckout('u1', 'a@b.com', 'SINGLE')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(p.qrPayment.create).not.toHaveBeenCalled();
  });

  it('creates a QR payment for the offer amount and a QR-purpose Paystack checkout (R2, KTD3)', async () => {
    p.qrPayment.create.mockResolvedValue({ id: 'qrp-1', amount: { toNumber: () => 1500 } });
    p.qrPayment.update.mockResolvedValue({});
    const provider = {
      name: 'paystack',
      createCheckout: jest.fn().mockResolvedValue({
        redirectUrl: 'https://paystack/redir',
        providerReference: 'QR_abc',
        providerPaymentId: 'QR_abc',
      }),
    };
    const service = makeService(provider);

    const res = await service.createCheckout('u1', 'a@b.com', 'SINGLE');

    expect(p.qrPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ offerCode: 'SINGLE', provider: 'paystack' }) }),
    );
    const arg = provider.createCheckout.mock.calls[0][0];
    expect(arg.totalAmount).toBe(1500);
    expect(arg.purpose).toBe('qr_studio');
    expect(arg.referencePrefix).toBe('QR');
    expect(arg.metadata.qrPaymentId).toBe('qrp-1');
    expect(res.url).toBe('https://paystack/redir');
  });

  it('marks the QR payment FAILED and throws when Paystack init fails', async () => {
    p.qrPayment.create.mockResolvedValue({ id: 'qrp-2' });
    p.qrPayment.update.mockResolvedValue({});
    const provider = { name: 'paystack', createCheckout: jest.fn().mockRejectedValue(new Error('boom')) };
    const service = makeService(provider);

    await expect(service.createCheckout('u1', 'a@b.com', 'PACK')).rejects.toThrow('boom');
    expect(p.qrPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'qrp-2' }, data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });
});
