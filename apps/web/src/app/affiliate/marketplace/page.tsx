'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@creatorplus/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SectionHeading } from '@/components/market/section-heading';
import {
  AffiliateProductCard,
  AffiliateProductCardSkeleton,
  type AffiliateProduct,
} from '@/components/market/affiliate-product-card';

const SORTS = [
  { value: 'trending', label: 'Trending' },
  { value: 'highest_earning', label: 'Highest earning' },
  { value: 'newest', label: 'Newest' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'editor_picks', label: 'Editor picks' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

interface MarketplaceData {
  settings: { platformRate: number; holdingDays: number; cookieDays: number; minPayout: number };
  products: AffiliateProduct[];
  categories: { id: string; name: string; slug: string }[];
  total: number;
}

export default function AffiliateMarketplacePage() {
  const { token } = useAuth();
  const [data, setData] = useState<MarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('trending');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ productId: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAffiliateMarketplace({
        sort,
        category: category || undefined,
        search: search.trim() || undefined,
        perPage: 60,
      });
      setData(response);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the affiliate marketplace');
    } finally {
      setLoading(false);
    }
  }, [sort, category, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text).catch(() => {
          const el = document.createElement('textarea');
          el.value = text;
          el.style.position = 'fixed';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        });
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      return true;
    } catch {
      return false;
    }
  };

  const generateLink = async (product: AffiliateProduct) => {
    if (!token || generatingId) return;
    setGeneratingId(product.id);
    setGenerated(null);
    try {
      const link = await api.createAffiliateLink(token, { productId: product.id });
      setGenerated({ productId: product.id, url: link.url });
      setBannerDismissed(false);
      setCopied(false);
      await copyText(link.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create a link');
      setTimeout(() => setError(''), 4000);
    } finally {
      setGeneratingId(null);
    }
  };

  const copyGenerated = async () => {
    if (!generated) return;
    const ok = await copyText(generated.url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Affiliate marketplace"
        title="Products to promote"
        description="Every product here is approved for the affiliate program. Pick the ones your audience will love and generate a tracked link in one click."
      />

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products to promote…"
            className="w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500 sm:max-w-sm"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-700 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              !category
                ? 'border-forest-800 bg-forest-800 text-cream-50'
                : 'border-ink-100 bg-white text-ink-600 hover:border-forest-300',
            )}
          >
            All
          </button>
          {(data?.categories ?? []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(category === cat.slug ? '' : cat.slug)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                category === cat.slug
                  ? 'border-forest-800 bg-forest-800 text-cream-50'
                  : 'border-ink-100 bg-white text-ink-600 hover:border-forest-300',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Generated link banner */}
      {generated && !bannerDismissed && (
        <div className="mt-6 rounded-2xl border border-forest-200 bg-forest-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-forest-900">Link ready — start promoting!</p>
              <code className="mt-1 block truncate text-xs text-forest-700">{generated.url}</code>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={copyGenerated}
                className="rounded-full bg-forest-800 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-forest-700"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="rounded-full border border-forest-300 px-3 py-2 text-xs font-medium text-forest-800 hover:bg-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {error}
        </p>
      )}

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <AffiliateProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (data?.products.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 py-20 text-center">
            <p className="font-display text-lg font-semibold text-ink-900">No products found</p>
            <p className="mt-1 text-sm text-ink-500">
              Try a different search or category, or check back soon.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-500">
              <span className="font-display font-semibold text-ink-900">{data?.total ?? 0}</span>{' '}
              products open for promotion
              {data?.settings.cookieDays ? ` · ${data.settings.cookieDays}-day cookie` : ''}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.products ?? []).map((product) => (
                <AffiliateProductCard
                  key={product.id}
                  product={product}
                  cookieDays={data?.settings.cookieDays ?? 30}
                  onGenerateLink={generateLink}
                  isGenerating={generatingId === product.id}
                  linkGenerated={generated?.productId === product.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
