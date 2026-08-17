'use client';

import Link from 'next/link';
import { AdinkraMark } from '@/components/brand/adinkra';

export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <AdinkraMark className="mx-auto h-12 w-12 text-ink-300" />
        <h1 className="mt-6 font-display text-2xl font-bold text-ink-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          We couldn&apos;t load this page. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-ink-400">Error: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-ink-100 px-6 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
