import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, OrderStatus, Prisma } from '@creatormarket/database';
import type { AcquisitionSource } from '@creatormarket/database';
import { Decimal } from '@prisma/client/runtime/library';
import { CouponsService } from '../coupons/coupons.service';
import { AffiliatesService } from '../affiliates/affiliates.service';
import { classifyAcquisition } from '../affiliates/commission-math';
import { paginate, pageMeta } from '../common/pagination';

const VALID_LICENSE_TYPES = ['PERSONAL', 'COMMERCIAL', 'EXTENDED', 'ENTERPRISE'] as const;

export interface OrderAttributionContext {
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
  visitorId?: string;
  utm?: { campaign?: string; source?: string; medium?: string } | null;
  acquisitionSource?: AcquisitionSource;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  async create(
    buyerId: string,
    items: { productId: string; price?: number; quantity: number; licenseType: string }[],
    couponCode?: string,
    affiliateCode?: string,
    context?: OrderAttributionContext,
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        licenseType: true,
        currency: true,
        creatorId: true,
        deletedAt: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product || product.deletedAt) {
        throw new NotFoundException('One or more products could not be found');
      }

      if (product.status !== 'PUBLISHED') {
        throw new BadRequestException(`"${product.title}" is not available for purchase`);
      }

      const licenseType = item.licenseType.toUpperCase();
      if (!VALID_LICENSE_TYPES.includes(licenseType as any)) {
        throw new BadRequestException(`Invalid license type: ${item.licenseType}`);
      }

      const quantity = Math.floor(item.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      // Prices are always taken from the server, never from the client. Money
      // stays in Decimal end-to-end to avoid binary-float rounding error.
      const unitPrice = product.price;

      return {
        productId: product.id,
        productName: product.title,
        unitPrice,
        price: unitPrice,
        quantity,
        licenseType: licenseType as any,
        totalPrice: unitPrice.mul(quantity),
      };
    });

    const totalAmount = orderItems.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Decimal(0),
    );

    // Optional coupon: validate against the freshly priced line items, then
    // reduce the order total by the eligible discount.
    let discountAmount = 0;
    let coupon: { id: string; code: string; type: string; value: number } | null = null;
    if (couponCode && couponCode.trim()) {
      const result = await this.couponsService.validate(
        couponCode,
        orderItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      );
      discountAmount = result.discountAmount;
      coupon = result.coupon;
    }

    // Apply the discount in Decimal and clamp at zero, rounded to kobo.
    const discounted = totalAmount.sub(discountAmount);
    const finalTotal = (discounted.isNegative() ? new Decimal(0) : discounted).toDecimalPlaces(2);

    // Where the buyer came from — analytics only, never changes the money
    // split. An affiliate link wins; otherwise a platform campaign (utm)
    // is recorded; otherwise the source is UNKNOWN (or caller-declared).
    const acquisitionSource = classifyAcquisition({
      attributed: !!affiliateCode,
      utmCampaign: context?.utm?.campaign ?? null,
      utmSource: context?.utm?.source ?? null,
      utmMedium: context?.utm?.medium ?? null,
      explicit: context?.acquisitionSource ?? null,
    });

    const order = await prisma.order.create({
      data: {
        buyerId,
        totalAmount: finalTotal,
        currency: 'NGN',
        status: 'PENDING',
        acquisitionSource,
        invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (coupon && discountAmount > 0) {
      await this.couponsService.redeem(coupon.id, buyerId, order.id, discountAmount);
    }

    // Affiliate attribution (last-click): record which affiliate's link the buyer
    // came through. Never fails the order — attribution problems are swallowed.
    if (affiliateCode) {
      await this.affiliatesService.attributeOrder(
        { id: order.id, buyerId, items: order.items.map((i) => ({ productId: i.productId })) },
        affiliateCode,
        context,
      );
    }

    return {
      ...order,
      coupon: coupon ? { ...coupon, discountAmount } : null,
    };
  }

  async findAll(filters?: { buyerId?: string; creatorId?: string; page?: number; perPage?: number }) {
    const { page, perPage, skip, take } = paginate(filters?.page, filters?.perPage);

    const where: Prisma.OrderWhereInput = {};

    if (filters?.buyerId) {
      where.buyerId = filters.buyerId;
    }

    if (filters?.creatorId) {
      where.items = {
        some: {
          product: {
            creatorId: filters.creatorId,
          },
        },
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
          payment: true,
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      pagination: pageMeta(page, perPage, total),
    };
  }

  async findById(id: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        payment: true,
        refunds: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && order.buyerId !== userId) {
      throw new ForbiddenException('Not authorized to view this order');
    }

    return order;
  }

  async findByBuyer(buyerId: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { buyerId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  thumbnail: true,
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where: { buyerId } }),
    ]);

    return {
      data: orders,
      pagination: pageMeta(page, perPage, total),
    };
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
  }

  async cancel(id: string, buyerId: string) {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Not authorized to cancel this order');
    }

    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new ForbiddenException('Cannot cancel order in current status');
    }

    return prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
