import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma, QrOfferCode } from '@creatorplus/database';
import { CreateQrCouponDto, UpdateQrCouponDto } from './dto/qr-coupon.dto';

export interface QrCouponApplication {
  couponId: string;
  code: string;
  discount: number;
  finalAmount: number;
}

@Injectable()
export class QrCouponsService {
  // ─── Admin management ─────────────────────────────────────────────────────

  async create(adminId: string, dto: CreateQrCouponDto) {
    const code = dto.code.trim().toUpperCase();
    if (dto.type === 'PERCENTAGE' && (dto.value <= 0 || dto.value > 100)) {
      throw new BadRequestException('Percentage coupons must be between 1 and 100');
    }
    if (dto.type === 'FIXED' && dto.value <= 0) {
      throw new BadRequestException('Fixed coupon value must be greater than 0');
    }
    const existing = await prisma.qrCoupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('A QR coupon with this code already exists');

    return prisma.qrCoupon.create({
      data: {
        code,
        type: dto.type,
        value: new Prisma.Decimal(dto.value),
        appliesToOffers: (dto.appliesToOffers ?? []) as QrOfferCode[],
        maxRedemptions: dto.maxRedemptions ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: adminId,
      },
    });
  }

  async list() {
    return prisma.qrCoupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, dto: UpdateQrCouponDto) {
    const coupon = await prisma.qrCoupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('QR coupon not found');
    if (dto.value !== undefined) {
      if (coupon.type === 'PERCENTAGE' && (dto.value <= 0 || dto.value > 100)) {
        throw new BadRequestException('Percentage coupons must be between 1 and 100');
      }
      if (coupon.type === 'FIXED' && dto.value <= 0) {
        throw new BadRequestException('Fixed coupon value must be greater than 0');
      }
    }
    return prisma.qrCoupon.update({
      where: { id },
      data: {
        value: dto.value !== undefined ? new Prisma.Decimal(dto.value) : undefined,
        appliesToOffers: dto.appliesToOffers as QrOfferCode[] | undefined,
        maxRedemptions: dto.maxRedemptions,
        isActive: dto.isActive,
        startsAt: dto.startsAt === undefined ? undefined : dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt === undefined ? undefined : dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async deactivate(id: string) {
    const coupon = await prisma.qrCoupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('QR coupon not found');
    return prisma.qrCoupon.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Checkout use ─────────────────────────────────────────────────────────

  /** Validate a coupon against an offer and price, returning the discount and
   *  final chargeable amount. Throws on invalid/expired/inapplicable coupons. */
  async validateForOffer(code: string, offerCode: QrOfferCode, amount: number): Promise<QrCouponApplication> {
    const coupon = await prisma.qrCoupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon code');

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) throw new BadRequestException('This coupon is not active yet');
    if (coupon.expiresAt && now > coupon.expiresAt) throw new BadRequestException('This coupon has expired');
    if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
      throw new BadRequestException('This coupon has reached its redemption limit');
    }
    if (coupon.appliesToOffers.length > 0 && !coupon.appliesToOffers.includes(offerCode)) {
      throw new BadRequestException('This coupon does not apply to the selected plan');
    }

    const value = coupon.value.toNumber();
    let discount = coupon.type === 'PERCENTAGE' ? amount * (value / 100) : value;
    discount = Math.min(discount, amount);
    discount = Math.round(discount * 100) / 100;
    const finalAmount = Math.round((amount - discount) * 100) / 100;

    return { couponId: coupon.id, code: coupon.code, discount, finalAmount };
  }

  /** Record a redemption and atomically consume a redemption slot. Safe to call
   *  inside a transaction (pass tx) at fulfillment or free-grant time. */
  async redeem(
    client: Prisma.TransactionClient | typeof prisma,
    input: { couponId: string; userId: string; paymentId?: string | null; offerCode: QrOfferCode; discount: number },
  ) {
    await client.qrCouponRedemption.create({
      data: {
        couponId: input.couponId,
        userId: input.userId,
        paymentId: input.paymentId ?? null,
        offerCode: input.offerCode,
        discount: new Prisma.Decimal(input.discount),
      },
    });
    await client.qrCoupon.update({
      where: { id: input.couponId },
      data: { redeemedCount: { increment: 1 } },
    });
  }
}
