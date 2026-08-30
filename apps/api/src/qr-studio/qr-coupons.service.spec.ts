import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@creatorplus/database';
import { QrCouponsService } from './qr-coupons.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrCoupon: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    qrCouponRedemption: { create: jest.fn() },
  },
  Prisma: { Decimal: class { constructor(public v: number) {} toNumber() { return this.v; } } },
}));

const p = prisma as any;

function coupon(over: any = {}) {
  return {
    id: 'cp1',
    code: 'LAUNCH',
    type: 'PERCENTAGE',
    value: new Prisma.Decimal(50),
    appliesToOffers: [],
    maxRedemptions: null,
    redeemedCount: 0,
    isActive: true,
    startsAt: null,
    expiresAt: null,
    ...over,
  };
}

describe('QrCouponsService', () => {
  const service = new QrCouponsService();
  beforeEach(() => jest.clearAllMocks());

  it('rejects an unknown or inactive coupon', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(null);
    await expect(service.validateForOffer('NOPE', 'SINGLE', 1500)).rejects.toThrow('Invalid coupon');
    p.qrCoupon.findUnique.mockResolvedValue(coupon({ isActive: false }));
    await expect(service.validateForOffer('LAUNCH', 'SINGLE', 1500)).rejects.toThrow('Invalid coupon');
  });

  it('applies a percentage discount and computes the final amount', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(coupon({ type: 'PERCENTAGE', value: new Prisma.Decimal(50) }));
    const res = await service.validateForOffer('LAUNCH', 'SINGLE', 1500);
    expect(res.discount).toBe(750);
    expect(res.finalAmount).toBe(750);
  });

  it('caps a fixed discount at the price (never negative) — enables free grant', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(coupon({ type: 'FIXED', value: new Prisma.Decimal(5000) }));
    const res = await service.validateForOffer('LAUNCH', 'SINGLE', 1500);
    expect(res.discount).toBe(1500);
    expect(res.finalAmount).toBe(0);
  });

  it('rejects a coupon that does not apply to the chosen plan', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(coupon({ appliesToOffers: ['PRO_MONTHLY', 'PRO_YEARLY'] }));
    await expect(service.validateForOffer('LAUNCH', 'SINGLE', 1500)).rejects.toThrow('does not apply');
  });

  it('rejects an expired coupon and one at its redemption limit', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(coupon({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(service.validateForOffer('LAUNCH', 'SINGLE', 1500)).rejects.toThrow('expired');
    p.qrCoupon.findUnique.mockResolvedValue(coupon({ maxRedemptions: 5, redeemedCount: 5 }));
    await expect(service.validateForOffer('LAUNCH', 'SINGLE', 1500)).rejects.toThrow('redemption limit');
  });

  it('records a redemption and increments the count', async () => {
    await service.redeem(prisma as any, { couponId: 'cp1', userId: 'u1', paymentId: 'pay1', offerCode: 'SINGLE', discount: 750 });
    expect(p.qrCouponRedemption.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ couponId: 'cp1', userId: 'u1', offerCode: 'SINGLE' }) }),
    );
    expect(p.qrCoupon.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cp1' }, data: { redeemedCount: { increment: 1 } } }),
    );
  });

  it('validates value ranges on create', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(null);
    await expect(service.create('admin', { code: 'X1', type: 'PERCENTAGE', value: 150 } as any)).rejects.toThrow('between 1 and 100');
  });

  it('throws NotFound updating a missing coupon', async () => {
    p.qrCoupon.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { value: 10 } as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
