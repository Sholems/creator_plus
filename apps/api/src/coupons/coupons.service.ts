import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@creatormarket/database';

export interface CouponLineItem {
  productId: string;
  quantity: number;
}

@Injectable()
export class CouponsService {
  private async getCreatorProfile(userId: string) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException('You must be a creator to manage coupons');
    }
    return profile;
  }

  private assertValidValue(type: string, value: number) {
    if (type === 'PERCENTAGE') {
      if (value <= 0 || value > 100) {
        throw new BadRequestException('Percentage coupons must be between 1 and 100');
      }
    } else if (value <= 0) {
      throw new BadRequestException('Fixed coupon value must be greater than 0');
    }
  }

  async create(creatorId: string, data: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minPurchase?: number;
    maxUses?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) {
    const profile = await this.getCreatorProfile(creatorId);

    const code = data.code.trim().toUpperCase();
    this.assertValidValue(data.type, data.value);

    if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const existing = await prisma.coupon.findFirst({
      where: { creatorId: profile.id, code },
    });
    if (existing) {
      throw new BadRequestException('You already have a coupon with this code');
    }

    return prisma.coupon.create({
      data: {
        creatorId: profile.id,
        code,
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase ?? null,
        maxUses: data.maxUses ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
  }

  async findMine(creatorId: string) {
    const profile = await this.getCreatorProfile(creatorId);

    return prisma.coupon.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
  }

  async update(creatorId: string, id: string, data: {
    value?: number;
    minPurchase?: number;
    maxUses?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) {
    const profile = await this.getCreatorProfile(creatorId);

    const coupon = await prisma.coupon.findFirst({
      where: { id, creatorId: profile.id },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const type = data.value !== undefined ? coupon.type : coupon.type;
    if (data.value !== undefined) {
      this.assertValidValue(type, data.value);
    }

    if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    return prisma.coupon.update({
      where: { id },
      data: {
        value: data.value,
        minPurchase: data.minPurchase,
        maxUses: data.maxUses,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isActive: data.isActive,
      },
      include: {
        _count: { select: { redemptions: true } },
      },
    });
  }

  async remove(creatorId: string, id: string) {
    const profile = await this.getCreatorProfile(creatorId);

    const coupon = await prisma.coupon.findFirst({
      where: { id, creatorId: profile.id },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Hard-delete so the code is truly gone and can be reused later. Redemption
    // rows cascade away; each order still carries its own couponCode and
    // discountAmount snapshot, so sales history is unaffected.
    await prisma.coupon.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Validate a coupon code against a set of line items. A coupon only applies
   * to products belonging to its creator; the discount is capped at the
   * eligible subtotal. Throws on invalid/expired/exhausted coupons.
   */
  async validate(code: string, items: CouponLineItem[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('No items to apply the coupon to');
    }

    const coupon = await prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), isActive: true },
    });
    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.endDate && now > coupon.endDate) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, creatorId: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const eligible = items.filter(
      (i) => productMap.get(i.productId)?.creatorId === coupon.creatorId,
    );
    if (eligible.length === 0) {
      throw new BadRequestException('This coupon does not apply to any items in your order');
    }

    const eligibleSubtotal = eligible.reduce(
      (sum, i) => sum + productMap.get(i.productId)!.price.toNumber() * i.quantity,
      0,
    );

    if (coupon.minPurchase !== null && eligibleSubtotal < coupon.minPurchase.toNumber()) {
      throw new BadRequestException(
        `This coupon requires a minimum purchase of ₦${coupon.minPurchase.toNumber().toLocaleString()}`,
      );
    }

    let discount =
      coupon.type === 'PERCENTAGE'
        ? eligibleSubtotal * (coupon.value.toNumber() / 100)
        : coupon.value.toNumber();
    discount = Math.min(discount, eligibleSubtotal);
    discount = Math.round(discount * 100) / 100;

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value.toNumber(),
      },
      eligibleSubtotal,
      discountAmount: discount,
    };
  }

  /**
   * Record a redemption for a paid order. Called by the orders/payments
   * pipeline after an order is created with a valid coupon.
   */
  async redeem(couponId: string, userId: string, orderId: string, amount: number) {
    await prisma.couponRedemption.create({
      data: { couponId, userId, orderId, amount },
    });
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  async findByOrder(orderId: string) {
    return prisma.couponRedemption.findFirst({
      where: { orderId },
      include: { coupon: true },
    });
  }
}
