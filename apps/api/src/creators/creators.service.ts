import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class CreatorsService {
  constructor(private ordersService: OrdersService) {}
  async apply(userId: string, storeName: string, slug: string) {
    const existing = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('User is already a creator');
    }

    const existingSlug = await prisma.creatorProfile.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException('Store name already taken');
    }

    const creator = await prisma.creatorProfile.create({
      data: {
        userId,
        storeName,
        slug,
        verificationStatus: 'PENDING',
      },
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

    return creator;
  }

  /**
   * Public creators directory: active (not deleted) creator profiles that have
   * at least one published product. Used by the /creators landing page.
   */
  async listActive() {
    const creators = await prisma.creatorProfile.findMany({
      where: {
        deletedAt: null,
        products: { some: { status: 'PUBLISHED', deletedAt: null } },
      },
      select: {
        id: true,
        storeName: true,
        slug: true,
        avatar: true,
        bio: true,
        verified: true,
        verificationStatus: true,
        createdAt: true,
        user: { select: { displayName: true } },
        _count: {
          select: {
            products: { where: { status: 'PUBLISHED', deletedAt: null } },
            followers: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: creators.map((c) => ({
        ...c,
        storeName: c.storeName,
        verified: c.verified,
        followerCount: c._count.followers,
        productCount: c._count.products,
      })),
      total: creators.length,
    };
  }

  async findByUserId(userId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatar: true,
          },
        },
        bankAccounts: {
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    return creator;
  }

  async findBySlug(slug: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        products: {
          where: {
            status: 'PUBLISHED',
            deletedAt: null,
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return creator;
  }

  async updateProfile(userId: string, data: {
    storeName?: string;
    slug?: string;
    bio?: string;
    avatar?: string;
    banner?: string;
    socialLinks?: Record<string, string>;
  }) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== creator.slug) {
      const existingSlug = await prisma.creatorProfile.findUnique({
        where: { slug: data.slug },
      });

      if (existingSlug) {
        throw new ConflictException('Store name already taken');
      }
    }

    return prisma.creatorProfile.update({
      where: { userId },
      data: {
        ...data,
        ...(creator.verificationStatus === 'REJECTED'
          ? {
              verificationStatus: 'PENDING',
              verified: false,
            }
          : {}),
      },
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
  }

  async getStorefront(slug: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        products: {
          where: {
            status: 'PUBLISHED',
            deletedAt: null,
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            products: true,
            followers: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const [salesAgg, reviewsAgg] = await Promise.all([
      prisma.orderItem.aggregate({
        where: {
          product: {
            creatorId: creator.id,
          },
          order: {
            status: { in: ['PAID', 'FULFILLED', 'COMPLETED'] },
          },
        },
        _count: { _all: true },
        _sum: { totalPrice: true },
      }),
      prisma.review.aggregate({
        where: {
          product: {
            creatorId: creator.id,
          },
          deletedAt: null,
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      id: creator.id,
      storeName: creator.storeName,
      slug: creator.slug,
      bio: creator.bio,
      avatar: creator.avatar || creator.user.avatar,
      banner: creator.banner,
      verified: creator.verified,
      socialLinks: creator.socialLinks,
      createdAt: creator.createdAt,
      user: creator.user,
      products: creator.products,
      stats: {
        totalProducts: creator._count.products,
        totalSales: salesAgg._count._all,
        totalRevenue: salesAgg._sum.totalPrice?.toNumber() || 0,
        averageRating: reviewsAgg._avg.rating || 0,
        reviewCount: reviewsAgg._count._all,
        followers: creator._count.followers,
      },
    };
  }

  async verifyCreator(creatorId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    return prisma.creatorProfile.update({
      where: { id: creatorId },
      data: {
        verified: true,
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
      },
    });
  }

  async rejectCreator(creatorId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    return prisma.creatorProfile.update({
      where: { id: creatorId },
      data: {
        verificationStatus: 'REJECTED',
      },
    });
  }

  async getCreatorSales(userId: string, page = 1, perPage = 20) {
    // Delegates to a creator-scoped query that surfaces only this creator's
    // line items per order, the buyer, and a paid revenue/units summary.
    return this.ordersService.findByCreator(userId, page, perPage);
  }

  async getCreatorEarnings(userId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const [totalEarnings, commissionAgg, wallet] = await Promise.all([
      prisma.orderItem.aggregate({
        where: {
          product: {
            creatorId: creator.id,
          },
          order: {
            status: 'PAID',
          },
        },
        _sum: {
          totalPrice: true,
        },
      }),
      prisma.commission.aggregate({
        where: {
          creatorId: creator.id,
          status: { in: ['PENDING', 'APPROVED', 'PAID'] as any },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.wallet.findUnique({
        where: { userId },
      }),
    ]);

    // Single source of truth for the platform fee is the `commission.platform_rate`
    // system setting (never the env). Only used as a fallback for legacy rows
    // that predate per-sale Commission records.
    const platformSetting = await prisma.systemSetting.findUnique({
      where: { key: 'commission.platform_rate' },
      select: { value: true },
    });
    const platformFeePercent = Number(platformSetting?.value ?? 10);
    const grossAmount = totalEarnings._sum.totalPrice?.toNumber() || 0;
    const commissionAmount = commissionAgg._sum.amount?.toNumber() || 0;
    const platformFee = commissionAmount > 0 ? commissionAmount : grossAmount * (platformFeePercent / 100);
    const netAmount = Math.max(0, grossAmount - platformFee);

    return {
      totalEarnings: grossAmount,
      platformFee,
      netEarnings: netAmount,
      pendingPayout: wallet ? wallet.reservedBalance.toNumber() : 0,
      completedPayout: wallet ? wallet.lifetimePayouts.toNumber() : 0,
      availableForPayout: wallet ? wallet.availableBalance.toNumber() : 0,
    };
  }

  async getMyPayouts(userId: string, page = 1, perPage = 20) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const skip = (page - 1) * perPage;
    const [data, total] = await Promise.all([
      prisma.payoutRequest.findMany({
        where: { creatorId: creator.id },
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payoutRequest.count({ where: { creatorId: creator.id } }),
    ]);

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async requestPayout(userId: string, method?: string, notes?: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const minSetting = await prisma.systemSetting.findUnique({
      where: { key: 'platform.min_payout' },
    });
    const minPayout = minSetting
      ? Number(minSetting.value)
      : Number(process.env.MIN_PAYOUT_AMOUNT || 10000);

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new BadRequestException('No available balance to withdraw');
      }

      const available = wallet.availableBalance.toNumber();
      if (available < minPayout) {
        throw new BadRequestException(
          `Minimum payout amount is ₦${minPayout.toLocaleString()}`,
        );
      }

      const payout = await tx.payoutRequest.create({
        data: {
          walletId: wallet.id,
          userId,
          creatorId: creator.id,
          amount: available,
          currency: 'NGN',
          status: 'PENDING',
          method: method || 'Bank Transfer (NGN)',
          notes,
        },
      });

      await tx.wallet.update({
        where: { userId },
        data: {
          availableBalance: { decrement: available },
          reservedBalance: { increment: available },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT',
          amount: available,
          balanceBefore: available,
          balanceAfter: 0,
          description: 'Payout requested',
          referenceType: 'PAYOUT_REQUEST',
          referenceId: payout.id,
        },
      });

      return payout;
    });
  }

  async getMyBankAccounts(userId: string) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    return prisma.creatorBankAccount.findMany({
      where: { creatorId: creator.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addBankAccount(
    userId: string,
    data: { bankName: string; accountNumber: string; accountName: string; isDefault?: boolean },
  ) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const count = await prisma.creatorBankAccount.count({ where: { creatorId: creator.id } });
    const isDefault = count === 0 || data.isDefault === true;

    return prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.creatorBankAccount.updateMany({
          where: { creatorId: creator.id },
          data: { isDefault: false },
        });
      }

      return tx.creatorBankAccount.create({
        data: {
          creatorId: creator.id,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          isDefault,
        },
      });
    });
  }

  async deleteBankAccount(userId: string, id: string) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const account = await prisma.creatorBankAccount.findFirst({
      where: { id, creatorId: creator.id },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.creatorBankAccount.delete({ where: { id } });

      if (account.isDefault) {
        const next = await tx.creatorBankAccount.findFirst({
          where: { creatorId: creator.id },
          orderBy: { createdAt: 'asc' },
        });
        if (next) {
          await tx.creatorBankAccount.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { success: true };
  }

  async getCreatorVerification(userId: string) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const application = await prisma.creatorVerification.findUnique({
      where: { creatorId: creator.id },
    });

    return {
      status: creator.verificationStatus,
      verified: creator.verified,
      verifiedAt: creator.verifiedAt,
      rejectionReason: application?.rejectionReason || null,
      application,
    };
  }

  async submitVerification(
    userId: string,
    data: { identityType: string; identityNumber: string; identityDocument: string },
  ) {
    const creator = await prisma.creatorProfile.findUnique({ where: { userId } });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    if (creator.verificationStatus === 'APPROVED' || creator.verified) {
      throw new BadRequestException('Creator is already verified');
    }

    return prisma.$transaction(async (tx) => {
      const application = await tx.creatorVerification.upsert({
        where: { creatorId: creator.id },
        update: {
          identityType: data.identityType,
          identityNumber: data.identityNumber,
          identityDocument: data.identityDocument,
          status: 'SUBMITTED',
          rejectionReason: null,
        },
        create: {
          creatorId: creator.id,
          identityType: data.identityType,
          identityNumber: data.identityNumber,
          identityDocument: data.identityDocument,
          status: 'SUBMITTED',
        },
      });

      await tx.creatorProfile.update({
        where: { id: creator.id },
        data: { verificationStatus: 'SUBMITTED', verified: false },
      });

      return application;
    });
  }
}
