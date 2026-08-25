'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@creatormarket/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNaira } from '@/lib/format';
import { formatEventWhen, localTimezoneLabel } from '@/lib/event';
import { RichText } from '@/components/market/rich-text';
import { safeJsonLd } from '@/lib/json-ld';
import { AdinkraMark } from '@/components/brand/adinkra';
import { CustomerProductCard } from '@/components/market/customer-product-card';

function formatFileSize(bytes: number): string {
  const n = Number(bytes) || 0;
  if (n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Short, human label for a file from its extension or mime type. */
function fileKindLabel(fileName?: string, mimeType?: string): string {
  const ext = fileName?.split('.').pop()?.toUpperCase();
  if (ext && ext.length <= 5) return ext;
  const mt = (mimeType || '').split('/').pop()?.toUpperCase();
  return mt || 'FILE';
}

export function ProductDetailClient({
  slug,
  initialProduct,
  initialReviews,
  initialRelated,
  initialCreatorProducts,
}: {
  slug: string;
  initialProduct: any;
  initialReviews: any[];
  initialRelated: any[];
  initialCreatorProducts?: any[];
}) {
  const router = useRouter();
  const { user, token } = useAuth();

  const [product, setProduct] = useState<any>(initialProduct);
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [related, setRelated] = useState<any[]>(initialRelated);
  const [creatorProducts, setCreatorProducts] = useState<any[]>(initialCreatorProducts ?? []);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [error, setError] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);
  const [isAffiliateActive, setIsAffiliateActive] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [reviewSort, setReviewSort] = useState<'recent' | 'highest' | 'lowest' | 'helpful'>('recent');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState((initialReviews?.length ?? 0) >= 10);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [eventAvail, setEventAvail] = useState<any>(null);

  // Content arrives server-rendered via props (SSR/SEO). On mount in the
  // browser, refresh it and register the view — this plain GET increments
  // viewCount, whereas the server render used track=false so crawler hits
  // don't inflate the count.
  useEffect(() => {
    api.getProduct(slug).then(setProduct).catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    if (!token) return;
    api
      .getAffiliateMe(token)
      .then((me) => setIsAffiliateActive(me?.status === 'ACTIVE'))
      .catch(() => setIsAffiliateActive(false));
  }, [token]);

  // Live seat availability for event products.
  useEffect(() => {
    if (initialProduct?.productType !== 'EVENT') return;
    api
      .getEventAvailability(initialProduct.id)
      .then(setEventAvail)
      .catch(() => undefined);
  }, [initialProduct?.id, initialProduct?.productType]);

  // Hydrate the wishlist toggle so an already-saved product shows "Saved".
  useEffect(() => {
    if (!token) {
      setIsInWishlist(false);
      return;
    }
    api
      .getWishlist(token)
      .then((w: any) => {
        const items = w?.data ?? w?.items ?? (Array.isArray(w) ? w : []);
        const ids = (items || []).map((i: any) => i.productId ?? i.product?.id ?? i.id);
        setIsInWishlist(ids.includes(product.id));
      })
      .catch(() => undefined);
  }, [token, product.id]);

  const handleLoadMoreReviews = async () => {
    const next = reviewsPage + 1;
    setLoadingMoreReviews(true);
    try {
      const res = await api.getProductReviews(product.id, { page: next, perPage: 10 });
      const more = res?.data ?? [];
      setReviews((prev) => [...prev, ...more]);
      setReviewsPage(next);
      setHasMoreReviews(more.length >= 10);
    } catch {
      setHasMoreReviews(false);
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  const handlePurchase = async () => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    try {
      setIsPurchasing(true);
      const order = await api.createOrder(token, [
        {
          productId: product.id,
          quantity: 1,
          licenseType: product.licenseType || 'personal',
        },
      ]);
      router.push(`/checkout?orderId=${order.id}`);
    } catch (err: any) {
      setError(err.message);
      setIsPurchasing(false);
    }
  };

  const handleAddToCart = async () => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    try {
      setIsAddingToCart(true);
      setCartMessage('');
      await api.addToCart(token, { productId: product.id });
      setCartMessage('Added to cart!');
      setTimeout(() => setCartMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = product.title;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} on CreatorPlus`, url });
        return;
      }
      throw new Error('unavailable');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied to clipboard!');
        setTimeout(() => setShareMessage(''), 3000);
      } catch {
        setShareMessage('');
      }
    }
  };

  const handleToggleWishlist = async () => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    try {
      if (isInWishlist) {
        await api.removeFromWishlist(token, product.id);
        setIsInWishlist(false);
      } else {
        await api.addToWishlist(token, product.id);
        setIsInWishlist(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    if (!reviewRating || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    setReviewMessage('');
    try {
      await api.createReview(token, {
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
      });
      setReviewMessage('Review submitted. Thank you!');
      setReviewRating(0);
      setReviewTitle('');
      setReviewComment('');
      const reviewData = await api.getProductReviews(product.id);
      setReviews(reviewData.data);
      const fresh = await api.getProduct(slug);
      setProduct(fresh);
    } catch (err: any) {
      setReviewMessage(err.message || 'Could not submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    if (helpfulIds.includes(reviewId)) return;
    try {
      await api.markReviewHelpful(token, reviewId);
      setHelpfulIds((prev) => [...prev, reviewId]);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r)),
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReport = async (reviewId: string) => {
    if (!token) {
      router.push('/auth/login');
      return;
    }
    const reason = window.prompt('Why are you reporting this review?') || '';
    if (!reason.trim()) return;
    try {
      await api.reportReview(token, reviewId, reason.trim());
      setReviewMessage('Review reported. Our team will review it shortly.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <AdinkraMark className="mx-auto h-12 w-12 text-ink-200" />
        <h2 className="mt-4 font-display text-2xl font-bold text-ink-900">Product not found</h2>
        <p className="mt-2 text-sm text-ink-500">{error || 'The product you are looking for does not exist.'}</p>
        <Link href="/products" className="mt-6 inline-block font-semibold text-forest-700 hover:underline">
          Browse all products
        </Link>
      </div>
    );
  }

  const salesCount = product._count?.orderItems ?? 0;
  const reviewCount = product._count?.reviews ?? product.reviewCount ?? 0;
  const avgRating = Number(product.averageRating) || 0;

  // Event product: date/time/location + live seat state.
  const isEvent = product.productType === 'EVENT';
  const ev = product.event;
  const eventSoldOut = isEvent && (eventAvail?.soldOut || eventAvail?.available === false);
  const seatsLeft = eventAvail?.seatsLeft;

  // Media gallery: thumbnail first, then cover + preview images, de-duplicated.
  const gallery: string[] = [
    ...new Set(
      [product.thumbnail, product.coverImage, ...(product.previewImages || [])].filter(Boolean),
    ),
  ] as string[];
  const activeSrc = gallery[Math.min(activeImage, Math.max(0, gallery.length - 1))];

  const files: any[] = Array.isArray(product.files) ? product.files : [];
  const totalFileSize = files.reduce((sum, f) => sum + (Number(f.fileSize) || 0), 0);

  // Discount percentage off the compare-at price, when it's a genuine markdown.
  const compareAt = Number(product.compareAtPrice) || 0;
  const price = Number(product.price) || 0;
  const savePercent = compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  // Sort the loaded reviews client-side. Distribution is computed from what's
  // loaded and labelled as such, so it never misrepresents the full set.
  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === 'highest') return b.rating - a.rating;
    if (reviewSort === 'lowest') return a.rating - b.rating;
    if (reviewSort === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const licenseLabel = (product.licenseType || 'Personal').toString();
  const faqs = [
    {
      q: 'How do I receive this product after paying?',
      a: 'Instantly. As soon as your payment is confirmed you can download your files from your CreatorPlus dashboard, and we email you a copy of the link.',
    },
    {
      q: `What does the ${licenseLabel} license allow?`,
      a: `This product is sold under a ${licenseLabel.toLowerCase()} license, covering your own use as described by the creator. For any other use, message the seller before purchasing.`,
    },
    {
      q: 'Can I get a refund?',
      a: "Because this is an instant digital download, all sales are final. If a file is faulty or not as described, contact the seller and we'll help put it right.",
    },
    {
      q: 'What payment methods can I use?',
      a: 'Pay securely with Paystack — debit or credit card, bank transfer, or USSD.',
    },
    {
      q: 'Will I get future updates?',
      a: 'Yes — buyers get free updates to this product whenever the creator ships a new version.',
    },
  ];
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-8">
      {error && (
        <div className="mb-4 rounded-xl border border-clay-200 bg-clay-50 px-4 py-2.5 text-sm text-clay-700">
          {error}
        </div>
      )}
      <nav className="mb-6 text-sm text-ink-400">
        <Link href="/" className="hover:text-forest-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-forest-700">Products</Link>
        {product.category?.name && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/categories/${product.category.slug || product.categoryId}`} className="hover:text-forest-700">
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink-900">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left — Product gallery */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream-100">
            {activeSrc ? (
              <Image
                src={activeSrc}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg className="h-20 w-20 text-ink-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {gallery.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === activeImage}
                  className={cn(
                    'relative aspect-square overflow-hidden rounded-lg bg-cream-100 ring-2 transition',
                    i === activeImage ? 'ring-forest-600' : 'ring-transparent hover:ring-ink-200',
                  )}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — Details */}
        <div className="flex flex-col lg:sticky lg:top-24 lg:self-start">
          {/* Category + Title */}
          {product.category?.name && (
            <span className="w-fit rounded-full bg-forest-100 px-3 py-1 eyebrow text-[0.625rem] text-forest-700">
              {product.category.name}
            </span>
          )}
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {product.title}
          </h1>

          {/* Creator + Rating */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={`/creator/${product.creator?.slug}`} className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-cream-100">
                {product.creator?.avatar && (
                  <Image src={product.creator.avatar} alt="" fill sizes="32px" className="object-cover" />
                )}
              </div>
              <span className="text-sm font-medium text-ink-700 hover:text-forest-700">
                {product.creator?.storeName}
              </span>
            </Link>
            {product.creator?.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2.5 py-1 text-xs font-medium text-gold-700">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
            {product.averageRating ? (
              <span className="flex items-center gap-1 text-sm text-ink-500">
                <span className="text-gold-500">★</span>
                {Number(product.averageRating).toFixed(1)}
                <span className="text-ink-400">({reviewCount})</span>
              </span>
            ) : (
              <span className="text-sm text-ink-400">New</span>
            )}
            {salesCount > 0 && (
              <span className="text-sm text-ink-500">{salesCount} sales</span>
            )}
          </div>

          {/* Buy box */}
          <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(22,33,27,0.05)]">
          {/* Price + License */}
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <p className="price-tag text-3xl font-bold text-forest-900">{formatNaira(product.price)}</p>
            {savePercent > 0 && (
              <>
                <p className="text-sm text-ink-400 line-through">{formatNaira(product.compareAtPrice)}</p>
                <span className="rounded-full bg-clay-100 px-2.5 py-1 text-xs font-bold text-clay-700">
                  Save {savePercent}%
                </span>
              </>
            )}
            {!isEvent && (
              <p className="ml-auto text-xs text-ink-400">{product.licenseType || 'Personal'} license</p>
            )}
          </div>

          {isEvent && ev && (
            <div className="mt-4 space-y-2 rounded-xl border border-ink-100 bg-cream-50 p-4 text-sm">
              <div className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium text-ink-900">{formatEventWhen(ev.startsAt, ev.endsAt)}</p>
                  <p className="text-xs text-ink-400">Shown in {localTimezoneLabel()}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-ink-700">
                  {ev.locationType === 'VIRTUAL'
                    ? 'Online event — join link sent after purchase'
                    : ev.venueName || ev.venueAddress || 'In-person event'}
                </p>
              </div>
              {typeof seatsLeft === 'number' && (
                <p className={`text-xs font-medium ${eventSoldOut ? 'text-clay-600' : 'text-forest-700'}`}>
                  {eventSoldOut ? 'Sold out' : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={handlePurchase}
              disabled={isPurchasing || (isEvent && eventSoldOut)}
              className="w-full rounded-full bg-forest-800 px-4 py-3.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700 disabled:opacity-50"
            >
              {isPurchasing
                ? 'Processing…'
                : isEvent
                  ? eventSoldOut ? 'Sold out' : 'Get Ticket'
                  : 'Buy Now'}
            </button>
            {!isEvent && (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full rounded-full border border-forest-300 bg-white px-4 py-3.5 text-sm font-semibold text-forest-800 transition-colors hover:bg-cream-100 disabled:opacity-50"
              >
                {isAddingToCart ? 'Adding…' : 'Add to Cart'}
              </button>
            )}
            {cartMessage && (
              <p className="text-center text-sm font-medium text-forest-700">{cartMessage}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleToggleWishlist}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-ink-100 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
              >
                <svg className="h-4 w-4" fill={isInWishlist ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isInWishlist ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleShare}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-ink-100 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
            {shareMessage && (
              <p className="text-center text-sm font-medium text-forest-700">{shareMessage}</p>
            )}
          </div>

          {/* Trust signals */}
          <div className="mt-5 space-y-2.5 border-t border-ink-100 pt-5 text-sm text-ink-600">
            {[
              {
                icon: 'M5 13l4 4L19 7',
                text: isEvent ? 'Ticket & details sent right after payment' : 'Instant download after payment',
              },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'Secure, encrypted checkout' },
              { icon: 'M3 10h18M7 15h2m4 0h4M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'Pay securely with Paystack' },
            ].map((row) => (
              <div key={row.text} className="flex items-center gap-2.5">
                <svg className="h-4 w-4 shrink-0 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={row.icon} />
                </svg>
                {row.text}
              </div>
            ))}
          </div>

          {/* Product details */}
          <div className="mt-5 border-t border-ink-100 pt-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-400">Category</dt>
              <dd className="text-right text-ink-900">{product.category?.name}</dd>
              <dt className="text-ink-400">License</dt>
              <dd className="text-right text-ink-900 capitalize">{product.licenseType}</dd>
              <dt className="text-ink-400">Version</dt>
              <dd className="text-right text-ink-900">{product.currentVersion || product.version || '1.0'}</dd>
              {salesCount > 0 && (
                <>
                  <dt className="text-ink-400">Sales</dt>
                  <dd className="text-right text-ink-900">{salesCount}</dd>
                </>
              )}
              <dt className="text-ink-400">Downloads</dt>
              <dd className="text-right text-ink-900">{product.downloadCount || 0}</dd>
              <dt className="text-ink-400">Last updated</dt>
              <dd className="text-right text-ink-900">
                {new Date(product.updatedAt || product.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short' })}
              </dd>
            </dl>
          </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink-900">About this product</h2>
        <RichText
          className="rich-text mt-3 leading-relaxed text-ink-600"
          html={product.description}
        />
      </div>

      {/* What's included */}
      {files.length > 0 && (
        <div className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-ink-900">What&apos;s included</h2>
            <p className="text-sm text-ink-400">
              {files.length} file{files.length === 1 ? '' : 's'}
              {totalFileSize > 0 ? ` · ${formatFileSize(totalFileSize)}` : ''}
            </p>
          </div>
          <ul className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-[0.625rem] font-bold text-ink-500">
                  {fileKindLabel(f.fileName, f.mimeType)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">{f.fileName}</span>
                <span className="shrink-0 text-xs text-ink-400">{formatFileSize(f.fileSize)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-400">Files are delivered instantly after purchase.</p>
        </div>
      )}

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {product.tags.map((t: any) => (
            <Link
              key={t.tag?.id}
              href={`/products?search=${encodeURIComponent(t.tag?.name || '')}`}
              className="rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-cream-200 hover:text-ink-900"
            >
              #{t.tag?.name}
            </Link>
          ))}
        </div>
      )}

      {/* FAQ */}
      <div className="mt-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
        />
        <h2 className="font-display text-xl font-semibold text-ink-900">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink-900">
                {f.q}
                <svg className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink-900">
          Reviews ({reviewCount})
        </h2>

        {reviewCount > 0 && (
          <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-ink-100 bg-white p-5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-col items-center justify-center sm:w-40">
              <p className="font-display text-4xl font-bold text-ink-900">{avgRating.toFixed(1)}</p>
              <div className="mt-1 flex text-gold-500" aria-label={`${avgRating.toFixed(1)} out of 5 stars`}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={cn('h-4 w-4', i < Math.round(avgRating) ? 'text-gold-500' : 'text-ink-200')} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-400">{reviewCount} rating{reviewCount === 1 ? '' : 's'}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {dist.map(({ star, count }) => {
                const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-ink-500">
                    <span className="w-8 shrink-0">{star}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
                      <span className="block h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-right text-ink-400">{count}</span>
                  </div>
                );
              })}
              {reviews.length < reviewCount && (
                <p className="pt-1 text-[0.6875rem] text-ink-400">Breakdown based on {reviews.length} loaded reviews.</p>
              )}
            </div>
          </div>
        )}

        {reviewMessage && (
          <p className="mt-3 rounded-xl bg-cream-100 px-4 py-2.5 text-sm font-medium text-forest-800">
            {reviewMessage}
          </p>
        )}

        {user && token && (
          <form
            onSubmit={handleSubmitReview}
            className="mt-5 rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_1px_2px_rgba(22,33,27,0.04)]"
          >
            <div className="flex items-center gap-1">
              <span className="mr-2 text-sm font-medium text-ink-700">Your rating</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="text-2xl leading-none"
                  aria-label={`${star} star`}
                >
                  <span className={cn(star <= reviewRating ? 'text-gold-500' : 'text-ink-200')}>★</span>
                </button>
              ))}
            </div>
            <input
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Review title (optional)"
              className="mt-4 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-forest-600"
            />
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              required
              placeholder="Share what you liked about this product…"
              rows={4}
              className="mt-3 w-full resize-none rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-forest-600"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-400">Reviews can only be left by verified buyers.</p>
              <button
                type="submit"
                disabled={isSubmittingReview || !reviewRating || !reviewComment.trim()}
                className="rounded-full bg-forest-800 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-50"
              >
                {isSubmittingReview ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}

        {reviews.length > 1 && (
          <div className="mt-6 flex items-center justify-end gap-2">
            <label htmlFor="review-sort" className="text-xs text-ink-400">Sort by</label>
            <select
              id="review-sort"
              value={reviewSort}
              onChange={(e) => setReviewSort(e.target.value as typeof reviewSort)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 outline-none focus:border-forest-600"
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
              <option value="helpful">Most helpful</option>
            </select>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center">
              <p className="text-sm text-ink-500">No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            sortedReviews.map((review) => (
              <div key={review.id} className="border-b border-ink-100 pb-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-forest-100">
                    {review.buyer?.avatar ? (
                      <Image src={review.buyer.avatar} alt="" fill sizes="36px" className="object-cover" />
                    ) : (
                      <span className="font-display text-sm font-semibold text-forest-700">
                        {(review.buyer?.displayName || 'O')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                      {review.buyer?.displayName}
                      <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-1.5 py-0.5 text-[0.625rem] font-medium text-forest-700">
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified purchase
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-gold-500">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={cn('h-3.5 w-3.5', i < review.rating ? 'text-gold-500' : 'text-ink-200')} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </span>
                      <span className="text-xs text-ink-400">
                        {new Date(review.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {review.title && (
                  <p className="mt-2 font-medium text-ink-900">{review.title}</p>
                )}
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{review.comment}</p>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    onClick={() => handleHelpful(review.id)}
                    disabled={!token || helpfulIds.includes(review.id)}
                    className={cn(
                      'text-xs font-medium transition-colors',
                      helpfulIds.includes(review.id) ? 'text-forest-700' : 'text-ink-400 hover:text-forest-700',
                    )}
                  >
                    Helpful ({review.helpfulCount || 0})
                  </button>
                  <button
                    onClick={() => handleReport(review.id)}
                    disabled={!token}
                    className="text-xs font-medium text-ink-400 transition-colors hover:text-red-600"
                  >
                    Report
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMoreReviews && reviews.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMoreReviews}
              disabled={loadingMoreReviews}
              className="rounded-full border border-ink-200 bg-white px-6 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100 disabled:opacity-50"
            >
              {loadingMoreReviews ? 'Loading…' : 'Load more reviews'}
            </button>
          </div>
        )}
      </div>
      {product.affiliateEnabled && product.affiliateStatus === 'APPROVED' && (
        <div className="mt-16 overflow-hidden rounded-3xl bg-forest-800 text-cream-50">
          <div className="flex flex-col items-center gap-6 px-6 py-10 text-center sm:px-10 lg:flex-row lg:justify-between lg:text-left">
            <div className="max-w-xl">
              <p className="eyebrow text-gold-300">Affiliate opportunity</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                Earn money promoting this product
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-100/80">
                Share your unique link and earn{' '}
                <span className="font-semibold text-gold-300">
                  {formatNaira(Number(product.price) * (Number(product.affiliateCommissionRate) / 100))}
                </span>{' '}
                per referred sale — that&apos;s a{' '}
                <span className="font-semibold text-gold-300">
                  {product.affiliateCommissionRate}%
                </span>{' '}
                commission, tracked and paid out automatically.
              </p>
            </div>
            <div className="shrink-0">
              {isAffiliateActive ? (
                <Link
                  href="/affiliate/marketplace"
                  className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3 text-sm font-semibold text-forest-900 shadow-lg transition-colors hover:bg-gold-300"
                >
                  Generate Affiliate Link
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <Link
                  href="/earn"
                  className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3 text-sm font-semibold text-forest-900 shadow-lg transition-colors hover:bg-gold-300"
                >
                  Become an Affiliate
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meet the seller */}
      {product.creator?.slug && (
        <div className="mt-16 rounded-3xl border border-ink-100 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Link
              href={`/creator/${product.creator.slug}`}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-cream-100"
            >
              {product.creator.avatar ? (
                <Image src={product.creator.avatar} alt={product.creator.storeName || ''} fill sizes="64px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-2xl font-semibold text-forest-700">
                  {(product.creator.storeName || 'C')[0].toUpperCase()}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-gold-600">Meet the seller</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Link
                  href={`/creator/${product.creator.slug}`}
                  className="font-display text-lg font-bold text-ink-900 hover:text-forest-700"
                >
                  {product.creator.storeName}
                </Link>
                {product.creator.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-700">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              {product.creator.bio && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-600">{product.creator.bio}</p>
              )}
            </div>
            <Link
              href={`/creator/${product.creator.slug}`}
              className="shrink-0 rounded-full border border-forest-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-forest-800 transition-colors hover:bg-cream-100"
            >
              View store
            </Link>
          </div>
        </div>
      )}

      {/* More from this creator */}
      {creatorProducts.length > 0 && product.creator?.slug && (
        <div className="mt-16">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              More from {product.creator.storeName}
            </h2>
            <Link
              href={`/creator/${product.creator.slug}`}
              className="text-sm font-semibold text-forest-700 hover:text-forest-600"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {creatorProducts.slice(0, 4).map((p) => (
              <CustomerProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold text-ink-900">You might also like</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <CustomerProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Mobile sticky purchase bar — keeps the CTA in reach while scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-cream-50/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <p className="price-tag text-lg font-bold text-forest-900">{formatNaira(product.price)}</p>
            {savePercent > 0 && (
              <p className="text-[0.6875rem] text-clay-600">Save {savePercent}%</p>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            {!isEvent && (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="rounded-full border border-forest-300 bg-white px-4 py-2.5 text-sm font-semibold text-forest-800 disabled:opacity-50"
              >
                {isAddingToCart ? '…' : 'Add'}
              </button>
            )}
            <button
              onClick={handlePurchase}
              disabled={isPurchasing || (isEvent && eventSoldOut)}
              className="rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 disabled:opacity-50"
            >
              {isPurchasing ? 'Processing…' : isEvent ? (eventSoldOut ? 'Sold out' : 'Get Ticket') : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
