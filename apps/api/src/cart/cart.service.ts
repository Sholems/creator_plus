import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';

const VALID_LICENSE_TYPES = ['PERSONAL', 'COMMERCIAL', 'EXTENDED', 'ENTERPRISE'] as const;

@Injectable()
export class CartService {
  async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
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
                licenseType: true,
                creator: {
                  select: {
                    id: true,
                    storeName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
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
                  licenseType: true,
                  creator: {
                    select: {
                      id: true,
                      storeName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.price.toNumber() * item.quantity,
      0,
    );

    return {
      ...cart,
      totalAmount,
      itemCount: cart.items.length,
    };
  }

  async addItem(userId: string, productId: string, licenseType: string = 'personal', quantity: number = 1) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== 'PUBLISHED' || product.deletedAt) {
      throw new BadRequestException('Product is not available for purchase');
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const normalizedLicense = licenseType.toUpperCase();
    if (!VALID_LICENSE_TYPES.includes(normalizedLicense as any)) {
      throw new BadRequestException(`Invalid license type: ${licenseType}`);
    }

    const cart = await this.getOrCreateCart(userId);

    // The schema enforces a unique (cartId, productId) pair, so de-dupe on
    // productId alone — adding the same product always merges into one line.
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          licenseType: normalizedLicense as any,
          quantity,
        },
      });
    }

    return this.getOrCreateCart(userId);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getOrCreateCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getOrCreateCart(userId);
  }
}
