'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@creatormarket/ui';
import { formatNaira } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export interface CustomerProduct {
  id: string;
  title: string;
  slug: string;
  price: number | string;
  currency?: string;
  compareAtPrice?: number | string | null;
  thumbnail?: string | null;
  averageRating?: number | string | null;
  reviewCount?: number;
  salesCount?: number;
  category?: { id: string; name: string; slug: string } | null;
  creator?: { storeName?: string | null; slug?: string | null; verified?: boolean } | null;
  _count?: { orderItems?: number };
}

function formatSalesCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function CustomerProductCard({
  product,
  className,
}: {
  product: CustomerProduct;
  className?: string;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);

  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : 0;
  const hasDiscount = compareAt > price;
  const sales = product.salesCount ?? product._count?.orderItems ?? 0;

  const requireLogin = () => {
    router.push('/auth/login');
    return false;
  };

  const toggleWishlist = async () => {
    if (!token) return requireLogin();
    try {
      if (isInWishlist) {
        await api.removeFromWishlist(token, product.id);
        setIsInWishlist(false);
      } else {
        await api.addToWishlist(token, product.id);
        setIsInWishlist(true);
      }
    } catch {
      /* ignore wishlist errors on the card */
    }
  };

  const viewDetails = () => {
    router.push(`/products/${product.slug}`);
  };

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(22,33,27,0.04)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-[0_8px_24px_rgba(10,46,34,0.12)]',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-100">
        <Link href={`/products/${product.slug}`} aria-label={product.title} className="absolute inset-0">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg className="h-12 w-12 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </Link>
        {product.category?.name && (
          <span className="absolute left-3 top-3 rounded-full bg-forest-900/85 px-2.5 py-1 eyebrow text-[0.5625rem] text-gold-300 backdrop-blur">
            {product.category.name}
          </span>
        )}
        {hasDiscount && (
          <span className="absolute right-3 top-3 rounded-full bg-gold-600 px-2.5 py-1 text-[0.625rem] font-bold text-white shadow-sm">
            −{Math.round(((compareAt - price) / compareAt) * 100)}%
          </span>
        )}
        <button
          type="button"
          onClick={toggleWishlist}
          aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          <svg
            className={cn('h-4 w-4', isInWishlist ? 'text-gold-600' : 'text-ink-400')}
            fill={isInWishlist ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-display text-[0.95rem] font-semibold leading-snug text-ink-900 line-clamp-1 group-hover:text-forest-700">
            {product.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5">
          {product.creator?.verified && (
            <svg className="h-3.5 w-3.5 shrink-0 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          <p className="truncate text-xs text-ink-500">{product.creator?.storeName}</p>
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="flex items-baseline gap-2">
            <span className="price-tag text-lg font-bold text-forest-900">{formatNaira(price)}</span>
            {hasDiscount && (
              <span className="text-xs text-ink-400 line-through">{formatNaira(compareAt)}</span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs text-ink-500">
            {product.averageRating && Number(product.averageRating) > 0 ? (
              <>
                <span className="text-gold-500">★</span>
                {Number(product.averageRating).toFixed(1)}
                {product.reviewCount ? (
                  <span className="text-ink-400">({product.reviewCount})</span>
                ) : null}
              </>
            ) : (
              <span className="font-mono uppercase tracking-wide text-ink-400">New</span>
            )}
          </span>
        </div>

        {sales > 0 && (
          <p className="mt-1 text-xs text-ink-400">{formatSalesCount(sales)} sales</p>
        )}

        <button
          type="button"
          onClick={viewDetails}
          className="mt-3 w-full rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

export function CustomerProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-cream-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 rounded bg-cream-200 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-cream-200 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-cream-100 animate-pulse" />
        <div className="h-5 w-20 rounded bg-cream-200 animate-pulse mt-2" />
        <div className="h-9 w-full rounded-full bg-cream-200 animate-pulse mt-3" />
      </div>
    </div>
  );
}
