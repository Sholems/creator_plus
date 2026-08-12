'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AdinkraMark, AdinkraField } from '@/components/brand/adinkra';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('reference');

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <AdinkraField patternId="adinkra-success" className="text-gold-400/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,180,58,0.1),transparent_60%)]" />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-forest-800">
          <svg className="h-10 w-10 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink-900">
          Payment successful!
        </h1>
        <p className="mt-3 text-ink-500">
          Thank you for your purchase. Your files are ready to download and have been added to your dashboard.
        </p>
        {sessionId && (
          <p className="mt-2 font-mono text-xs text-ink-400">Ref: {sessionId}</p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard/downloads"
            className="inline-flex items-center justify-center rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700"
          >
            Go to My Downloads
          </Link>
          <Link
            href="/dashboard/purchases"
            className="inline-flex items-center justify-center rounded-full border border-ink-100 px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
          >
            View My Purchases
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
