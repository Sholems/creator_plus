'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';

function SuccessContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const orderId = searchParams.get('orderId');
  const sessionId = searchParams.get('session_id') || searchParams.get('reference');
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token && orderId) {
      setIsLoading(true);
      api
        .getOrder(token, orderId)
        .then(setOrder)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [token, orderId]);

  return (
    <div className="relative overflow-hidden px-4 py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0">
        <AdinkraField patternId="adinkra-success" className="text-gold-400/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,180,58,0.1),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-forest-800">
          <svg className="h-10 w-10 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink-900">
          Payment successful!
        </h1>
        <p className="mt-3 text-ink-500">
          Thank you for your purchase. Your files are ready to download.
        </p>
        {sessionId && (
          <p className="mt-2 font-mono text-xs text-ink-400">Ref: {sessionId}</p>
        )}

        {/* Order items (if order was loaded) */}
        {order && (
          <div className="mt-8 text-left">
            <div className="surface-card overflow-hidden">
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  Order {order.invoiceNumber || orderId}
                </p>
              </div>
              <div className="divide-y divide-ink-100">
                {(order.items || []).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                      {item.product?.thumbnail ? (
                        <Image
                          src={item.product.thumbnail}
                          alt={item.product.title || ''}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <svg className="h-5 w-5 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {item.product?.title || item.productName}
                      </p>
                      <p className="text-xs text-ink-500">{item.licenseType} license</p>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">
                      {formatNaira(item.totalPrice || item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>
              {order.totalAmount && (
                <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
                  <span className="text-sm font-semibold text-ink-900">Total paid</span>
                  <span className="price-tag text-lg font-bold text-forest-900">
                    {formatNaira(order.totalAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What's next */}
        <div className="mt-8 surface-card p-5 text-left">
          <h3 className="font-display text-sm font-semibold text-ink-900">What happens next?</h3>
          <div className="mt-3 space-y-3">
            {[
              { icon: '📥', text: 'Go to your Downloads page to get your files instantly' },
              { icon: '📋', text: 'Check your email for a receipt and download links' },
              { icon: '⭐', text: 'Leave a review after using the product to help other buyers' },
            ].map((step) => (
              <div key={step.text} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg">{step.icon}</span>
                <p className="text-sm text-ink-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard/downloads"
            className="inline-flex items-center justify-center rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Go to My Downloads
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full border border-ink-100 px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
          >
            Continue Shopping
          </Link>
        </div>
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-ink-400">
          <AdinkraMark className="h-4 w-4" />
          <span>CreatorPlus — the market for African digital creators</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <AdinkraMark className="h-10 w-10 animate-pulse text-gold-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
