'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark } from '@/components/brand/adinkra';
import { CreatorEmptyState } from '@/components/market/creator-empty-state';
import { LaunchChecklist } from '@/components/market/launch-checklist';

export default function CreatorDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingPayout: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  const loadDashboard = async () => {
    if (!token) return;
    try {
      const profile = await api.getCreatorProfile(token).catch(() => null);

      if (!profile) {
        setNoProfile(true);
        setRecentOrders([]);
        setStats({ totalProducts: 0, totalSales: 0, totalRevenue: 0, pendingPayout: 0 });
        setIsLoading(false);
        return;
      }

      setStoreSlug(profile.slug || '');

      const [earnings, ordersData] = await Promise.all([
        api.getCreatorEarnings(token).catch(() => ({ totalEarnings: 0, pendingPayout: 0 })),
        api.getCreatorSales(token, { perPage: 5 }).catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);

      const productData = await api
        .getProducts({ creatorId: profile.id, perPage: 100, status: 'PUBLISHED' })
        .catch(() => ({ data: [] }));

      setStats({
        totalProducts: (productData.data || []).length,
        totalSales: ordersData.paidTotal ?? (ordersData.pagination?.total || 0),
        totalRevenue: earnings.totalEarnings || 0,
        pendingPayout: earnings.pendingPayout || 0,
      });
      setRecentOrders(ordersData.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const cards: { label: string; value: string; href?: Route; cta?: string }[] = [
    { label: 'Total Products', value: isLoading ? '…' : String(stats.totalProducts), href: '/creator/products', cta: 'Manage products' },
    { label: 'Total Sales', value: isLoading ? '…' : String(stats.totalSales) },
    { label: 'Total Revenue', value: isLoading ? '…' : formatNaira(stats.totalRevenue), href: '/creator/earnings', cta: 'View earnings' },
    { label: 'Pending Payout', value: isLoading ? '…' : formatNaira(stats.pendingPayout) },
  ];

  const quickActions: { href: string; title: string; desc: string }[] = [
    { href: '/creator/products/new', title: 'Create New Product', desc: 'List a new digital product for sale' },
    { href: '/creator/coupons', title: 'Create a Coupon', desc: 'Reward buyers with discount codes' },
    { href: '/creator/store', title: 'Update Store Settings', desc: 'Edit your store name, bio, and logo' },
    { href: '/creator/analytics', title: 'View Analytics', desc: 'Track views, sales and conversions' },
    ...(storeSlug
      ? [{ href: `/creator/${storeSlug}`, title: 'View Your Store', desc: 'See your public storefront' }]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Creator studio</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Creator Dashboard</h1>
        </div>
        {!noProfile && (
          <Link
            href="/creator/products/new"
            className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700"
          >
            + Add New Product
          </Link>
        )}
      </div>

      {noProfile ? (
        <div className="mt-6">
          <CreatorEmptyState />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <LaunchChecklist />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="surface-card p-6">
            <p className="eyebrow text-ink-400">{card.label}</p>
            <p className="price-tag mt-2 text-3xl font-bold text-forest-900">{card.value}</p>
            {card.href && (
              <Link href={card.href} className="mt-2 inline-block text-sm font-medium text-forest-700 hover:text-forest-600">
                {card.cta} →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Recent sales</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-ink-200 p-8 text-center">
              <AdinkraMark className="mx-auto h-8 w-8 text-ink-200" />
              <p className="mt-2 text-sm text-ink-500">No sales yet.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-ink-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {order.invoiceNumber || order.id.slice(0, 8)}
                      {order.incomplete && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase text-amber-700">
                          Payment incomplete
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      {new Date(order.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p className={`price-tag text-sm font-bold ${order.incomplete ? 'text-ink-400' : 'text-forest-900'}`}>
                    {formatNaira(order.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Quick actions</h2>
          <div className="mt-4 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href as Route}
                className="block rounded-xl border border-ink-100 p-4 transition-colors hover:border-forest-300 hover:bg-cream-100"
              >
                <p className="text-sm font-medium text-ink-900">{action.title}</p>
                <p className="mt-1 text-xs text-ink-500">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
