'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@creatormarket/ui';
import { api } from '@/lib/api';
import { AdinkraMark } from '@/components/brand/adinkra';
import { SectionHeading } from '@/components/market/section-heading';
import { CustomerProductCard, CustomerProductCardSkeleton } from '@/components/market/customer-product-card';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Best Rating' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

const PRICE_PRESETS = [
  { label: 'Under ₦1,000', min: 0, max: 1000 },
  { label: '₦1,000 – ₦5,000', min: 1000, max: 5000 },
  { label: '₦5,000 – ₦20,000', min: 5000, max: 20000 },
  { label: '₦20,000+', min: 20000, max: undefined },
];

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-xs font-medium text-forest-800">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-forest-400 hover:bg-forest-100 hover:text-forest-700"
        aria-label={`Remove filter: ${label}`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function FilterSidebar({
  filters,
  categories,
  creators,
  onSearch,
  onUpdateFilter,
  className,
}: {
  filters: any;
  categories: any[];
  creators: any[];
  onSearch: (e: React.FormEvent) => void;
  onUpdateFilter: (patch: Partial<any>) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Search */}
      <form onSubmit={onSearch}>
        <label className="eyebrow text-ink-400">Search</label>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) => onUpdateFilter({ search: e.target.value })}
            className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-forest-800 px-4 py-2.5 text-sm font-medium text-cream-50 hover:bg-forest-700"
          >
            Go
          </button>
        </div>
      </form>

      {/* Price Range */}
      <div>
        <label className="eyebrow text-ink-400">Price range</label>
        <div className="mt-2 space-y-2">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset) => {
              const isActive =
                filters.minPrice === String(preset.min ?? '') &&
                filters.maxPrice === (preset.max !== undefined ? String(preset.max) : '');
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onUpdateFilter({
                      minPrice: preset.min !== undefined ? String(preset.min) : '',
                      maxPrice: preset.max !== undefined ? String(preset.max) : '',
                    })
                  }
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-forest-800 bg-forest-800 text-cream-50'
                      : 'border-ink-100 bg-white text-ink-600 hover:border-forest-300',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {/* Custom inputs */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-400">₦</span>
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => onUpdateFilter({ minPrice: e.target.value })}
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
                onChange={(e) => onUpdateFilter({ maxPrice: e.target.value })}
                className="w-full rounded-xl border border-ink-100 bg-cream-50 py-2 pl-7 pr-3 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="eyebrow text-ink-400">Minimum rating</label>
        <div className="mt-2 space-y-1.5">
          <label className="flex cursor-pointer items-center rounded-lg px-2 py-1.5 transition-colors hover:bg-cream-50">
            <input
              type="radio"
              name="rating"
              checked={filters.rating === ''}
              onChange={() => onUpdateFilter({ rating: '' })}
              className="h-4 w-4 border-ink-200 text-gold-500 focus:ring-gold-500"
            />
            <span className="ml-2 text-sm text-ink-600">Any rating</span>
          </label>
          {[4, 3, 2, 1].map((rating) => (
            <label key={rating} className="flex cursor-pointer items-center rounded-lg px-2 py-1.5 transition-colors hover:bg-cream-50">
              <input
                type="radio"
                name="rating"
                checked={filters.rating === String(rating)}
                onChange={() => onUpdateFilter({ rating: String(rating) })}
                className="h-4 w-4 border-ink-200 text-gold-500 focus:ring-gold-500"
              />
              <span className="ml-2 flex items-center gap-0.5 text-sm text-ink-600">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={cn('h-3.5 w-3.5', i < rating ? 'text-gold-500' : 'text-ink-200')}
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

      {/* Creator Filter */}
      {creators.length > 0 && (
        <div>
          <label className="eyebrow text-ink-400">Creator</label>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            <label className="flex cursor-pointer items-center rounded-lg px-2 py-1.5 transition-colors hover:bg-cream-50">
              <input
                type="radio"
                name="creator"
                checked={filters.creatorId === ''}
                onChange={() => onUpdateFilter({ creatorId: '' })}
                className="h-4 w-4 border-ink-200 text-gold-500 focus:ring-gold-500"
              />
              <span className="ml-2 text-sm text-ink-600">All creators</span>
            </label>
            {creators.slice(0, 20).map((creator) => (
              <label key={creator.id} className="flex cursor-pointer items-center rounded-lg px-2 py-1.5 transition-colors hover:bg-cream-50">
                <input
                  type="radio"
                  name="creator"
                  checked={filters.creatorId === creator.id}
                  onChange={() => onUpdateFilter({ creatorId: creator.id })}
                  className="h-4 w-4 border-ink-200 text-gold-500 focus:ring-gold-500"
                />
                <span className="ml-2 truncate text-sm text-ink-600">{creator.storeName}</span>
                {creator.verified && <span className="ml-1 text-gold-500">✓</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<any[]>(initialProducts);
  const [categories] = useState<any[]>(initialCategories);
  const [creators, setCreators] = useState<any[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: initialQuery,
    categoryId: initialCategoryId,
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    rating: searchParams.get('rating') || '',
    creatorId: searchParams.get('creator') || '',
    sort: searchParams.get('sort') || 'newest',
  });

  // Load creators for the sidebar
  useEffect(() => {
    api.searchProducts('', { perPage: 100 }).catch(() => {}).then(() => {});
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/creators`, { next: { revalidate: 300 } } as any)
      .then((r) => r.json())
      .then((d) => setCreators(d?.data ?? []))
      .catch(() => {});
  }, []);

  // Build active filter chips
  const activeFilters = useMemo(() => {
    const chips: { label: string; key: string }[] = [];
    if (filters.search) chips.push({ label: `Search: "${filters.search}"`, key: 'search' });
    if (filters.categoryId) {
      const cat = categories.find((c) => c.id === filters.categoryId);
      chips.push({ label: cat?.name || 'Category', key: 'categoryId' });
    }
    if (filters.minPrice || filters.maxPrice) {
      const min = filters.minPrice ? `₦${Number(filters.minPrice).toLocaleString()}` : '₦0';
      const max = filters.maxPrice ? `₦${Number(filters.maxPrice).toLocaleString()}` : '∞';
      chips.push({ label: `Price: ${min} – ${max}`, key: 'price' });
    }
    if (filters.rating) chips.push({ label: `${filters.rating}+ stars`, key: 'rating' });
    if (filters.creatorId) {
      const creator = creators.find((c) => c.id === filters.creatorId);
      chips.push({ label: creator?.storeName || 'Creator', key: 'creatorId' });
    }
    return chips;
  }, [filters, categories, creators]);

  const removeFilter = useCallback((key: string) => {
    if (key === 'price') {
      updateFilters({ minPrice: '', maxPrice: '' });
    } else if (key === 'search') {
      updateFilters({ search: '' });
    } else if (key === 'categoryId') {
      updateFilters({ categoryId: '' });
    } else if (key === 'rating') {
      updateFilters({ rating: '' });
    } else if (key === 'creatorId') {
      updateFilters({ creatorId: '' });
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      rating: '',
      creatorId: '',
      sort: filters.sort,
    });
  }, [filters.sort]);

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
  }, [filters.categoryId, filters.minPrice, filters.maxPrice, filters.rating, filters.creatorId, filters.sort, pagination.page]);

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
        creator: filters.creatorId || undefined,
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
            'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
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
              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              filters.categoryId === cat.id
                ? 'border-forest-800 bg-forest-800 text-cream-50'
                : 'border-ink-100 bg-white text-ink-600 hover:border-forest-300',
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Active filter chips + sort + mobile filter toggle */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((chip) => (
              <ActiveFilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => removeFilter(chip.key)}
              />
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-medium text-ink-400 underline decoration-dotted underline-offset-2 hover:text-ink-600"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Sort — desktop */}
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <span className="text-xs text-ink-400">Sort by</span>
          <select
            value={filters.sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm font-medium text-ink-700 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Mobile filter toggle */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 lg:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilters.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-800 text-[0.625rem] font-bold text-cream-50">
              {activeFilters.length}
            </span>
          )}
        </button>

        {/* Sort — mobile */}
        <select
          value={filters.sort}
          onChange={(e) => updateFilters({ sort: e.target.value })}
          className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm font-medium text-ink-700 sm:hidden"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* Filters Sidebar — desktop */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="space-y-6 rounded-2xl border border-ink-100 bg-white p-5 lg:sticky lg:top-24">
            <FilterSidebar
              filters={filters}
              categories={categories}
              creators={creators}
              onSearch={handleSearch}
              onUpdateFilter={updateFilters}
            />
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <p className="text-sm text-ink-500">
              <span className="font-display font-semibold text-ink-900">{pagination.total}</span>{' '}
              {pagination.total === 1 ? 'product' : 'products'} found
            </p>
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
              {activeFilters.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-sm font-semibold text-forest-700 hover:text-forest-600"
                >
                  Clear all filters
                </button>
              )}
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
              <nav className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="rounded-full border border-ink-100 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-cream-100 disabled:opacity-40"
                >
                  ← Prev
                </button>
                {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination({ ...pagination, page })}
                      className={cn(
                        'h-10 w-10 rounded-full text-sm font-medium transition-colors',
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

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4">
              <h2 className="font-display text-lg font-bold text-ink-900">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 hover:bg-cream-100 hover:text-ink-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <FilterSidebar
                filters={filters}
                categories={categories}
                creators={creators}
                onSearch={(e) => {
                  handleSearch(e);
                  setMobileFiltersOpen(false);
                }}
                onUpdateFilter={updateFilters}
              />
            </div>
            <div className="sticky bottom-0 border-t border-ink-100 bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  loadProducts();
                  setMobileFiltersOpen(false);
                }}
                className="w-full rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700"
              >
                Show {pagination.total} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
