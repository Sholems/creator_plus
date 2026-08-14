import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, Prisma, AffiliateStatus } from '@creatormarket/database';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionService } from './commission.service';
import { DEFAULT_AFFILIATE_COMMISSION_RATE } from './commission-calculator';
import { paginate, pageMeta } from '../common/pagination';
import { webBaseUrl } from '../common/urls';

const webBase = () => webBaseUrl();

interface AttributionContext {
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
}

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly commissionService: CommissionService,
  ) {}

  // ------------------------------------------------------------------
  // Application
  // ------------------------------------------------------------------

  async apply(userId: string, dto: any) {
    const existing = await prisma.affiliate.findUnique({ where: { userId } });
    if (existing?.status === 'ACTIVE') {
      throw new BadRequestException('You are already an active affiliate');
    }
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('Your application is already under review');
    }
    if (existing?.status === 'SUSPENDED' || existing?.status === 'BANNED') {
      throw new ForbiddenException('Your affiliate account is not active');
    }

    const code = await this.generateUniqueCode(dto.code);
    const affiliate = await prisma.affiliate.upsert({
      where: { userId },
      update: {
        status: 'PENDING',
        code,
        applicationMessage: dto.applicationMessage ?? null,
        promotionChannels: dto.promotionChannels ?? [],
        websiteUrl: dto.websiteUrl ?? null,
        socialMediaLinks: dto.socialMediaLinks ?? null,
        country: dto.country ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        paymentDetails: dto.paymentDetails ?? null,
        rejectedAt: null,
        rejectionReason: null,
      },
      create: {
        userId,
        code,
        status: 'PENDING',
        applicationMessage: dto.applicationMessage ?? null,
        promotionChannels: dto.promotionChannels ?? [],
        websiteUrl: dto.websiteUrl ?? null,
        socialMediaLinks: dto.socialMediaLinks ?? null,
        country: dto.country ?? null,
        paymentMethod: dto.paymentMethod ?? null,
        paymentDetails: dto.paymentDetails ?? null,
      },
    });

    void this.notificationsService.create(
      userId,
      'AFFILIATE_APPLICATION',
      'Application received',
      'Your affiliate application has been submitted for review. We will notify you once it is approved.',
    );

    return affiliate;
  }

  async updateProfile(userId: string, dto: {
    applicationMessage?: string;
    promotionChannels?: string[];
    websiteUrl?: string;
    socialMediaLinks?: string[];
    country?: string;
    paymentMethod?: string;
    paymentDetails?: string;
    code?: string;
  }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) {
      throw new NotFoundException('No affiliate application found — apply first');
    }

    const data: Prisma.AffiliateUpdateInput = {};
    if (dto.applicationMessage !== undefined) data.applicationMessage = dto.applicationMessage;
    if (dto.promotionChannels !== undefined) data.promotionChannels = dto.promotionChannels;
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl;
    if (dto.socialMediaLinks !== undefined) data.socialMediaLinks = dto.socialMediaLinks;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.paymentMethod !== undefined) data.paymentMethod = dto.paymentMethod;
    if (dto.paymentDetails !== undefined) data.paymentDetails = dto.paymentDetails;
    if (dto.code && dto.code !== affiliate.code) {
      data.code = await this.generateUniqueCode(dto.code);
    }

    // A rejected affiliate who updates their details is re-submitted for review.
    // Active / pending / suspended accounts keep their status — a settings tweak
    // must never silently disable an approved affiliate's links.
    if (affiliate.status === 'REJECTED') {
      data.status = 'PENDING';
      data.rejectedAt = null;
      data.rejectionReason = null;
    }

    return prisma.affiliate.update({ where: { userId }, data });
  }

  async getMyAffiliate(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        links: {
          include: { product: { select: { id: true, title: true, slug: true, thumbnail: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!affiliate) {
      throw new NotFoundException('No affiliate application found — apply first');
    }
    return { ...affiliate, settings: await this.commissionService.getSettings() };
  }

  async dashboard(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) {
      throw new NotFoundException('No affiliate application found — apply first');
    }

    await this.commissionService.releaseDueConversions(affiliate.id);

    const [clicks, conversions, payouts, links] = await Promise.all([
      prisma.affiliateClick.count({ where: { affiliateId: affiliate.id } }),
      prisma.affiliateConversion.findMany({
        where: { affiliateId: affiliate.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          link: { select: { id: true, code: true } },
          order: {
            select: {
              id: true,
              invoiceNumber: true,
              createdAt: true,
              items: { include: { product: { select: { id: true, title: true, slug: true, thumbnail: true } } } },
            },
          },
        },
      }),
      prisma.affiliatePayout.findMany({
        where: { affiliateId: affiliate.id },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      }),
      prisma.affiliateLink.findMany({
        where: { affiliateId: affiliate.id },
        include: { product: { select: { id: true, title: true, slug: true, thumbnail: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totals = await prisma.affiliateConversion.aggregate({
      where: { affiliateId: affiliate.id, status: { not: 'REVERSED' } },
      _sum: { amount: true, orderAmount: true },
    });
    const byStatus = await prisma.affiliateConversion.groupBy({
      by: ['status'],
      where: { affiliateId: affiliate.id },
      _sum: { amount: true },
      _count: true,
    });

    return {
      affiliate: { ...affiliate, clicks, totalEarnings: totals._sum.amount ?? 0 },
      totals: {
        clicks,
        grossSales: totals._sum.orderAmount ?? 0,
        totalEarnings: totals._sum.amount ?? 0,
        conversions: conversions.length,
        byStatus: Object.fromEntries(
          byStatus.map((s) => [s.status, { count: s._count, amount: s._sum.amount ?? 0 }]),
        ),
      },
      conversions,
      payouts,
      links,
    };
  }

  // ------------------------------------------------------------------
  // Links
  // ------------------------------------------------------------------

  async getLinks(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found');
    return prisma.affiliateLink.findMany({
      where: { affiliateId: affiliate.id },
      include: {
        product: { select: { id: true, title: true, slug: true, thumbnail: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLink(userId: string, dto: { productId: string; code?: string }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      throw new ForbiddenException('Your affiliate account must be approved to create links');
    }

    const product = await prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    if (!product.affiliateEnabled || product.affiliateStatus !== 'APPROVED') {
      throw new BadRequestException('This product is not open for affiliate promotion');
    }

    const code = await this.generateUniqueCode(dto.code, 'link');
    return prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        productId: product.id,
        code,
        url: `${webBase()}/go/${code}`,
        destinationUrl: `${webBase()}/products/${product.slug}`,
        status: 'ACTIVE',
      },
    });
  }

  async updateLink(userId: string, id: string, dto: { code?: string; status?: boolean }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found');

    const link = await prisma.affiliateLink.findFirst({
      where: { id, affiliateId: affiliate.id },
    });
    if (!link) throw new NotFoundException('Link not found');

    const code = dto.code && dto.code !== link.code ? await this.generateUniqueCode(dto.code, 'link') : undefined;
    return prisma.affiliateLink.update({
      where: { id },
      data: {
        ...(code ? { code, url: `${webBase()}/go/${code}` } : {}),
        ...(dto.status !== undefined ? { status: dto.status ? 'ACTIVE' : 'DISABLED' } : {}),
      },
    });
  }

  // ------------------------------------------------------------------
  // Click tracking + attribution
  // ------------------------------------------------------------------

  /**
   * Public click endpoint. Validates the link, records the click, refreshes the
   * (visitor, product) attribution (last-click wins) and returns the redirect
   * target plus cookie metadata so the caller can set the referrer cookie.
   */
  async trackClick(code: string, context: AttributionContext & { visitorId?: string }) {
    const link = await prisma.affiliateLink.findUnique({
      where: { code },
      include: { affiliate: true, product: true },
    });

    if (!link || link.status !== 'ACTIVE' || link.affiliate.status !== 'ACTIVE') {
      throw new NotFoundException('Invalid or disabled affiliate link');
    }
    const product = link.product;
    if (
      !product ||
      product.deletedAt ||
      product.status !== 'PUBLISHED' ||
      !product.affiliateEnabled ||
      product.affiliateStatus !== 'APPROVED'
    ) {
      throw new NotFoundException('This product is no longer available for affiliate promotion');
    }

    const settings = await this.commissionService.getSettings();
    const visitorId = context.visitorId || uuidv4();
    const expiresAt = new Date(Date.now() + settings.cookieDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Last-click attribution: a fresh click on (visitor, product) supersedes
    // any earlier one, resetting the conversion window.
    const existing = await prisma.affiliateAttribution.findUnique({
      where: { visitorId_productId: { visitorId, productId: product.id } },
    });
    if (existing) {
      await prisma.affiliateAttribution.update({
        where: { id: existing.id },
        data: {
          affiliateId: link.affiliateId,
          linkId: link.id,
          clickedAt: now,
          expiresAt,
          sessionId: context.sessionId ?? null,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          convertedAt: null,
          orderId: null,
        },
      });
    } else {
      await prisma.affiliateAttribution.create({
        data: {
          affiliateId: link.affiliateId,
          linkId: link.id,
          productId: product.id,
          visitorId,
          sessionId: context.sessionId ?? null,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          clickedAt: now,
          expiresAt,
        },
      });
    }

    await prisma.affiliateClick.create({
      data: {
        affiliateId: link.affiliateId,
        linkId: link.id,
        productId: product.id,
        visitorId,
        sessionId: context.sessionId ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        referer: context.referer ?? null,
        landingUrl: `${webBase()}/products/${product.slug}`,
      },
    });

    await prisma.affiliateLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });
    await prisma.affiliate.update({
      where: { id: link.affiliateId },
      data: { totalClicks: { increment: 1 } },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { affiliateClickCount: { increment: 1 } },
    });

    return {
      url: `${webBase()}/products/${product.slug}`,
      productSlug: product.slug,
      visitorId,
      cookieDays: settings.cookieDays,
    };
  }

  /**
   * Attribute an order to the affiliate whose link cookie is present, at the
   * moment the order is created. Fails softly: attribution problems must never
   * block a checkout. The affiliate is only credited for items whose product is
   * exactly the promoted one, and never for the affiliate's own purchases.
   */
  async attributeOrder(
    order: { id: string; buyerId: string; items: { productId: string }[] },
    affiliateCode?: string | null,
    context?: AttributionContext & { visitorId?: string },
  ) {
    if (!affiliateCode) return null;

    try {
      const link = await prisma.affiliateLink.findUnique({
        where: { code: affiliateCode },
        include: { affiliate: true },
      });
      if (!link || link.status !== 'ACTIVE' || link.affiliate.status !== 'ACTIVE') {
        return null;
      }
      if (link.affiliate.userId === order.buyerId) {
        await prisma.affiliateFraudFlag.create({
          data: {
            affiliateId: link.affiliateId,
            orderId: order.id,
            type: 'SELF_REFERRAL',
            reason: 'Affiliate purchased through their own link',
          },
        });
        return null;
      }

      const product = await prisma.product.findUnique({
        where: { id: link.productId },
        select: { id: true, affiliateEnabled: true, affiliateStatus: true, status: true, deletedAt: true },
      });
      if (
        !product ||
        product.deletedAt ||
        product.status !== 'PUBLISHED' ||
        !product.affiliateEnabled ||
        product.affiliateStatus !== 'APPROVED'
      ) {
        return null;
      }

      const item = order.items.find((i) => i.productId === product.id);
      if (!item) return null;

      const visitorId = context?.visitorId ?? null;
      const now = new Date();
      const settings = await this.commissionService.getSettings();
      const expiresAt = new Date(Date.now() + settings.cookieDays * 24 * 60 * 60 * 1000);

      if (visitorId) {
        const existing = await prisma.affiliateAttribution.findUnique({
          where: { visitorId_productId: { visitorId, productId: product.id } },
        });
        if (existing) {
          await prisma.affiliateAttribution.update({
            where: { id: existing.id },
            data: {
              affiliateId: link.affiliateId,
              linkId: link.id,
              clickedAt: now,
              expiresAt,
              convertedAt: now,
              orderId: order.id,
              ipAddress: context?.ipAddress ?? null,
              userAgent: context?.userAgent ?? null,
            },
          });
        } else {
          await prisma.affiliateAttribution.create({
            data: {
              affiliateId: link.affiliateId,
              linkId: link.id,
              productId: product.id,
              visitorId,
              sessionId: context?.sessionId ?? null,
              ipAddress: context?.ipAddress ?? null,
              userAgent: context?.userAgent ?? null,
              clickedAt: now,
              expiresAt,
              convertedAt: now,
              orderId: order.id,
            },
          });
        }
      } else {
        await prisma.affiliateAttribution.create({
          data: {
            affiliateId: link.affiliateId,
            linkId: link.id,
            productId: product.id,
            visitorId: null,
            clickedAt: now,
            expiresAt,
            convertedAt: now,
            orderId: order.id,
          },
        });
      }

      return { affiliateId: link.affiliateId, linkId: link.id, productId: product.id };
    } catch (err) {
      this.logger.error(`attributeOrder failed for order ${order.id}: ${err}`);
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Marketplace (public)
  // ------------------------------------------------------------------

  async marketplace(
    query: { sort?: string; category?: string; search?: string; perPage?: number } = {},
  ) {
    const settings = await this.commissionService.getSettings();
    const perPage = Math.min(Math.max(Number(query.perPage) || 60, 1), 120);

    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      affiliateEnabled: true,
      affiliateStatus: 'APPROVED',
      // "Active creator" = profile not deleted; only these products surface to
      // the affiliate marketplace.
      creator: { deletedAt: null },
    };
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
      switch (query.sort) {
        case 'highest_earning':
          return [{ affiliateCommissionRate: 'desc' }, { affiliateClickCount: 'desc' }];
        case 'newest':
          return [{ createdAt: 'desc' }];
        case 'best_selling':
          // Prisma cannot orderBy a filtered `_count`; pre-sort by clicks in the
          // DB and stable-sort by sales count in memory below.
          return [{ affiliateClickCount: 'desc' }];
        case 'editor_picks':
          return [{ isFeatured: 'desc' }, { affiliateClickCount: 'desc' }];
        case 'price_asc':
          return [{ price: 'asc' }];
        case 'price_desc':
          return [{ price: 'desc' }];
        case 'trending':
        default:
          return [{ affiliateClickCount: 'desc' }];
      }
    })();

    const [products, total, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          creator: {
            select: { id: true, storeName: true, slug: true, avatar: true, verified: true },
          },
          category: { select: { id: true, name: true, slug: true } },
          _count: {
            select: { orderItems: { where: { order: { status: 'PAID' } } } },
          },
        },
        orderBy,
        take: perPage,
      }),
      prisma.product.count({ where }),
      prisma.category.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      settings: {
        platformRate: settings.platformRate.toNumber(),
        holdingDays: settings.holdingDays,
        cookieDays: settings.cookieDays,
        minPayout: settings.minPayout.toNumber(),
      },
      products: (query.sort === 'best_selling'
        ? products.sort(
            (a, b) =>
              (b._count?.orderItems ?? 0) - (a._count?.orderItems ?? 0),
          )
        : products
      ).map((p) => ({
        ...p,
        affiliateCommissionRate:
          p.affiliateCommissionRate ?? DEFAULT_AFFILIATE_COMMISSION_RATE,
        salesCount: p._count?.orderItems ?? 0,
      })),
      categories,
      total,
    };
  }

  // ------------------------------------------------------------------
  // Conversions + payouts (affiliate-facing)
  // ------------------------------------------------------------------

  async getConversions(userId: string, pageArg = 1, perPageArg = 20) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found');
    await this.commissionService.releaseDueConversions(affiliate.id);

    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const [data, total] = await Promise.all([
      prisma.affiliateConversion.findMany({
        where: { affiliateId: affiliate.id },
        include: {
          link: { select: { id: true, code: true } },
          order: {
            select: {
              id: true,
              invoiceNumber: true,
              createdAt: true,
              items: { include: { product: { select: { id: true, title: true, slug: true, thumbnail: true } } } },
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliateConversion.count({ where: { affiliateId: affiliate.id } }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async requestPayout(userId: string, dto: { amount?: number; method?: string; notes?: string; bankDetails?: any }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      throw new ForbiddenException('Your affiliate account must be approved to request payouts');
    }
    const settings = await this.commissionService.getSettings();

    // Available commission = what has been released (PAYABLE/APPROVED/PAID),
    // minus any reversal, minus amounts already reserved by a non-rejected
    // payout. Availability is derived from payout items rather than status, so
    // a conversion may be partially paid out across several requests without
    // ever being double-claimed.
    const reserved = await prisma.affiliatePayoutItem.findMany({
      where: {
        conversion: { affiliateId: affiliate.id },
        payout: { status: { notIn: ['REJECTED', 'FAILED'] } },
      },
      select: { conversionId: true, amount: true },
    });
    const reservedByConversion = new Map<string, Prisma.Decimal>();
    for (const r of reserved) {
      reservedByConversion.set(
        r.conversionId,
        (reservedByConversion.get(r.conversionId) ?? new Prisma.Decimal(0)).add(
          r.amount,
        ),
      );
    }

    const candidates = await prisma.affiliateConversion.findMany({
      where: { affiliateId: affiliate.id, status: { in: ['APPROVED', 'PAYABLE', 'PAID'] } },
      orderBy: { releasedAt: 'asc' },
    });

    const available: {
      conversion: (typeof candidates)[number];
      unconsumed: Prisma.Decimal;
    }[] = [];
    let availableTotal = new Prisma.Decimal(0);
    for (const c of candidates) {
      const consumed =
        (reservedByConversion.get(c.id) ?? new Prisma.Decimal(0)).add(
          c.reversalAmount,
        );
      const unconsumed = c.amount.sub(consumed);
      if (unconsumed.greaterThan(0)) {
        available.push({ conversion: c, unconsumed: unconsumed.toDecimalPlaces(2) });
        availableTotal = availableTotal.add(unconsumed);
      }
    }

    if (available.length === 0) {
      throw new BadRequestException('You have no released commissions to pay out yet');
    }

    let amount = dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : availableTotal;
    if (amount.greaterThan(availableTotal)) {
      throw new BadRequestException(`Requested amount exceeds your available balance (₦${availableTotal.toNumber().toLocaleString()})`);
    }
    if (amount.lessThan(settings.minPayout) && amount.lessThan(availableTotal)) {
      throw new BadRequestException(`Minimum payout is ₦${settings.minPayout.toNumber().toLocaleString()}`);
    }

    // Reserve exactly the conversions that cover the requested amount.
    let remaining = amount;
    const included: { conversionId: string; amount: Prisma.Decimal }[] = [];
    for (const a of available) {
      if (remaining.isZero() || remaining.isNegative()) break;
      const takeAmount = remaining.lessThan(a.unconsumed) ? remaining : a.unconsumed;
      included.push({ conversionId: a.conversion.id, amount: takeAmount.toDecimalPlaces(2) });
      remaining = remaining.sub(takeAmount);
    }

    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.affiliatePayout.create({
        data: {
          affiliateId: affiliate.id,
          amount,
          currency: 'NGN',
          status: 'PENDING',
          method: dto.method ?? affiliate.paymentMethod ?? 'Bank Transfer',
          bankDetails: dto.bankDetails ?? affiliate.paymentDetails ?? null,
          notes: dto.notes ?? null,
          items: {
            create: included.map((i) => ({
              conversionId: i.conversionId,
              amount: i.amount,
            })),
          },
        },
      });
      // A conversion is only PAID once every naira is reserved (its payout items
      // plus reversals cover the full amount). Partial reservations leave it
      // available for future requests via the derived availability above.
      for (const i of included) {
        const conversion = candidates.find((c) => c.id === i.conversionId);
        if (!conversion) continue;
        const reservedNow =
          (reservedByConversion.get(i.conversionId) ?? new Prisma.Decimal(0)).add(
            i.amount,
          );
        const totalConsumed = reservedNow.add(conversion.reversalAmount);
        if (totalConsumed.greaterThanOrEqualTo(conversion.amount)) {
          await tx.affiliateConversion.update({
            where: { id: i.conversionId },
            data: { status: 'PAID' },
          });
        }
      }
      return created;
    });

    void this.notificationsService.create(
      userId,
      'AFFILIATE_PAYOUT',
      'Payout requested',
      `Your payout request for ₦${amount.toNumber().toLocaleString()} is pending approval.`,
      { payoutId: payout.id },
    );

    return payout;
  }

  async getPayouts(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate) throw new NotFoundException('No affiliate application found');
    return prisma.affiliatePayout.findMany({
      where: { affiliateId: affiliate.id },
      include: { items: { include: { conversion: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getPromotionalAssets(productId: string) {
    return prisma.affiliatePromotionalAsset.findMany({
      where: { productId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addPromotionalAsset(userId: string, dto: { productId: string; type?: string; title?: string; description?: string; fileUrl?: string }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { userId } });
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      throw new ForbiddenException('Your affiliate account must be approved');
    }
    const product = await prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || !product.affiliateEnabled || product.affiliateStatus !== 'APPROVED') {
      throw new BadRequestException('Product is not open for affiliate promotion');
    }
    return prisma.affiliatePromotionalAsset.create({
      data: {
        productId: dto.productId,
        type: dto.type ?? 'BANNER',
        title: dto.title ?? null,
        description: dto.description ?? null,
        fileUrl: dto.fileUrl ?? null,
        active: true,
      },
    });
  }

  // ------------------------------------------------------------------
  // Admin — affiliates
  // ------------------------------------------------------------------

  async listAffiliates(status?: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where: Prisma.AffiliateWhereInput = status ? { status: status as AffiliateStatus } : {};
    const [data, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, displayName: true, createdAt: true } },
          _count: { select: { links: true, conversions: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliate.count({ where }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async approveAffiliate(id: string, adminId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');
    if (affiliate.status !== 'PENDING' && affiliate.status !== 'REJECTED') {
      throw new BadRequestException('Only pending or rejected applications can be approved');
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: { status: 'ACTIVE', approvedAt: new Date(), approvedBy: adminId, suspendedAt: null, suspensionReason: null },
    });

    this.audit(adminId, affiliate.user.email, 'affiliate.approve', 'affiliate', id, {
      status: 'ACTIVE',
    });
    void this.notificationsService.create(
      affiliate.user.id,
      'AFFILIATE_APPROVED',
      'You are now an affiliate 🎉',
      'Your affiliate application has been approved. Create links for products and start earning commission.',
    );
    return updated;
  }

  async rejectAffiliate(id: string, adminId: string, reason?: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');
    if (affiliate.status !== 'PENDING') {
      throw new BadRequestException('Only pending applications can be rejected');
    }

    const updated = await prisma.affiliate.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason ?? null },
    });

    this.audit(adminId, affiliate.user.email, 'affiliate.reject', 'affiliate', id, { reason });
    void this.notificationsService.create(
      affiliate.user.id,
      'AFFILIATE_REJECTED',
      'Application not approved',
      `Your affiliate application was not approved${reason ? `: ${reason}` : ''}. You can update your details and re-apply.`,
    );
    return updated;
  }

  async suspendAffiliate(id: string, adminId: string, reason: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    const updated = await prisma.affiliate.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date(), suspensionReason: reason },
    });
    await prisma.affiliateLink.updateMany({
      where: { affiliateId: id, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    });

    this.audit(adminId, affiliate.user.email, 'affiliate.suspend', 'affiliate', id, { reason });
    void this.notificationsService.create(
      affiliate.user.id,
      'AFFILIATE_REJECTED',
      'Affiliate account suspended',
      `Your affiliate account has been suspended${reason ? `: ${reason}` : ''}. Contact support if you have questions.`,
    );
    return updated;
  }

  async unsuspendAffiliate(id: string, adminId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    const updated = await prisma.affiliate.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null, suspensionReason: null },
    });
    await prisma.affiliateLink.updateMany({
      where: { affiliateId: id, status: 'SUSPENDED' },
      data: { status: 'ACTIVE' },
    });

    this.audit(adminId, affiliate.user.email, 'affiliate.unsuspend', 'affiliate', id, { status: 'ACTIVE' });
    void this.notificationsService.create(
      affiliate.user.id,
      'AFFILIATE_APPROVED',
      'Affiliate account reactivated',
      'Your affiliate account has been reactivated. You can start earning again.',
    );
    return updated;
  }

  // ------------------------------------------------------------------
  // Admin — product affiliate approvals
  // ------------------------------------------------------------------

  async listAffiliateProducts(status?: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where: Prisma.ProductWhereInput = {
      affiliateStatus: status
        ? (status as any)
        : { not: 'DISABLED' as any },
    };
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          creator: { select: { id: true, storeName: true, slug: true } },
          category: { select: { id: true, name: true } },
          affiliateLinks: {
            select: { _count: { select: { clicks: true } } },
          },
        },
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async approveProductAffiliate(productId: string, adminId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { creator: { select: { userId: true, storeName: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.affiliateStatus !== 'PENDING_REVIEW') {
      throw new BadRequestException('Only products pending affiliate approval can be approved');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        affiliateStatus: 'APPROVED',
        affiliateApprovedAt: new Date(),
        affiliateApprovedBy: adminId,
        affiliateRejectionReason: null,
      },
    });

    this.audit(adminId, null, 'product.affiliate_approve', 'product', productId, { status: 'APPROVED' });
    const rewardRate =
      product.affiliateCommissionRate ?? DEFAULT_AFFILIATE_COMMISSION_RATE;
    void this.notificationsService.create(
      product.creator.userId,
      'PRODUCT_AFFILIATE_APPROVED',
      'Affiliate program approved 🎉',
      `"${product.title}" is now available for affiliates to promote. Affiliates earn ${rewardRate}% of every referred sale.`,
      { productId: product.id },
    );
    return updated;
  }

  async rejectProductAffiliate(productId: string, adminId: string, reason: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { creator: { select: { userId: true, storeName: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.affiliateStatus !== 'PENDING_REVIEW') {
      throw new BadRequestException('Only products pending affiliate approval can be rejected');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { affiliateStatus: 'REJECTED', affiliateRejectionReason: reason },
    });

    this.audit(adminId, null, 'product.affiliate_reject', 'product', productId, { reason });
    void this.notificationsService.create(
      product.creator.userId,
      'PRODUCT_AFFILIATE_REJECTED',
      'Affiliate program not approved',
      `"${product.title}" was not approved for the affiliate program${reason ? `: ${reason}` : ''}. You can edit and re-submit.`,
      { productId: product.id },
    );
    return updated;
  }

  // ------------------------------------------------------------------
  // Admin — conversions, payouts, fraud
  // ------------------------------------------------------------------

  async listConversions(status?: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where: Prisma.AffiliateConversionWhereInput = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      prisma.affiliateConversion.findMany({
        where,
        include: {
          affiliate: { include: { user: { select: { id: true, email: true, displayName: true } } } },
          order: { select: { id: true, invoiceNumber: true } },
          link: { select: { id: true, code: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliateConversion.count({ where }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async listAffiliatePayouts(status?: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where: Prisma.AffiliatePayoutWhereInput = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      prisma.affiliatePayout.findMany({
        where,
        include: {
          affiliate: { include: { user: { select: { id: true, email: true, displayName: true } } } },
          items: true,
        },
        skip,
        take,
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.affiliatePayout.count({ where }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async approveAffiliatePayout(id: string, adminId: string) {
    const payout = await prisma.affiliatePayout.findUnique({
      where: { id },
      include: { affiliate: { include: { user: { select: { id: true, email: true } } } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Only pending payouts can be approved');
    }

    const updated = await prisma.affiliatePayout.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
    });

    this.audit(adminId, payout.affiliate.user.email, 'affiliate_payout.approve', 'affiliate_payout', id, {
      status: 'APPROVED',
    });
    void this.notificationsService.create(
      payout.affiliate.user.id,
      'AFFILIATE_PAYOUT',
      'Payout approved',
      `Your payout of ₦${payout.amount.toNumber().toLocaleString()} has been approved and is being processed.`,
      { payoutId: payout.id },
    );
    return updated;
  }

  async rejectAffiliatePayout(id: string, adminId: string, reason?: string) {
    const payout = await prisma.affiliatePayout.findUnique({
      where: { id },
      include: { affiliate: { include: { user: { select: { id: true, email: true } } } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'PENDING' && payout.status !== 'APPROVED') {
      throw new BadRequestException('Only pending or approved payouts can be rejected');
    }

    const updated = await prisma.affiliatePayout.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason ?? null },
    });
    // Availability is derived from payout items: this payout's items are now
    // excluded from the reserved sum, so the amount becomes requestable again
    // without touching conversion statuses.

    this.audit(adminId, payout.affiliate.user.email, 'affiliate_payout.reject', 'affiliate_payout', id, { reason });
    void this.notificationsService.create(
      payout.affiliate.user.id,
      'AFFILIATE_PAYOUT',
      'Payout not approved',
      `Your payout request for ₦${payout.amount.toNumber().toLocaleString()} was not approved${reason ? ` (${reason})` : ''}.`,
      { payoutId: payout.id },
    );
    return updated;
  }

  async completeAffiliatePayout(id: string, adminId: string) {
    const payout = await prisma.affiliatePayout.findUnique({
      where: { id },
      include: { affiliate: { include: { user: { select: { id: true, email: true } } } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (!['APPROVED', 'PROCESSING'].includes(payout.status)) {
      throw new BadRequestException('Only approved payouts can be completed');
    }

    const updated = await prisma.affiliatePayout.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    this.audit(adminId, payout.affiliate.user.email, 'affiliate_payout.complete', 'affiliate_payout', id, {
      status: 'COMPLETED',
    });
    void this.notificationsService.create(
      payout.affiliate.user.id,
      'AFFILIATE_PAYOUT',
      'Payout completed 💸',
      `Your payout of ₦${payout.amount.toNumber().toLocaleString()} has been paid out.`,
      { payoutId: payout.id },
    );
    return updated;
  }

  // ------------------------------------------------------------------
  // Admin — commission settings
  // ------------------------------------------------------------------

  async getCommissionSettings() {
    return this.commissionService.getSettings();
  }

  async updateCommissionSettings(adminId: string, dto: any) {
    const updates: { key: string; value: any }[] = [];
    if (dto.affiliateRate !== undefined) updates.push({ key: 'affiliate.commission_rate', value: dto.affiliateRate });
    if (dto.platformRate !== undefined) updates.push({ key: 'commission.platform_rate', value: dto.platformRate });
    if (dto.holdingDays !== undefined) updates.push({ key: 'affiliate.holding_days', value: dto.holdingDays });
    if (dto.cookieDays !== undefined) updates.push({ key: 'affiliate.cookie_days', value: dto.cookieDays });
    if (dto.minPayout !== undefined) updates.push({ key: 'affiliate.min_payout', value: dto.minPayout });

    for (const u of updates) {
      await prisma.systemSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value, group: 'commission' },
      });
    }

    this.audit(adminId, null, 'commission_settings.update', 'system', null, Object.fromEntries(updates.map((u) => [u.key, u.value])));
    return this.commissionService.getSettings();
  }

  // ------------------------------------------------------------------
  // Admin — fraud flags
  // ------------------------------------------------------------------

  async listFraudFlags(status?: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where: Prisma.AffiliateFraudFlagWhereInput = status ? { status } : {};
    const [data, total] = await Promise.all([
      prisma.affiliateFraudFlag.findMany({
        where,
        include: {
          affiliate: { include: { user: { select: { id: true, email: true, displayName: true } } } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliateFraudFlag.count({ where }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async resolveFraudFlag(id: string, adminId: string) {
    const flag = await prisma.affiliateFraudFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Fraud flag not found');
    return prisma.affiliateFraudFlag.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedBy: adminId, resolvedAt: new Date() },
    });
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private async generateUniqueCode(base?: string, scope: 'affiliate' | 'link' = 'affiliate') {
    const slugify = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
    const baseCode = slugify(base || 'ref');
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = baseCode && baseCode.length >= 3
        ? `${baseCode}${attempt === 0 ? '' : '-' + Math.random().toString(36).slice(2, 6)}`
        : `ref-${Math.random().toString(36).slice(2, 8)}`;
      const existing =
        scope === 'affiliate'
          ? await prisma.affiliate.findUnique({ where: { code } })
          : await prisma.affiliateLink.findUnique({ where: { code } });
      if (!existing) return code;
    }
    return `${baseCode || 'ref'}-${uuidv4().slice(0, 8)}`;
  }

  private async audit(
    actorId: string | null,
    actorEmail: string | null,
    action: string,
    resource: string,
    resourceId: string | null,
    newState?: Record<string, any> | null,
    previousState?: Record<string, any> | null,
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId,
          actorEmail,
          action,
          resource,
          resourceId,
          ...(newState ? { newState } : {}),
          ...(previousState ? { previousState } : {}),
        },
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed: ${err}`);
    }
  }
}
