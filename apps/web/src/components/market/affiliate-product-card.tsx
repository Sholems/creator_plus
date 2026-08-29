'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@creatorplus/ui';
import { formatNaira } from '@/lib/format';

export interface AffiliateProduct {
  id: string;
  title: string;
  slug: string;
  price: number | string;
  currency?: string;
  thumbnail?: string | null;
  averageRating?: number | string | null;
  reviewCount?: number;
  salesCount?: number;
  affiliateCommissionRate: number;
  affiliateClickCount?: number;
  category?: { id: string; name: string; slug: string } | null;
  creator?: { storeName?: string | null; slug?: string | null; verified?: boolean } | null;
}

export function AffiliateProductCard({
  product,
  cookieDays = 30,
  onGenerateLink,
  isGenerating,
  linkGenerated,
  className,
}: {
  product: AffiliateProduct;
  cookieDays?: number;
  onGenerateLink: (product: AffiliateProduct) => void;
  isGenerating?: boolean;
  linkGenerated?: boolean;
  className?: string;
}) {
  const price = Number(product.price);
  const rate = product.affiliateCommissionRate;
  const earnPerSale = (price * rate) / 100;

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-gold-400/40 bg-white shadow-[0_1px_2px_rgba(22,33,27,0.04)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-[0_8px_24px_rgba(212,164,32,0.15)]',
        className,
      )}
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-cream-100">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
        <span className="absolute left-3 top-3 rounded-full bg-forest-900/85 px-2.5 py-1 eyebrow text-[0.5625rem] text-gold-300 backdrop-blur">
          {product.category?.name ?? 'Affiliate pick'}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-gold-600 px-2.5 py-1 text-[0.625rem] font-bold text-white shadow-sm">
          {rate}% commission
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5">
          {product.creator?.verified && (
            <svg className="h-3.5 w-3.5 shrink-0 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          <p className="truncate text-xs text-ink-500">{product.creator?.storeName}</p>
        </div>

        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-1 font-display text-[0.95rem] font-semibold leading-snug text-ink-900 line-clamp-1 group-hover:text-forest-700">
            {product.title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
          <span className="flex items-center gap-1">
            <span className="text-gold-500">★</span>
            {product.averageRating && Number(product.averageRating) > 0
              ? Number(product.averageRating).toFixed(1)
              : 'New'}
          </span>
          {product.salesCount ? <span>· {product.salesCount} sales</span> : null}
          {product.affiliateClickCount ? (
            <span>· {product.affiliateClickCount} clicks</span>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl bg-gold-600 px-4 py-3 text-center text-cream-50">
          <p className="eyebrow text-[0.5625rem] text-gold-100">You earn per sale</p>
          <p className="font-display text-2xl font-bold leading-tight text-white">
            {formatNaira(earnPerSale)}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
          <span className="font-medium text-ink-900">{formatNaira(price)}</span>
          <span>{cookieDays}-day cookie</span>
        </div>

        <button
          type="button"
          onClick={() => onGenerateLink(product)}
          disabled={isGenerating}
          className={cn(
            'mt-3 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50',
            linkGenerated
              ? 'bg-forest-700 text-cream-50 hover:bg-forest-600'
              : 'bg-forest-800 text-cream-50 hover:bg-forest-700',
          )}
        >
          {isGenerating
            ? 'Generating…'
            : linkGenerated
              ? 'Link generated ✓'
              : 'Generate Link'}
        </button>
      </div>
    </div>
  );
}

export function AffiliateProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="aspect-[16/9] animate-pulse bg-cream-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 rounded bg-cream-200 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-cream-200 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-cream-100 animate-pulse" />
        <div className="h-16 w-full rounded-xl bg-cream-200 animate-pulse" />
        <div className="h-9 w-full rounded-full bg-cream-200 animate-pulse mt-2" />
      </div>
    </div>
  );
}
