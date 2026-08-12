import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { cached } from '../common/cache';

const CATEGORIES_CACHE_KEY = 'categories:all';
const CATEGORIES_TTL = 300; // 5 minutes

@Injectable()
export class CategoriesService {
  async findAll() {
    // Public, read-heavy, rarely changes → cache for 5 minutes (Redis when
    // available; otherwise falls through to the query).
    return cached(CATEGORIES_CACHE_KEY, CATEGORIES_TTL, async () => {
      const categories = await prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: {
            select: {
              products: {
                where: { status: 'PUBLISHED', deletedAt: null },
              },
            },
          },
        },
      });

      return categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        parentId: c.parentId,
        productCount: c._count.products,
        createdAt: c.createdAt,
      }));
    });
  }

  async findBySlug(slug: string) {
    const category = await prisma.category.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        _count: {
          select: {
            products: {
              where: { status: 'PUBLISHED', deletedAt: null },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      parentId: category.parentId,
      productCount: category._count.products,
      createdAt: category.createdAt,
    };
  }

  async findById(id: string) {
    const category = await prisma.category.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }
}
