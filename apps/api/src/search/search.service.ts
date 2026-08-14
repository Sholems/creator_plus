import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import { prisma, Prisma } from '@creatormarket/database';

export interface SearchFilters {
  q?: string;
  category?: string;
  creator?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort?: string;
  page?: number;
  perPage?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch;

  onModuleInit() {
    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_MASTER_KEY || '',
    });

    void this.configureIndex();

    // Reconcile the index with the database on boot. Per-write indexing is
    // best-effort and can silently drift (e.g. the API was restarted while
    // Meilisearch was down), which hides approved products from the storefront
    // search. Best-effort: never crash the API if Meilisearch is unreachable.
    void this.reindexAll().catch(() => {});
  }

  // Meilisearch refuses filters/sorts on attributes it hasn't been told about.
  // Configure the products index once on startup (best-effort; never crash the
  // API if Meilisearch is unreachable).
  private async configureIndex() {
    try {
      const index = this.client.index('products');
      await index.updateFilterableAttributes([
        'categoryId',
        'creatorId',
        'price',
        'rating',
        'tags',
        'status',
      ]);
      await index.updateSortableAttributes(['price', 'rating', 'createdAt', 'viewCount']);
    } catch {
      // ignore
    }
  }

  /** Map a Prisma product (with category/creator/tags/_count) to a search document. */
  private toDocument(product: any) {
    const reviews = product._count?.reviews || 0;
    const sales = product._count?.orderItems || 0;
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      price: typeof product.price?.toNumber === 'function' ? product.price.toNumber() : product.price,
      currency: product.currency,
      thumbnail: product.thumbnail,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      category: product.category
        ? { id: product.category.id, name: product.category.name, slug: product.category.slug }
        : null,
      creatorId: product.creatorId,
      creatorName: product.creator?.storeName,
      creator: product.creator
        ? {
            id: product.creator.id,
            storeName: product.creator.storeName,
            slug: product.creator.slug,
            avatar: product.creator.avatar,
            verified: !!product.creator.verified,
          }
        : null,
      tags: product.tags?.map((t: any) => t.tag?.name) || [],
      status: product.status,
      createdAt: product.createdAt,
      viewCount: product.viewCount,
      rating:
        typeof product.averageRating?.toNumber === 'function'
          ? product.averageRating.toNumber()
          : product.averageRating,
      averageRating:
        typeof product.averageRating?.toNumber === 'function'
          ? product.averageRating.toNumber()
          : product.averageRating,
      reviewCount: reviews,
      salesCount: sales,
    };
  }

  /** Fetch a product with the same shape the listing endpoint returns. */
  private async fetchDocument(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            avatar: true,
            verified: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          include: { tag: true },
        },
        _count: {
          select: {
            reviews: true,
            orderItems: {
              where: { order: { status: 'PAID' } },
            },
          },
        },
      },
    });
  }

  async indexProduct(product: any) {
    const id = typeof product === 'string' ? product : product.id;
    if (!id) return;
    const full = await this.fetchDocument(id);
    if (!full) return;
    const index = this.client.index('products');
    await index.addDocuments([this.toDocument(full)]);
  }

  async removeProduct(productId: string) {
    const index = this.client.index('products');
    await index.deleteDocument(productId);
  }

  /**
   * Reconcile the search index with the database: (re)index every published
   * product in batches (upsert by id) and drop any documents that are no longer
   * published. Per-write indexing is best-effort and can drift over time — run
   * this on a schedule (a worker) and expose an admin trigger for manual repair.
   */
  async reindexAll(batchSize = 500): Promise<{ indexed: number }> {
    const index = this.client.index('products');
    let skip = 0;
    let indexed = 0;

    for (;;) {
      const products = await prisma.product.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        include: {
          creator: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              avatar: true,
              verified: true,
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          _count: {
            select: {
              reviews: true,
              orderItems: {
                where: { order: { status: 'PAID' } },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: batchSize,
      });
      if (products.length === 0) break;

      await index.addDocuments(products.map((p) => this.toDocument(p)));
      indexed += products.length;
      skip += products.length;
    }

    // Drop documents whose product is no longer published (drift cleanup).
    try {
      await index.deleteDocuments({ filter: 'status != PUBLISHED' });
    } catch {
      // Filter-based deletion needs `status` to be filterable (configured on
      // startup); ignore if the index isn't ready.
    }

    return { indexed };
  }

  async search(filters: SearchFilters) {
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    try {
      const index = this.client.index('products');

      const filter: string[] = [];

      if (filters.category) {
        filter.push(`categoryId = "${filters.category}"`);
      }

      if (filters.creator) {
        filter.push(`creatorId = "${filters.creator}"`);
      }

      if (filters.minPrice !== undefined) {
        filter.push(`price >= ${filters.minPrice}`);
      }

      if (filters.maxPrice !== undefined) {
        filter.push(`price <= ${filters.maxPrice}`);
      }

      if (filters.rating !== undefined) {
        filter.push(`rating >= ${filters.rating}`);
      }

      if (filters.tags && filters.tags.length > 0) {
        const tagList = filters.tags.map((t) => `"${t.replace(/"/g, '')}"`).join(', ');
        filter.push(`tags IN [${tagList}]`);
      }

      const sortMap: Record<string, string> = {
        price_asc: 'price:asc',
        price_desc: 'price:desc',
        rating: 'rating:desc',
        newest: 'createdAt:desc',
        popular: 'viewCount:desc',
      };

      const sort = filters.sort && sortMap[filters.sort] ? [sortMap[filters.sort]] : undefined;

      const result = await index.search(filters.q || '', {
        filter: filter.length > 0 ? filter : undefined,
        sort,
        limit: perPage,
        offset: (page - 1) * perPage,
      });

      // A successful-but-empty result usually means the index has drifted from
      // the database (e.g. products were published while Meilisearch was down
      // and the boot-time reindex had not run yet). Fall back to the database
      // so an empty/out-of-sync index can never blank out the marketplace.
      if (result.hits.length === 0) {
        return this.searchFromDb(filters, page, perPage);
      }

      return {
        data: result.hits,
        pagination: {
          page,
          perPage,
          total: result.estimatedTotalHits || 0,
          totalPages: Math.ceil((result.estimatedTotalHits || 0) / perPage),
        },
      };
    } catch (err) {
      // The marketplace listing and search depend on Meilisearch. If it is
      // unreachable (or its index has drifted from the DB), fall back to a
      // direct database query so approved/published products are never hidden
      // from the storefront.
      this.logger.warn(
        `Meilisearch search failed — falling back to the database: ${(err as Error).message}`,
      );
      return this.searchFromDb(filters, page, perPage);
    }
  }

  /** DB-backed search used when Meilisearch is unavailable or out of sync. */
  private async searchFromDb(filters: SearchFilters, page: number, perPage: number) {
    const where: Prisma.ProductWhereInput = { status: 'PUBLISHED', deletedAt: null };

    if (filters.category) {
      where.categoryId = filters.category;
    }

    if (filters.creator) {
      where.creatorId = filters.creator;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {
        ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
      };
    }

    if (filters.rating !== undefined) {
      where.averageRating = { gte: filters.rating };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { some: { tag: { name: { in: filters.tags } } } };
    }

    if (filters.q) {
      const q = filters.q.trim();
      if (q) {
        where.OR = [
          { title: { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
        ];
      }
    }

    const sortMap: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
      price_asc: [{ price: 'asc' }],
      price_desc: [{ price: 'desc' }],
      rating: [{ averageRating: 'desc' }],
      newest: [{ createdAt: 'desc' }],
      popular: [{ viewCount: 'desc' }],
    };
    const orderBy = (filters.sort && sortMap[filters.sort]) || sortMap.newest;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              avatar: true,
              verified: true,
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
          _count: {
            select: {
              reviews: true,
              orderItems: {
                where: { order: { status: 'PAID' } },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: items.map((p) => this.toDocument(p)),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async getSuggestions(query: string) {
    const index = this.client.index('products');

    try {
      const result = await index.search(query, {
        limit: 5,
        attributesToHighlight: ['title'],
      });

      return result.hits.map((hit: any) => ({
        id: hit.id,
        title: hit.title,
        slug: hit.slug,
        price: hit.price,
      }));
    } catch (err) {
      this.logger.warn(
        `Meilisearch suggestions failed — falling back to the database: ${(err as Error).message}`,
      );
      const products = await prisma.product.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          title: { contains: query, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
        },
      });
      return products.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: typeof p.price?.toNumber === 'function' ? p.price.toNumber() : p.price,
      }));
    }
  }

  async getTrending() {
    const index = this.client.index('products');

    try {
      const result = await index.search('', {
        limit: 10,
        sort: ['viewCount:desc'],
      });

      return {
        data: result.hits,
      };
    } catch (err) {
      this.logger.warn(
        `Meilisearch trending failed — falling back to the database: ${(err as Error).message}`,
      );
      const products = await prisma.product.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { viewCount: 'desc' },
        take: 10,
      });
      return { data: products };
    }
  }
}
