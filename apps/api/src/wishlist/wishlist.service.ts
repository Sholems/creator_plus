import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';

@Injectable()
export class WishlistService {
  async getOrCreateDefault(userId: string) {
    let wishlist = await prisma.wishlist.findFirst({
      where: { userId, name: 'Default' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                thumbnail: true,
                creator: {
                  select: {
                    id: true,
                    storeName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId, name: 'Default', isPublic: false },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  price: true,
                  thumbnail: true,
                  creator: {
                    select: {
                      id: true,
                      storeName: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    return wishlist;
  }

  async addItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreateDefault(userId);

    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException('Product already in wishlist');
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return this.getOrCreateDefault(userId);
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreateDefault(userId);

    const item = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not in wishlist');
    }

    await prisma.wishlistItem.delete({
      where: { id: item.id },
    });

    return this.getOrCreateDefault(userId);
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlist = await prisma.wishlist.findFirst({
      where: { userId, name: 'Default' },
    });

    if (!wishlist) return false;

    const item = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    return !!item;
  }
}
