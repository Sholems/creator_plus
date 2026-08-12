'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@creatormarket/ui';

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href: Route;
  cta: string;
}

export function LaunchChecklist() {
  const { token } = useAuth();
  const [items, setItems] = useState<ChecklistItem[] | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const profile = await api.getCreatorProfile(token).catch(() => null);
        if (!profile) {
          setItems([]);
          return;
        }

        const [productData, coupons] = await Promise.all([
          api.getProducts({ creatorId: profile.id, perPage: 100 }, token).catch(() => ({ data: [] })),
          api.getMyCoupons(token).catch(() => []),
        ]);
        const products = productData.data || [];
        const published = products.filter((p: any) => p.status === 'PUBLISHED');
        const hasArtwork = products.some((p: any) => !!p.thumbnail);
        const hasBank = Array.isArray(profile.bankAccounts) && profile.bankAccounts.length > 0;

        setItems([
          {
            key: 'profile',
            label: 'Complete your store profile (name, bio, avatar)',
            done: !!profile.storeName && !!profile.bio && !!profile.avatar,
            href: '/creator/store',
            cta: 'Update store',
          },
          {
            key: 'verified',
            label: 'Verify your creator identity',
            done: !!profile.verified,
            href: '/creator/store',
            cta: 'Get verified',
          },
          {
            key: 'bank',
            label: 'Add a payout bank account',
            done: hasBank,
            href: '/creator/earnings',
            cta: 'Set up payouts',
          },
          {
            key: 'listed',
            label: 'List your first product',
            done: products.length > 0,
            href: '/creator/products/new',
            cta: 'Add product',
          },
          {
            key: 'published',
            label: 'Publish a product for sale',
            done: published.length > 0,
            href: '/creator/products',
            cta: 'Publish',
          },
          {
            key: 'artwork',
            label: 'Add artwork to your product',
            done: hasArtwork,
            href: '/creator/products',
            cta: 'Add artwork',
          },
          {
            key: 'coupon',
            label: 'Create a launch coupon',
            done: Array.isArray(coupons) && coupons.length > 0,
            href: '/creator/coupons',
            cta: 'Create coupon',
          },
        ]);
      } catch {
        setItems([]);
      }
    })();
  }, [token]);

  if (!items) return null;

  const done = items.filter((i) => i.done).length;
  const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
  const allDone = items.length > 0 && done === items.length;

  if (items.length === 0) return null;

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">Launch checklist</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {allDone
              ? 'Your store is ready for launch. Nice work!'
              : `${done} of ${items.length} steps complete before you launch.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-cream-100">
            <div className="h-full rounded-full bg-forest-700 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-display text-sm font-bold text-forest-800">{pct}%</span>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                item.done
                  ? 'border-forest-200 bg-forest-50/60 hover:border-forest-300'
                  : 'border-ink-100 bg-white hover:border-forest-300 hover:bg-cream-100',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  item.done ? 'bg-forest-700 text-cream-50' : 'border-2 border-ink-200 text-ink-300',
                )}
              >
                {item.done ? '✓' : '•'}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm', item.done ? 'text-ink-500' : 'font-medium text-ink-900')}>
                  {item.label}
                </span>
                {!item.done && (
                  <span className="text-xs font-medium text-forest-700">{item.cta} →</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
