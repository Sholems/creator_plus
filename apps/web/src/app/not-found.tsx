import Link from 'next/link';
import { AdinkraMark } from '@/components/brand/adinkra';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="font-display text-7xl font-bold text-cream-200">404</div>
        <AdinkraMark className="mx-auto -mt-4 h-12 w-12 text-ink-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700"
          >
            Go home
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-ink-100 px-6 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-cream-100"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
