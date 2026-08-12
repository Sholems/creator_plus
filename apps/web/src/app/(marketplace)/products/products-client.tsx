'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@creatormarket/ui';
import { api } from '@/lib/api';
import { AdinkraMark } from '@/components/brand/adinkra';
import { SectionHeading } from '@/components/market/section-heading';
import { CustomerProductCard, CustomerProductCardSkeleton } from '@/components/market/customer-product-card';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Best Rating' },
  { value: 'popular', label: 'Most Popular' },
];

export function ProductsClient({
  initialProducts,
  initialPagination,
  initialCategories,
  initialQuery,
  initialCategoryId,
}: {
  initialProducts: any[];
  initialPagination: { page: number; perPage: number; total: number; totalPages: number };
  initialCategories: any[];
  initialQuery: string;
  initialCategoryId: string;
}) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [categories] = useState<any[]>(initialCategories);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: initialQuery,
    categoryId: initialCategoryId,
    minPrice: '',
    maxPrice: '',
    rating: '',
    sort: 'newest',
  });

  // Initial data is server-rendered via props; skip the first auto-load so we
  // don't flash a skeleton over the SSR content. Subsequent filter/page
  // changes fetch client-side as before.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timer = setTimeout(() => loadProducts(), 250);
    return () => clearTimeout(timer);
  }, [filters.categoryId, filters.minPrice, filters.maxPrice, filters.rating, filters.sort, pagination.page]);

  const updateFilters = (patch: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const minPrice = filters.minPrice === '' ? undefined : Number(filters.minPrice);
      const maxPrice = filters.maxPrice === '' ? undefined : Number(filters.maxPrice);
      const rating = filters.rating === '' ? undefined : Number(filters.rating);

      const response = await api.searchProducts(filters.search, {
        category: filters.categoryId || undefined,
        minPrice,
        maxPrice,
        rating,
        sort: filters.sort,
        page: pagination.page,
        perPage: pagination.perPage,
      });
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({});
    loadProducts();
  };

  const selectCategory = (id: string) => {
    updateFilters({ categoryId: id });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Page Header */}
      <SectionHeading
        eyebrow="The market"
        title="Browse the market"
        description="Fresh digital goods from Nigerian and African creators — templates, fonts, art, music, tools and more."
      />

      {/* Category chips */}
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => selectCategory('')}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            !filters.categoryId
              ? 'border-forest-800 bg-forest-800 text-cream-50'
              : 'border-ink-100 bg-white text-ink-600 hover:border-forest-300',
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => selectCategory(cat.id)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filters.categoryId === cat.id
                ? 'border-forest-800 bg-forest-800 text-cream-50'
                : 'border-ink-100 bg-white text-ink-600 hover:border-forest-300',
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-6 rounded-2xl border border-ink-100 bg-white p-5">
            <form onSubmit={handleSearch}>
              <label className="eyebrow text-ink-400">Search</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-forest-800 px-3 py-2 text-sm font-medium text-cream-50 hover:bg-forest-700"
                >
                  Go
                </button>
              </div>
            </form>

            <div>
              <label className="eyebrow text-ink-400">Price</label>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-400">₦</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => updateFilters({ minPrice: e.target.value })}
                    className="w-full rounded-xl border border-ink-100 bg-cream-50 py-2 pl-7 pr-3 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  />
                </div>
                <span className="text-ink-300">–</span>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-400">₦</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                    className="w-full rounded-xl border border-ink-100 bg-cream-50 py-2 pl-7 pr-3 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="eyebrow text-ink-400">Rating</label>
              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-center">
                  <input
                    type="radio"
                    name="rating"
                    checked={filters.rating === ''}
                    onChange={() => updateFilters({ rating: '' })}
                    className="h-4 w-4 border-ink-200 text-gold-500 focus:ring-gold-500"
                  />
                  <span className="ml-2 text-sm text-ink-600">Any</span>
                </label>
                {[4, 3, 2, 1].map((rating) => (
                  <label key={rating} className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="rating"
                      checked={filters.rating === String(rating)}
                      onChange={() => updateFilters({ rating: String(rating) })}
                      className="h-4 w-4 border-ink-200 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="ml-2 flex items-center gap-0.5 text-sm text-ink-600">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={cn('h-4 w-4', i < rating ? 'text-gold-500' : 'text-ink-200')}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-1">& up</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <p className="text-sm text-ink-500">
              <span className="font-display font-semibold text-ink-900">{pagination.total}</span>{' '}
              products found
            </p>
            <select
              value={filters.sort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-700 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <CustomerProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <AdinkraMark className="mx-auto h-12 w-12 text-ink-200" />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">
                No products found
              </h3>
              <p className="mt-1 text-sm text-ink-500">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <CustomerProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center">
              <nav className="flex items-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-cream-100 disabled:opacity-40"
                >
                  ← Prev
                </button>
                {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination({ ...pagination, page })}
                      className={cn(
                        'h-9 w-9 rounded-full text-sm font-medium transition-colors',
                        pagination.page === page
                          ? 'bg-forest-800 text-cream-50'
                          : 'border border-ink-100 bg-white text-ink-700 hover:bg-cream-100',
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-cream-100 disabled:opacity-40"
                >
                  Next →
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

