'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdinkraMark } from '@/components/brand/adinkra';
import { SectionHeading } from '@/components/market/section-heading';

interface Creator {
  id: string;
  storeName: string;
  slug: string;
  avatar?: string | null;
  bio?: string | null;
  verified: boolean;
  followerCount: number;
  productCount: number;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getCreatorsDirectory()
      .then((data) => {
        setCreators(data.data);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load creators'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The creators"
        title="Meet the makers"
        description="Nigerian and African creators building and selling digital products on CreatorPlus. Follow your favourites and discover their latest work."
      />

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-clay-200 bg-clay-50 px-6 py-10 text-center text-sm text-clay-700">
          {error}
        </div>
      ) : creators.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink-200 py-20 text-center">
          <AdinkraMark className="mx-auto h-12 w-12 text-ink-200" />
          <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">
            No creators yet
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            Be the first to open a storefront and start selling.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-10 text-sm text-ink-500">
            <span className="font-display font-semibold text-ink-900">{total}</span> active
            creator{total === 1 ? '' : 's'} on the market
          </p>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.slug}`}
                className="group flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-[0_8px_24px_rgba(10,46,34,0.12)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream-100 ring-1 ring-ink-100">
                    {creator.avatar ? (
                      <img src={creator.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-xl font-bold text-forest-700">
                        {creator.storeName[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink-900 group-hover:text-forest-700">
                      <span className="truncate">{creator.storeName}</span>
                      {creator.verified && (
                        <svg className="h-4 w-4 shrink-0 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      {creator.productCount} product{creator.productCount === 1 ? '' : 's'}
                      {creator.followerCount > 0 ? ` · ${creator.followerCount} followers` : ''}
                    </p>
                  </div>
                </div>
                {creator.bio && (
                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink-500">
                    {creator.bio}
                  </p>
                )}
                <div className="mt-auto pt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 group-hover:text-forest-600">
                    Visit shop
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
