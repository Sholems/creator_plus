import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { prisma, ProductStatus, Prisma } from '@creatormarket/database';
import { paginate, pageMeta } from '../common/pagination';
import { StorageService } from '../storage/storage.service';
import { SearchService } from '../search/search.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { validateFile, getMaxFileSizeFromSettings } from '../common/file-validation';
import {
  DEFAULT_AFFILIATE_COMMISSION_RATE,
  isAllowedAffiliateRate,
} from '../affiliates/commission-calculator';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class ProductsService {
  constructor(
    private storageService: StorageService,
    private searchService: SearchService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  private async syncSearchIndex(product: any) {
    try {
      if (product.status === 'PUBLISHED') {
        await this.searchService.indexProduct(product);
      } else {
        await this.searchService.removeProduct(product.id);
      }
    } catch {
      // Search indexing is best-effort; never fail product operations on it.
    }
  }

  async create(creatorId: string, data: {
    title: string;
    slug: string;
    description: string;
    categoryId: string;
    price: number;
    compareAtPrice?: number;
    currency?: string;
    tags?: string[];
    licenseType?: 'personal' | 'commercial' | 'extended' | 'enterprise';
    thumbnail?: string;
    deliveryUrl?: string;
    affiliateEnabled?: boolean;
    affiliateCommissionRate?: number;
  }) {
    // Verify creator profile exists
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
    });

    if (!creator) {
      throw new ForbiddenException('You must be a creator to add products');
    }

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('Please select a valid category');
    }

    // Create or connect tags
    const tags = data.tags
      ? await Promise.all(
          data.tags.map(async (tagName) => {
            const slug = tagName.toLowerCase().replace(/\s+/g, '-');
            return prisma.tag.upsert({
              where: { slug },
              create: { name: tagName, slug },
              update: {},
            });
          })
        )
      : [];

    // Affiliate opt-in: enabling submits the product for admin review with the
    // creator's chosen reward rate; disabling takes it out of the program.
    const affiliateEnabled = data.affiliateEnabled ?? false;
    const affiliateCommissionRate = affiliateEnabled
      ? data.affiliateCommissionRate ?? DEFAULT_AFFILIATE_COMMISSION_RATE
      : null;
    if (
      affiliateEnabled &&
      !isAllowedAffiliateRate(affiliateCommissionRate as number)
    ) {
      throw new BadRequestException(
        'Affiliate rate must be one of 20, 25, 30, 35, 40, 50',
      );
    }

    let product;
    try {
      product = await prisma.product.create({
        data: {
          creatorId: creator.id,
          title: data.title,
          slug: data.slug,
          description: data.description,
          categoryId: data.categoryId,
          price: data.price,
          compareAtPrice: data.compareAtPrice ?? null,
          currency: data.currency || 'NGN',
          licenseType: (data.licenseType || 'personal').toUpperCase() as any,
          thumbnail: data.thumbnail || null,
          deliveryUrl: data.deliveryUrl ? data.deliveryUrl.trim() : null,
          affiliateEnabled,
          affiliateStatus: affiliateEnabled ? 'PENDING_REVIEW' : 'DISABLED',
          affiliateCommissionRate,
          tags: {
            create: tags.map((tag) => ({
              tagId: tag.id,
            })),
          },
        },
        include: {
          creator: {
            select: {
              id: true,
              storeName: true,
              slug: true,
            },
          },
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A product with this slug already exists — try editing the slug or choosing a different title',
        );
      }
      throw error;
    }

    void this.syncSearchIndex(product);

    return product;
  }

  async findAll(filters?: {
    categoryId?: string;
    creatorId?: string;
    status?: ProductStatus;
    isFeatured?: boolean;
    page?: number;
    perPage?: number;
    viewerUserId?: string;
  }) {
    const { page, perPage, skip, take } = paginate(filters?.page, filters?.perPage);

    const where: Prisma.ProductWhereInput = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.creatorId) {
      where.creatorId = filters.creatorId;
    }

    if (filters?.isFeatured) {
      where.isFeatured = true;
    }

    // Non-published listings (DRAFT/PENDING/REJECTED/ARCHIVED) are private:
    // only the authenticated creator who owns the requested profile may see
    // them (their dashboard lists every status). Anonymous visitors — even if
    // they know a creatorId — only ever get published products.
    let ownerCanSeeAll = false;
    if (filters?.creatorId && filters?.viewerUserId) {
      const viewerProfile = await prisma.creatorProfile.findUnique({
        where: { userId: filters.viewerUserId },
        select: { id: true },
      });
      ownerCanSeeAll = !!viewerProfile && viewerProfile.id === filters.creatorId;
    }

    if (filters?.status) {
      where.status =
        filters.status === 'PUBLISHED' || ownerCanSeeAll ? filters.status : 'PUBLISHED';
    } else if (!ownerCanSeeAll) {
      where.status = 'PUBLISHED';
    }
    // else: the owner is browsing their own list — show every status.

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              avatar: true,
            },
          },
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
          _count: {
            select: {
              orderItems: {
                where: {
                  order: { status: 'PAID' },
                },
              },
            },
          },
          // Only the owning creator sees their uploaded files (for the edit
          // form's persistence). Public listings never include them.
          ...(ownerCanSeeAll
            ? {
                files: {
                  orderBy: { createdAt: 'desc' },
                  select: {
                    id: true,
                    fileName: true,
                    fileSize: true,
                    mimeType: true,
                    createdAt: true,
                  },
                },
              }
            : {}),
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: ownerCanSeeAll
        ? products
        : products.map(({ deliveryUrl, ...safeProduct }) => safeProduct),
      pagination: pageMeta(page, perPage, total),
    };
  }

  async findBySlug(slug: string, track = true) {
    const product = await prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        creator: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            avatar: true,
            bio: true,
            verified: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        versions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        reviews: {
          where: { reported: false },
          include: {
            buyer: {
              select: {
                id: true,
                displayName: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            orderItems: {
              where: {
                order: { status: 'PAID' },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment the view count without blocking the read path — a hot product's
    // detail view must not serialize on a write. Best-effort; failures are
    // swallowed. Skipped when track=false (e.g. SEO metadata fetches) so those
    // don't inflate view counts. (At higher scale, buffer this in Redis and
    // flush via a worker.)
    if (track) {
      void prisma.product
        .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
        .catch(() => undefined);
    }

    // deliveryUrl is the paid deliverable — never expose it on public reads.
    const { deliveryUrl, ...safeProduct } = product;
    return safeProduct;
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            avatar: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            orderItems: {
              where: {
                order: { status: 'PAID' },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // deliveryUrl is the paid deliverable — never expose it on public reads.
    const { deliveryUrl, ...safeProduct } = product;
    return safeProduct;
  }

  async update(id: string, creatorId: string, data: any) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        affiliateEnabled: true,
        affiliateStatus: true,
        affiliateCommissionRate: true,
        creator: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.creator.userId !== creatorId) {
      throw new ForbiddenException('Not authorized to update this product');
    }

    const oldPrice = product.price.toNumber();

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new BadRequestException('Please select a valid category');
      }
    }

    const { tags, affiliateEnabled, affiliateCommissionRate, ...rest } = data;

    if ('deliveryUrl' in rest) {
      // Empty string means "clear the link"; a trimmed value is stored as-is.
      rest.deliveryUrl = rest.deliveryUrl ? String(rest.deliveryUrl).trim() : null;
    }

    if (rest.licenseType) {
      rest.licenseType = rest.licenseType.toUpperCase();
    }

    // compareAtPrice: explicit undefined means "don't change", null or number means "set/clear"
    if ('compareAtPrice' in rest) {
      rest.compareAtPrice = rest.compareAtPrice === undefined ? undefined : (rest.compareAtPrice ?? null);
    }

    // Affiliate program opt-in / rate transitions. Enabling a disabled or
    // rejected product re-submits it for admin review; an approved product
    // keeps its approval when the creator only changes the reward rate.
    let affiliateData: Prisma.ProductUpdateInput = {};
    if (affiliateEnabled !== undefined || affiliateCommissionRate !== undefined) {
      if (
        affiliateCommissionRate !== undefined &&
        !isAllowedAffiliateRate(affiliateCommissionRate)
      ) {
        throw new BadRequestException(
          'Affiliate rate must be one of 20, 25, 30, 35, 40, 50',
        );
      }
      const enable = affiliateEnabled ?? product.affiliateEnabled;
      if (enable) {
        if (product.affiliateStatus === 'SUSPENDED') {
          throw new ForbiddenException(
            "This product's affiliate program was suspended by an admin",
          );
        }
        const nextStatus =
          product.affiliateStatus === 'APPROVED' ||
          product.affiliateStatus === 'PENDING_REVIEW'
            ? product.affiliateStatus
            : 'PENDING_REVIEW';
        affiliateData = {
          affiliateEnabled: true,
          affiliateStatus: nextStatus,
          affiliateCommissionRate:
            affiliateCommissionRate ??
            product.affiliateCommissionRate ??
            DEFAULT_AFFILIATE_COMMISSION_RATE,
          ...(nextStatus === 'PENDING_REVIEW'
            ? {
                affiliateApprovedAt: null,
                affiliateApprovedBy: null,
                affiliateRejectionReason: null,
              }
            : {}),
        };
      } else {
        affiliateData = {
          affiliateEnabled: false,
          affiliateStatus: 'DISABLED',
          ...(affiliateCommissionRate !== undefined
            ? { affiliateCommissionRate }
            : {}),
        };
      }
    }

    const tagRelations = tags
      ? await Promise.all(
          tags.map(async (tagName: string) => {
            const slug = tagName.toLowerCase().replace(/\s+/g, '-');
            const tag = await prisma.tag.upsert({
              where: { slug },
              create: { name: tagName, slug },
              update: {},
            });
            return { tagId: tag.id };
          }),
        )
      : undefined;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...affiliateData,
        ...(tagRelations
          ? {
              tags: {
                deleteMany: {},
                create: tagRelations,
              },
            }
          : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            storeName: true,
            slug: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    void this.syncSearchIndex(updated);

    // Price drop: notify everyone who wished for this product.
    if (typeof data.price === 'number' && data.price < oldPrice) {
      void this.notifyPriceDrop(updated, data.price);
    }

    return updated;
  }

  private async notifyPriceDrop(product: any, newPrice: number) {
    try {
      const wishlistItems = await prisma.wishlistItem.findMany({
        where: { productId: product.id },
        include: {
          wishlist: { select: { userId: true } },
        },
      });
      const userIds = [...new Set(wishlistItems.map((w) => w.wishlist.userId))];
      if (userIds.length === 0) return;

      // Resolve every recipient in one query instead of N findUnique calls.
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, displayName: true },
      });

      for (const user of users) {
        void this.notificationsService.create(
          user.id,
          'SYSTEM',
          'Price drop! 🏷️',
          `"${product.title}" just dropped to ₦${newPrice.toLocaleString()} — it's on your wishlist.`,
          { productId: product.id, price: newPrice },
        );
        void this.emailService.sendPriceDrop(
          user.email,
          user.displayName || 'there',
          {
            title: product.title,
            slug: product.slug,
            newPrice,
          },
        );
      }
    } catch {
      // Price-drop notifications are best-effort; never fail the price update.
    }
  }

  async publish(id: string, creatorId: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.creator.userId !== creatorId) {
      throw new ForbiddenException('Not authorized to publish this product');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'PENDING' },
    });

    // Take the listing down from search while it awaits moderation.
    void this.syncSearchIndex({ ...updated, status: 'DRAFT' });

    return updated;
  }

  async approve(id: string) {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    void this.syncSearchIndex(updated);

    return updated;
  }

  async reject(id: string) {
    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    void this.syncSearchIndex(updated);

    return updated;
  }

  async archive(id: string, creatorId: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.creator.userId !== creatorId) {
      throw new ForbiddenException('Not authorized to archive this product');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    void this.syncSearchIndex(updated);

    return updated;
  }

  async addFile(productId: string, creatorId: string, file: MulterFile) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { creator: { select: { userId: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.creator.userId !== creatorId) {
      throw new ForbiddenException('Not authorized to upload files for this product');
    }

    validateFile(file, await getMaxFileSizeFromSettings());

    const { key, url } = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `products/${productId}/files`,
    );

    const productFile = await prisma.productFile.create({
      data: {
        productId,
        fileName: file.originalname,
        fileKey: key,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        storageProvider: 'r2',
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        fileSize: { increment: BigInt(file.size) },
      },
    });

    return productFile;
  }

  async getFiles(productId: string) {
    return prisma.productFile.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFilesWithUrls(productId: string) {
    const files = await prisma.productFile.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      files.map(async (file) => {
        const downloadUrl = await this.storageService.getSignedDownloadUrl(file.fileKey, 3600);
        return { ...file, downloadUrl };
      }),
    );
  }

  async deleteFile(productId: string, fileId: string, creatorId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { creator: { select: { userId: true } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.creator.userId !== creatorId) {
      throw new ForbiddenException('Not authorized to delete files for this product');
    }

    const productFile = await prisma.productFile.findUnique({
      where: { id: fileId },
    });

    if (!productFile || productFile.productId !== productId) {
      throw new NotFoundException('File not found');
    }

    try {
      await this.storageService.deleteFile(productFile.fileKey);
    } catch {
      // Best-effort: the DB row is the source of truth for delivery. If the
      // storage provider is unavailable we still drop the record so the
      // creator is never stuck with a file they cannot remove.
    }

    await prisma.$transaction([
      prisma.productFile.delete({ where: { id: fileId } }),
      prisma.product.update({
        where: { id: productId },
        data: { fileSize: { decrement: productFile.fileSize } },
      }),
    ]);

    return { ok: true };
  }
}
