import Link from 'next/link';
import { AdinkraMark } from '@/components/brand/adinkra';

export function CreatorEmptyState({ title }: { title?: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white">
      <div className="relative bg-forest-900 px-8 py-10 text-center text-cream-50 sm:py-12">
        <AdinkraMark className="mx-auto h-12 w-12 text-gold-400" />
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title || "Your store isn't set up yet"}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-cream-100/80">
          Set up your store in a few minutes — choose a name, tell buyers about
          yourself, and start selling. You keep 90% of every sale.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sell"
            className="inline-flex items-center justify-center rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-forest-950 shadow-[0_8px_24px_rgba(232,180,58,0.35)] transition-colors hover:bg-gold-300"
          >
            Set up my store →
          </Link>
          <Link
            href="/creator-center"
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:border-gold-300 hover:text-gold-300"
          >
            Learn about selling
          </Link>
        </div>
      </div>
    </div>
  );
}
