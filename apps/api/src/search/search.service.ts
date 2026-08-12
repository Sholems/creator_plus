import { Injectable, OnModuleInit } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import { prisma } from '@creatormarket/database';

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
  private client: MeiliSearch;

  onModuleInit() {
    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_MASTER_KEY || '',
    });

    void this.configureIndex();
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
    const index = this.client.index('products');
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

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

    return {
      data: result.hits,
      pagination: {
        page,
        perPage,
        total: result.estimatedTotalHits || 0,
        totalPages: Math.ceil((result.estimatedTotalHits || 0) / perPage),
      },
    };
  }

  async getSuggestions(query: string) {
    const index = this.client.index('products');

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
  }

  async getTrending() {
    const index = this.client.index('products');

    const result = await index.search('', {
      limit: 10,
      sort: ['viewCount:desc'],
    });

    return {
      data: result.hits,
    };
  }
}
