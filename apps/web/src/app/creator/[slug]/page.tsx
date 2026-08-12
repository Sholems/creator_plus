'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';
import { CustomerProductCard, CustomerProductCardSkeleton } from '@/components/market/customer-product-card';

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'rating';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'price-asc', label: 'Price: Low to High' },
  { key: 'price-desc', label: 'Price: High to Low' },
  { key: 'rating', label: 'Top Rated' },
];

export default function CreatorStorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [creator, setCreator] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    if (slug) loadStorefront();
  }, [slug]);

  const loadStorefront = async () => {
    try {
      const data = await api.getCreatorStorefront(slug);
      setCreator(data);
    } catch (err: any) {
      setError(err.message || 'Creator not found');
    } finally {
      setIsLoading(false);
    }
  };

  const sortedProducts = useMemo(() => {
    const products = creator?.products || [];
    const list = [...products];
    switch (sort) {
      case 'price-asc':
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-desc':
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case 'rating':
        return list.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
      default:
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [creator, sort]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-cream-100" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <CustomerProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <AdinkraMark className="mx-auto h-12 w-12 text-ink-200" />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">Creator not found</h2>
        <p className="mt-2 text-sm text-ink-500">{error || 'This creator store does not exist.'}</p>
        <Link href="/products" className="mt-6 inline-block font-semibold text-forest-700 hover:underline">
          Browse all products
        </Link>
      </div>
    );
  }

  const stats = creator.stats || {};
  const social = creator.socialLinks || {};
  const memberSince = new Date(creator.createdAt).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-forest-900 text-cream-50">
        {creator.banner ? (
          <img src={creator.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <AdinkraField patternId="adinkra-store" className="pointer-events-none absolute inset-0 opacity-20" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-forest-900/70" />
        <div className="relative px-8 pb-8 pt-24 sm:px-10 sm:pb-10 sm:pt-28">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-50/10 ring-2 ring-gold-400/60">
              {creator.avatar ? (
                <img src={creator.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-3xl font-bold text-gold-300">{creator.storeName?.[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-bold tracking-tight">{creator.storeName}</h1>
                {creator.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/20 px-2.5 py-1 text-xs font-medium text-gold-300">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              {creator.bio && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-200">{creator.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <span className="text-cream-100/80">
                  <span className="font-semibold text-gold-300">{stats.totalProducts || 0}</span> products
                </span>
                <span className="text-cream-100/80">
                  <span className="font-semibold text-gold-300">{stats.totalSales || 0}</span> sales
                </span>
                <span className="text-cream-100/80">
                  <span className="font-semibold text-gold-300">{stats.followers || 0}</span> followers
                </span>
                <span className="flex items-center gap-1 text-cream-100/80">
                  <span className="text-gold-300">★</span>
                  <span className="font-semibold text-gold-300">
                    {Number(stats.averageRating || 0).toFixed(1)}
                  </span>
                  ({stats.reviewCount || 0} reviews)
                </span>
                <span className="text-cream-100/60">Member since {memberSince}</span>
              </div>
              {Object.keys(social).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {['website', 'instagram', 'twitter', 'x', 'tiktok', 'youtube'].map((key) => {
                    const value = social[key];
                    if (!value) return null;
                    return (
                      <a
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-cream-100 capitalize hover:bg-white/20"
                      >
                        {key === 'twitter' ? 'X' : key}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            Products by {creator.storeName}
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="storefront-sort" className="text-sm text-ink-400">Sort by</label>
            <select
              id="storefront-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 outline-none transition-colors focus:border-forest-600"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {sortedProducts.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.map((product: any) => (
              <CustomerProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-200 p-12 text-center">
            <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
            <p className="mt-3 text-sm text-ink-500">This creator has no published products yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
