import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { EmailService } from '../email/email.service';
import { SearchService } from '../search/search.service';
import { RefundsService } from '../refunds/refunds.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { ContactService } from '../contact/contact.service';
import { SupportTicketsService } from '../support-tickets/support-tickets.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { BroadcastDto } from './dto/broadcast.dto';
import { CreateRoleDto, SetUserRolesDto } from './dto/role.dto';

const PAID_STATUSES = ['PAID', 'FULFILLED', 'COMPLETED'] as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly searchService: SearchService,
    private readonly refundsService: RefundsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly contactService: ContactService,
    private readonly supportTicketsService: SupportTicketsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}
  async getStats() {
    const days = 30;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const dayKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const emptyTrend = () => {
      const out: { date: string; value: number }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        out.push({ date: dayKey(d), value: 0 });
      }
      return out;
    };

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingProducts,
      pendingReviews,
      pendingRefunds,
      pendingPayouts,
      pendingAffiliates,
      openFraudFlags,
      pendingVerifications,
      totalCreators,
      activeAffiliates,
      revenueAgg,
      orders30,
      users30,
      recentOrders,
      pendingProductList,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.order.count(),
      prisma.product.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { reported: true } }),
      prisma.refund.count({ where: { status: 'PENDING' } }),
      prisma.payoutRequest.count({ where: { status: 'PENDING' } }),
      prisma.affiliate.count({ where: { status: 'PENDING' } }),
      prisma.affiliateFraudFlag.count({ where: { status: 'OPEN' } }),
      prisma.creatorProfile.count({
        where: { verificationStatus: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'] } },
      }),
      prisma.creatorProfile.count(),
      prisma.affiliate.count({ where: { status: 'ACTIVE' } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: [...PAID_STATUSES] } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { in: [...PAID_STATUSES] } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { email: true, displayName: true } },
          items: { select: { id: true } },
        },
      }),
      prisma.product.findMany({
        where: { status: 'PENDING' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { storeName: true } } },
      }),
    ]);

    const revenueByDay = new Map(emptyTrend().map((t) => [t.date, 0]));
    const orderByDay = new Map(emptyTrend().map((t) => [t.date, 0]));
    const userByDay = new Map(emptyTrend().map((t) => [t.date, 0]));

    for (const o of orders30) {
      const k = dayKey(o.createdAt);
      if (revenueByDay.has(k)) revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + Number(o.totalAmount));
      if (orderByDay.has(k)) orderByDay.set(k, (orderByDay.get(k) ?? 0) + 1);
    }
    for (const u of users30) {
      const k = dayKey(u.createdAt);
      if (userByDay.has(k)) userByDay.set(k, (userByDay.get(k) ?? 0) + 1);
    }
    const sortByDate = (a: { date: string }, b: { date: string }) =>
      a.date.localeCompare(b.date);
    const revenueTrend = [...revenueByDay].map(([date, value]) => ({ date, value })).sort(sortByDate);
    const orderTrend = [...orderByDay].map(([date, value]) => ({ date, value })).sort(sortByDate);
    const userTrend = [...userByDay].map(([date, value]) => ({ date, value })).sort(sortByDate);

    return {
      totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      totalUsers,
      totalProducts,
      totalOrders,
      pendingProducts,
      pendingReviews,
      pendingRefunds,
      pendingPayouts,
      pendingAffiliates,
      openFraudFlags,
      pendingVerifications,
      totalCreators,
      activeAffiliates,
      revenueTrend,
      orderTrend,
      userTrend,
      recentOrders,
      pendingProductList,
    };
  }

  async getUsers(page = 1, perPage = 20, search?: string) {
    const skip = (page - 1) * perPage;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          createdAt: true,
          roles: { select: { role: { select: { name: true } } } },
          creatorProfile: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              verified: true,
              verificationStatus: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((u) => {
      const roleNames = u.roles.map((r) => r.role.name);
      const adminRole = roleNames.find((n) =>
        ['super_admin', 'admin', 'moderator', 'finance', 'support'].includes(n),
      );
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        status: u.status,
        createdAt: u.createdAt,
        role: adminRole ?? (u.creatorProfile ? 'creator' : 'buyer'),
        roles: roleNames,
        creator: u.creatorProfile
          ? {
              id: u.creatorProfile.id,
              storeName: u.creatorProfile.storeName,
              slug: u.creatorProfile.slug,
              verified: u.creatorProfile.verified,
              verificationStatus: u.creatorProfile.verificationStatus,
            }
          : null,
      };
    });

    return { data, pagination: this.paginate(page, perPage, total) };
  }

  async verifyCreator(id: string, adminId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const updated = await prisma.creatorProfile.update({
      where: { id },
      data: {
        verified: true,
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
      },
    });

    void this.notificationsService.create(
      creator.user.id,
      'VERIFICATION_STATUS',
      'You are a verified creator ✅',
      `Your store "${creator.storeName}" has been verified. You'll get a verified badge on your profile.`,
      { creatorId: creator.id },
    );

    void this.emailService.sendCreatorVerified(
      creator.user.email,
      creator.user.displayName || 'there',
      creator.storeName,
    );

    return updated;
  }

  async rejectCreator(id: string, adminId: string, reason?: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');

    const updated = await prisma.creatorProfile.update({
      where: { id },
      data: {
        verified: false,
        verificationStatus: 'REJECTED',
      },
    });

    void this.notificationsService.create(
      creator.user.id,
      'VERIFICATION_STATUS',
      'Verification not approved',
      `Your store "${creator.storeName}" was not approved${reason ? `: ${reason}` : ''}. You can update your store and resubmit.`,
      { creatorId: creator.id },
    );

    void this.emailService.sendCreatorRejected(
      creator.user.email,
      creator.user.displayName || 'there',
      creator.storeName,
      reason,
    );

    return updated;
  }

  async getProducts(status?: string, page = 1, perPage = 20, search?: string) {
    const skip = (page - 1) * perPage;
    // There is no product.status === 'APPROVED' in this flow: approving a
    // product publishes it (PENDING → PUBLISHED). Map the admin "Approved"
    // filter onto PUBLISHED so that tab is never empty/misleading.
    const effectiveStatus = status === 'APPROVED' ? 'PUBLISHED' : status;
    const where: any = effectiveStatus ? { status: effectiveStatus as any } : {};
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { storeName: true, slug: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);
    return { data: products, pagination: this.paginate(page, perPage, total) };
  }

  async getOrders(page = 1, perPage = 20, status?: string, search?: string) {
    const skip = (page - 1) * perPage;
    const where: any = {};
    if (status === 'INCOMPLETE') {
      where.status = 'PENDING';
    } else if (status) {
      where.status = status as any;
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { buyer: { email: { contains: search, mode: 'insensitive' } } },
        { buyer: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { email: true, displayName: true } },
          items: { select: { id: true } },
          payment: { select: { status: true, provider: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return {
      data: orders.map((o) => ({ ...o, incomplete: o.status === 'PENDING' })),
      pagination: this.paginate(page, perPage, total),
    };
  }

  async getOrderDetail(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, email: true, displayName: true } },
        items: {
          include: {
            product: { select: { id: true, title: true, slug: true, thumbnail: true, creatorId: true } },
          },
        },
        payment: true,
        refunds: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { ...order, incomplete: order.status === 'PENDING' };
  }

  async sendOrderReminder(id: string, adminId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, email: true, displayName: true } },
        items: {
          include: {
            product: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Can only send reminders for incomplete orders');
    }

    await this.emailService.sendPaymentReminder(
      order.buyer.email,
      order.buyer.displayName || 'there',
      {
        id: order.id,
        items: order.items.map((i) => ({
          title: i.product?.title || i.productName || 'Product',
          price: i.unitPrice.toNumber(),
        })),
      },
    );

    this.audit(adminId, null, 'order.reminder_send', 'order', order.id, {
      buyerEmail: order.buyer.email,
    });

    return { sent: true };
  }

  async getPayouts(page = 1, perPage = 20, status?: string, search?: string) {
    const skip = (page - 1) * perPage;

    let matchedUserIds: string[] | null = null;
    if (search) {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 50,
      });
      matchedUserIds = users.map((u) => u.id);
    }

    const where: any = {};
    if (status) where.status = status as any;
    if (matchedUserIds) where.userId = { in: matchedUserIds };

    const [payouts, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payoutRequest.count({ where }),
    ]);

    const userIds = [...new Set(payouts.map((p) => p.userId).filter(Boolean))];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, displayName: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = payouts.map((p) => ({ ...p, user: userMap.get(p.userId) || null }));

    return { data, pagination: this.paginate(page, perPage, total) };
  }

  async approvePayout(id: string, adminId: string) {
    const payout = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout request not found');

    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Only pending payouts can be approved');
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    void this.notificationsService.create(
      payout.userId,
      'PAYOUT_COMPLETED',
      'Payout approved',
      `Your payout of ${payout.amount.toNumber()} NGN has been approved and is being processed.`,
      { payoutRequestId: payout.id },
    );

    return updated;
  }

  async rejectPayout(id: string, adminId: string, reason?: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({ where: { id } });
      if (!payout) throw new NotFoundException('Payout request not found');

      if (payout.status !== 'PENDING') {
        throw new BadRequestException('Only pending payouts can be rejected');
      }

      const wallet = await tx.wallet.findUnique({ where: { id: payout.walletId } });
      const amount = payout.amount.toNumber();
      const balanceBefore = wallet ? wallet.availableBalance.toNumber() : 0;

      const result = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedBy: adminId,
          notes: reason ? `${payout.notes ? payout.notes + ' ' : ''}Rejection: ${reason}` : payout.notes,
        },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            reservedBalance: { decrement: amount },
            availableBalance: { increment: amount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'PAYOUT',
            amount,
            balanceBefore,
            balanceAfter: balanceBefore + amount,
            description: 'Payout rejected — refunded',
            referenceType: 'PAYOUT_REQUEST',
            referenceId: payout.id,
          },
        });
      }

      return result;
    });

    void this.notificationsService.create(
      updated.userId,
      'PAYOUT_COMPLETED',
      'Payout rejected',
      `Your payout request for ${updated.amount.toNumber()} NGN was not approved${reason ? ` (${reason})` : ''}.`,
      { payoutRequestId: updated.id },
    );

    return updated;
  }

  async completePayout(id: string, adminId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({ where: { id } });
      if (!payout) throw new NotFoundException('Payout request not found');

      if (!['APPROVED', 'PROCESSING'].includes(payout.status)) {
        throw new BadRequestException('Only approved payouts can be completed');
      }

      const wallet = await tx.wallet.findUnique({ where: { id: payout.walletId } });
      const amount = payout.amount.toNumber();

      const result = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          approvedBy: adminId,
          paidAt: new Date(),
        },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            reservedBalance: { decrement: amount },
            lifetimePayouts: { increment: amount },
          },
        });
      }

      if (payout.creatorId) {
        await tx.commission.updateMany({
          where: { creatorId: payout.creatorId, status: 'PENDING' },
          data: { status: 'PAID' },
        });
      }

      return result;
    });

    const payoutUser = await prisma.user.findUnique({
      where: { id: updated.userId },
      select: { email: true, displayName: true },
    });
    if (payoutUser?.email) {
      void this.emailService.sendPayoutCompleted(
        payoutUser.email,
        payoutUser.displayName || 'there',
        updated.amount.toNumber(),
        updated.method || 'Bank Transfer (NGN)',
      );
    }

    void this.notificationsService.create(
      updated.userId,
      'PAYOUT_COMPLETED',
      'Payout completed 💸',
      `Your payout of ${updated.amount.toNumber()} NGN has been paid out.`,
      { payoutRequestId: updated.id },
    );

    return updated;
  }

  async getReviews(page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;
    const where = { reported: true, deletedAt: null };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { title: true, slug: true } },
          buyer: { select: { email: true, displayName: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    return { data: reviews, pagination: this.paginate(page, perPage, total) };
  }

  async approveProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            userId: true,
            storeName: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { creator: { select: { storeName: true } } },
    });

    try {
      await this.searchService.indexProduct({
        ...updated,
        creator: { storeName: updated.creator?.storeName },
        category: {},
        tags: [],
      });
    } catch {
      // Search indexing is best-effort.
    }

    const user = await prisma.user.findUnique({
      where: { id: product.creator.userId },
      select: { id: true, email: true, displayName: true },
    });
    if (user) {
      void this.emailService.sendProductApproved(
        user.email,
        user.displayName || 'there',
        { title: product.title, slug: product.slug },
      );

      void this.notificationsService.create(
        user.id,
        'PRODUCT_APPROVED',
        'Product approved 🎉',
        `"${product.title}" has been approved and is now live on the market.`,
        { productId: product.id, slug: product.slug },
      );
    }

    return updated;
  }

  async rejectProduct(id: string, reason?: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            userId: true,
            storeName: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    try {
      await this.searchService.removeProduct(id);
    } catch {
      // Search indexing is best-effort.
    }

    const user = await prisma.user.findUnique({
      where: { id: product.creator.userId },
      select: { id: true, email: true, displayName: true },
    });
    if (user) {
      void this.emailService.sendProductRejected(
        user.email,
        user.displayName || 'there',
        { title: product.title, reason },
      );

      void this.notificationsService.create(
        user.id,
        'PRODUCT_REJECTED',
        'Product not approved',
        `"${product.title}" was not approved${reason ? `: ${reason}` : ''}. You can edit and resubmit.`,
        { productId: product.id },
      );
    }

    return updated;
  }

  async hideReview(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Change a product's status from the admin panel (unpublish, archive,
   * re-publish, …). Publishing re-indexes it for search; anything else removes
   * it from the public index. Approval emails are sent by approveProduct/
   * rejectProduct only — a plain status change does not spam the creator.
   */
  async setProductStatus(id: string, status: string) {
    const allowed: string[] = ['PUBLISHED', 'DRAFT', 'ARCHIVED', 'PENDING', 'REJECTED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid product status: ${status}`);
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: status as any,
        publishedAt:
          status === 'PUBLISHED' ? product.publishedAt || new Date() : product.publishedAt,
      },
    });

    try {
      if (status === 'PUBLISHED') {
        await this.searchService.indexProduct(id);
      } else {
        await this.searchService.removeProduct(id);
      }
    } catch {
      // Search indexing is best-effort.
    }

    return updated;
  }

  /** Feature/unfeature a product so it appears in the curated homepage sections. */
  async setProductFeatured(id: string, featured: boolean) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return prisma.product.update({
      where: { id },
      data: { isFeatured: featured },
    });
  }

  /** Toggle a product for the hero stall card on the homepage. */
  async setProductHero(id: string, hero: boolean) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return prisma.product.update({
      where: { id },
      data: { isHeroProduct: hero },
    });
  }

  /** Toggle a product as an admin-curated affiliate pick for the homepage. */
  async setProductAffiliatePick(id: string, pick: boolean) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    return prisma.product.update({
      where: { id },
      data: { isAffiliatePick: pick },
    });
  }

  async getRefunds(page = 1, perPage = 20, status?: string) {
    return this.refundsService.findAll(page, perPage, status);
  }

  async approveRefund(id: string, adminId: string) {
    return this.refundsService.approve(id, adminId);
  }

  async rejectRefund(id: string, adminId: string) {
    return this.refundsService.reject(id, adminId);
  }

  async restoreReview(id: string) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return prisma.review.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  // ------------------------------------------------------------------
  // Platform settings (persisted via SettingsService)
  // ------------------------------------------------------------------

  async getPlatformSettings() {
    return this.settingsService.getPlatformSettings();
  }

  async updatePlatformSettings(adminId: string, dto: any) {
    const before = await this.settingsService.getPlatformSettings();
    const updated = await this.settingsService.updatePlatformSettings(dto);
    this.audit(adminId, null, 'platform_settings.update', 'system', null, updated as any, before as any);
    return updated;
  }

  // ------------------------------------------------------------------
  // Admin broadcasts
  // ------------------------------------------------------------------

  private async resolveRecipients(dto: BroadcastDto) {
    const where: any = { deletedAt: null };
    if (dto.audience === 'role') {
      if (!dto.role) throw new BadRequestException('A role is required when broadcasting to a role');
      where.roles = { some: { role: { name: dto.role } } };
    } else if (dto.audience === 'users') {
      const ids = (dto.userIds || []).filter(Boolean);
      if (ids.length === 0) throw new BadRequestException('At least one user is required');
      where.id = { in: ids };
    }
    return prisma.user.findMany({ where, select: { id: true, email: true, displayName: true } });
  }

  async broadcastPreview(dto: BroadcastDto) {
    const users = await this.resolveRecipients(dto);
    return { count: users.length };
  }

  async broadcast(adminId: string, dto: BroadcastDto) {
    const users = await this.resolveRecipients(dto);
    if (users.length === 0) throw new BadRequestException('No recipients match this audience');

    const now = new Date();
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: 'SYSTEM',
        title: dto.title,
        message: dto.message,
        data: { broadcast: true, sentBy: adminId, sentAt: now.toISOString() },
      })),
    });

    if (dto.sendEmail) {
      for (const u of users) {
        void this.emailService.sendBroadcast(u.email, u.displayName || 'there', dto.title, dto.message);
      }
    }

    this.audit(adminId, null, 'broadcast.send', 'notification', null, {
      audience: dto.audience,
      role: dto.role,
      userIds: dto.userIds,
      sendEmail: dto.sendEmail,
      recipients: users.length,
      title: dto.title,
    });

    return { count: users.length, sentAt: now };
  }

  // ------------------------------------------------------------------
  // Contact inbox
  // ------------------------------------------------------------------

  getContacts(page: number, perPage: number, status?: string) {
    return this.contactService.findAll(page, perPage, status);
  }

  getContact(id: string) {
    return this.contactService.findOne(id);
  }

  async setContactStatus(adminId: string, id: string, status: 'NEW' | 'READ' | 'ARCHIVED') {
    const updated = await this.contactService.setStatus(id, { status });
    this.audit(adminId, null, 'contact.status_update', 'contact', id, { status });
    return updated;
  }

  // ------------------------------------------------------------------
  // Support tickets
  // ------------------------------------------------------------------

  getAllTickets(query: {
    page?: number;
    perPage?: number;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }) {
    return this.supportTicketsService.findAll(query);
  }

  getTicket(id: string) {
    return this.supportTicketsService.findOne(id);
  }

  async setTicketStatus(adminId: string, id: string, status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
    const updated = await this.supportTicketsService.setStatus(id, status);
    this.audit(adminId, null, 'support_ticket.status_update', 'support_ticket', id, { status });
    return updated;
  }

  async setTicketPriority(adminId: string, id: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') {
    const updated = await this.supportTicketsService.setPriority(id, priority);
    this.audit(adminId, null, 'support_ticket.priority_update', 'support_ticket', id, { priority });
    return updated;
  }

  async assignTicket(adminId: string, id: string, assignedTo?: string) {
    const updated = await this.supportTicketsService.assign(id, { assignedTo });
    this.audit(adminId, null, 'support_ticket.assign', 'support_ticket', id, { assignedTo: assignedTo ?? null });
    return updated;
  }

  async replyToTicket(adminId: string, id: string, message: string) {
    const updated = await this.supportTicketsService.replyFromAdmin(adminId, id, message);
    this.audit(adminId, null, 'support_ticket.reply', 'support_ticket', id, { message });
    return updated;
  }

  // ------------------------------------------------------------------
  // Roles & permissions
  // ------------------------------------------------------------------

  async getRoles() {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { select: { id: true, name: true, resource: true, action: true } },
        _count: { select: { users: true } },
      },
    });
    return {
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions.map((p) => ({ id: p.id, name: p.name, resource: p.resource, action: p.action })),
        memberCount: r._count.users,
      })),
    };
  }

  async getPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    return { data: permissions };
  }

  async createRole(adminId: string, dto: CreateRoleDto) {
    const existing = await prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new BadRequestException(`Role "${dto.name}" already exists`);

    const permissionNames = dto.permissions || [];
    const permissions = permissionNames.length
      ? await prisma.permission.findMany({ where: { name: { in: permissionNames } } })
      : [];
    if (permissions.length !== permissionNames.length) {
      throw new BadRequestException('One or more permission names are invalid');
    }

    const role = await prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        permissions: { connect: permissions.map((p) => ({ id: p.id })) },
      },
      include: { permissions: { select: { id: true, name: true } }, _count: { select: { users: true } } },
    });
    this.audit(adminId, null, 'role.create', 'role', role.id, { name: role.name, permissions: permissionNames });
    return role;
  }

  async setUserRoles(adminId: string, userId: string, dto: SetUserRolesDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const roles = await prisma.role.findMany({ where: { name: { in: dto.roles } } });
    if (roles.length !== dto.roles.length) {
      throw new BadRequestException('One or more role names are invalid');
    }

    const before = await prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });
    const beforeNames = before.map((ur) => ur.role.name);
    const nextNames = dto.roles;

    // Never demote the last super_admin — that would lock the platform out.
    if (beforeNames.includes('super_admin') && !nextNames.includes('super_admin')) {
      const superAdmins = await prisma.userRole.count({
        where: { role: { name: 'super_admin' } },
      });
      if (superAdmins <= 1) {
        throw new ForbiddenException('Cannot remove the last super_admin role');
      }
    }
    // Prevent an admin from removing their own super_admin role (self-lockout).
    if (userId === adminId && beforeNames.includes('super_admin') && !nextNames.includes('super_admin')) {
      throw new ForbiddenException('You cannot remove your own super_admin role');
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      prisma.userRole.createMany({
        data: roles.map((r) => ({ userId, roleId: r.id })),
      }),
    ]);

    this.audit(adminId, user.email, 'user.roles_update', 'user', user.id, { roles: nextNames }, { roles: beforeNames });
    return { roles: nextNames };
  }

  // ------------------------------------------------------------------
  // Feature flags
  // ------------------------------------------------------------------

  getFeatureFlags() {
    return this.featureFlagsService.findAll();
  }

  createFeatureFlag(adminId: string, dto: any) {
    this.audit(adminId, null, 'feature_flag.create', 'feature_flag', null, { name: dto.name });
    return this.featureFlagsService.create(dto);
  }

  updateFeatureFlag(adminId: string, id: string, dto: any) {
    this.audit(adminId, null, 'feature_flag.update', 'feature_flag', id, dto as any);
    return this.featureFlagsService.update(id, dto);
  }

  removeFeatureFlag(adminId: string, id: string) {
    this.audit(adminId, null, 'feature_flag.delete', 'feature_flag', id, null);
    return this.featureFlagsService.remove(id);
  }

  // ------------------------------------------------------------------
  // QR Studio support
  // ------------------------------------------------------------------

  async getQrCampaigns(page = 1, perPage = 20, status?: string, search?: string) {
    const skip = (page - 1) * perPage;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { publicCode: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      prisma.qrCampaign.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, email: true, displayName: true } },
          entitlement: { select: { offerCode: true, status: true, expiresAt: true } },
          _count: { select: { assets: true, events: true } },
        },
      }),
      prisma.qrCampaign.count({ where }),
    ]);

    return {
      data: campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        publicCode: campaign.publicCode,
        contentType: campaign.contentType,
        status: campaign.status,
        scanMode: campaign.scanMode,
        owner: campaign.owner,
        entitlement: campaign.entitlement,
        assetsCount: campaign._count.assets,
        eventsCount: campaign._count.events,
        createdAt: campaign.createdAt,
        expiresAt: campaign.expiresAt,
      })),
      pagination: this.paginate(page, perPage, total),
    };
  }

  async getQrCampaignDetail(id: string) {
    const campaign = await prisma.qrCampaign.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, displayName: true } },
        entitlement: { select: { offerCode: true, status: true, startsAt: true, expiresAt: true } },
        assets: {
          select: {
            id: true,
            kind: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            safetyStatus: true,
            safetyReason: true,
            active: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        events: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            kind: true,
            referrerOrigin: true,
            userAgentFamily: true,
            deviceClass: true,
            country: true,
            createdAt: true,
          },
        },
        adminActions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            reasonCode: true,
            reason: true,
            createdAt: true,
            actor: { select: { email: true } },
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('QR campaign not found');

    return {
      ...campaign,
      destinationUrl: campaign.destinationUrl,
      assets: campaign.assets,
    };
  }

  async pauseOrArchiveQrCampaign(
    adminId: string,
    id: string,
    input: { reasonCode?: string; reason?: string; archive?: boolean },
  ) {
    const campaign = await prisma.qrCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('QR campaign not found');
    const nextStatus = input.archive ? 'ARCHIVED' : 'PAUSED';
    const reasonCode = input.reasonCode?.trim() || 'SUPPORT_ACTION';

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.qrCampaign.update({
        where: { id },
        data: {
          status: nextStatus,
          archivedAt: nextStatus === 'ARCHIVED' ? new Date() : campaign.archivedAt,
        },
      });
      await tx.qrAdminAction.create({
        data: {
          campaignId: id,
          actorId: adminId,
          action: nextStatus === 'ARCHIVED' ? 'archive' : 'pause',
          reasonCode,
          reason: input.reason?.trim() || null,
          previousState: { status: campaign.status },
          newState: { status: updatedCampaign.status },
        },
      });
      return updatedCampaign;
    });

    this.audit(adminId, null, `qr_campaign.${nextStatus.toLowerCase()}`, 'qr_campaign', id, {
      reasonCode,
      status: nextStatus,
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

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

  private paginate(page: number, perPage: number, total: number) {
    return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
  }
}
