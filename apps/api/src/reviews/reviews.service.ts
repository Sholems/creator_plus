import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly searchService: SearchService,
  ) {}
  async create(buyerId: string, productId: string, data: { rating: number; title?: string; comment: string }) {
    // Check if user has purchased the product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        product: {
          id: productId,
        },
        order: {
          buyerId,
          status: 'PAID',
        },
      },
    });

    if (!hasPurchased) {
      throw new ForbiddenException('You must purchase this product before reviewing');
    }

    // Check if already reviewed
    const existing = await prisma.review.findFirst({
      where: {
        productId,
        buyerId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ForbiddenException('You have already reviewed this product');
    }

    const review = await prisma.review.create({
      data: {
        productId,
        buyerId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
      },
      include: {
        buyer: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Update product average rating
    await this.updateProductRating(productId);

    // Notify the creator of the new review
    const productWithCreator = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        creator: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (productWithCreator?.creator) {
      const creatorUser = await prisma.user.findUnique({
        where: { id: productWithCreator.creator.userId },
        select: { email: true, displayName: true },
      });
      if (creatorUser) {
        void this.emailService.sendNewReview(
          creatorUser.email,
          creatorUser.displayName || 'there',
          { title: review.product.title },
          { rating: review.rating, comment: review.comment || '' },
        );

        void this.notificationsService.create(
          productWithCreator.creator.userId,
          'NEW_REVIEW',
          'New review',
          `${review.buyer?.displayName || 'A buyer'} rated "${review.product.title}" ${review.rating}/5.`,
          { productId, reviewId: review.id, rating: review.rating },
        );
      }
    }

    return review;
  }

  async findByProduct(productId: string, page = 1, perPage = 20) {
    const skip = (page - 1) * perPage;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          productId,
          reported: false,
          deletedAt: null,
        },
        include: {
          buyer: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            },
          },
          helpfulVotes: {
            select: {
              id: true,
            },
          },
        },
        skip,
        take: perPage,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.review.count({
        where: {
          productId,
          reported: false,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findById(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        helpfulVotes: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(id: string, buyerId: string, data: { rating?: number; title?: string; comment?: string }) {
    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException('Not authorized to update this review');
    }

    const updated = await prisma.review.update({
      where: { id },
      data,
      include: {
        buyer: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (data.rating) {
      await this.updateProductRating(review.productId);
    }

    return updated;
  }

  async delete(id: string, buyerId: string) {
    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException('Not authorized to delete this review');
    }

    await prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.updateProductRating(review.productId);
  }

  async markHelpful(id: string, userId: string) {
    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check if already voted
    const existingVote = await prisma.reviewHelpfulVote.findFirst({
      where: {
        reviewId: id,
        userId,
      },
    });

    if (existingVote) {
      throw new ForbiddenException('You have already marked this review as helpful');
    }

    await prisma.reviewHelpfulVote.create({
      data: {
        reviewId: id,
        userId,
      },
    });

    return prisma.review.update({
      where: { id },
      data: {
        helpfulCount: { increment: 1 },
      },
    });
  }

  async report(id: string, userId: string, reason: string) {
    const review = await prisma.review.findUnique({ where: { id } });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.buyerId === userId) {
      throw new ForbiddenException('Cannot report your own review');
    }

    return prisma.review.update({
      where: { id },
      data: {
        reported: true,
        reportedReason: reason,
        reportedById: userId,
      },
    });
  }

  private async updateProductRating(productId: string) {
    const result = await prisma.review.aggregate({
      where: {
        productId,
        deletedAt: null,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: result._avg.rating || 0,
        reviewCount: result._count.id,
      },
    });

    await this.syncSearchIndex(productId);
  }

  // Keep the search index's rating field in sync with the product aggregate.
  private async syncSearchIndex(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          creator: { select: { storeName: true } },
          category: { select: { name: true } },
          tags: { include: { tag: true } },
        },
      });
      if (product) await this.searchService.indexProduct(product);
    } catch {
      // Best-effort: review rating changes should never block the review itself.
    }
  }
}
