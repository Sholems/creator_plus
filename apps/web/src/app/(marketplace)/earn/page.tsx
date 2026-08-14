'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AdinkraField, AdinkraMark } from '@/components/brand/adinkra';

interface MarketplaceStats {
  settings: { platformRate: number; holdingDays: number; cookieDays: number; minPayout: number };
  products: any[];
}

export default function EarnPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<MarketplaceStats | null>(null);

  useEffect(() => {
    api
      .getAffiliateMarketplace({ perPage: 60 })
      .then((data) => setStats({ settings: data.settings, products: data.products }))
      .catch(() => undefined);
  }, []);

  const maxRate = stats
    ? Math.max(...stats.products.map((p) => p.affiliateCommissionRate), 20)
    : 20;
  const statItems = stats
    ? [
        { value: `${maxRate}%`, label: 'Top reward per sale' },
        { value: `${stats.products.length}`, label: 'Products to promote' },
        { value: `${stats.settings.cookieDays}`, label: 'Cookie window (days)' },
        { value: `₦${stats.settings.minPayout.toLocaleString()}`, label: 'Minimum payout' },
      ]
    : [];

  const cta: { href: Route; label: string } | null = authLoading
    ? null
    : isAuthenticated
      ? { href: '/affiliate/dashboard', label: 'Open your affiliate dashboard' }
      : { href: '/auth/register', label: 'Join & start earning' };

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-forest-950 text-cream-50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,180,58,0.16),transparent_55%)]" />
          <AdinkraField patternId="adinkra-earn" markClassName="text-gold-400" className="text-gold-400/15" />
          <div className="absolute inset-0 bg-forest-950/55" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-forest-950" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 eyebrow text-gold-300">
              <AdinkraMark className="h-4 w-4 text-gold-300" />
              CreatorPlus Affiliates
            </p>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Earn real naira by{' '}
              <span className="bg-gradient-to-r from-gold-300 to-gold-400 bg-clip-text text-transparent">
                recommending products
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-cream-100/80">
              Pick any product from the affiliate marketplace, share your unique
              link with your audience, and earn the creator-set commission on
              every referred sale — paid out in naira.
            </p>

            {cta && (
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href={cta.href}
                  className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-8 py-3.5 text-base font-semibold text-forest-900 shadow-lg transition-colors hover:bg-gold-300"
                >
                  {cta.label}
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/affiliate/marketplace"
                  className="inline-flex items-center rounded-full border border-white/20 px-8 py-3.5 text-base font-medium text-cream-50 transition-colors hover:bg-white/10"
                >
                  Browse the marketplace
                </Link>
              </div>
            )}
          </div>

          {statItems.length > 0 && (
            <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
              {statItems.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur">
                  <div className="font-display text-2xl font-bold text-gold-400">{s.value}</div>
                  <div className="mt-1 text-xs text-cream-100/70">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-gold-600">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            From sign-up to payout in three steps
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Apply',
              description:
                'Create a free account and submit a short affiliate application. Most applications are reviewed within a day.',
            },
            {
              step: '2',
              title: 'Share',
              description:
                'Pick products that fit your audience and generate a unique link for each one. Share it on socials, blogs, or newsletters.',
            },
            {
              step: '3',
              title: 'Earn',
              description:
                'Every purchase through your link earns the creator-set commission. Withdraw once you cross the minimum payout.',
            },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-600 font-display text-lg font-bold text-white">
                {item.step}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY / PROGRAM DETAILS */}
      <section className="border-y border-ink-100 bg-cream-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-gold-600">The fine print</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Program details, straight up
              </h2>
              <ul className="mt-8 space-y-4 text-ink-600">
                {[
                  'Commission is set per product by its creator — some products pay up to 50% of every referred sale.',
                  'A 30-day cookie credits you even if the buyer completes the purchase a few days after clicking.',
                  'A short holding period protects creators, then your commission becomes payable.',
                  'Payouts are made in naira, with a transparent dashboard tracking clicks, sales and earnings.',
                  'The buyer always pays the same price — your commission never inflates what they pay.',
                ].map((row) => (
                  <li key={row} className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm leading-relaxed">{row}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-center rounded-3xl bg-forest-800 p-8 text-cream-50">
              <AdinkraMark className="h-10 w-10 text-gold-400" />
              <h3 className="mt-4 font-display text-2xl font-bold text-white">
                Earn for what you already recommend
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-cream-100/80">
                Whether you run a YouTube channel, an X account, a newsletter or a
                WhatsApp community, the products you already love can start paying
                you back.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { v: `${maxRate}%`, l: 'top rate' },
                  { v: `${stats?.settings.cookieDays ?? 30}`, l: 'cookie days' },
                  { v: stats ? `₦${stats.settings.minPayout.toLocaleString()}` : '₦1,000', l: 'min payout' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-white/5 p-4 text-center">
                    <div className="font-display text-lg font-bold text-gold-400">{s.v}</div>
                    <div className="mt-0.5 text-[0.6875rem] text-cream-100/70">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gold-400/30 bg-gradient-to-br from-forest-800 to-forest-950 px-6 py-14 text-center text-cream-50">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to start earning?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-cream-100/80">
            Join thousands of creators and marketers making money from the digital
            products they already trust.
          </p>
          {cta && (
            <Link
              href={cta.href}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-400 px-8 py-3.5 text-base font-semibold text-forest-900 shadow-lg transition-colors hover:bg-gold-300"
            >
              {cta.label}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
