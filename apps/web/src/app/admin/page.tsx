'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingProducts: number;
  pendingPayouts: number;
  pendingRefunds: number;
  pendingReviews: number;
  pendingVerifications: number;
  openFraudFlags: number;
  totalCreators: number;
  activeAffiliates: number;
  revenueTrend: { date: string; value: number }[];
  ordersTrend: { date: string; value: number }[];
  usersTrend: { date: string; value: number }[];
  recentOrders: any[];
  pendingProductList: any[];
}

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) loadStats();
  }, [token]);

  const loadStats = async () => {
    if (!token) return;
    try {
      const data = await api.adminGetStats(token);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin stats');
    } finally {
      setIsLoading(false);
    }
  };

  // Stat cards
  const statCards = stats
    ? [
        { label: 'Revenue (30d)', value: formatNaira(stats.totalRevenue || 0), color: 'forest' },
        { label: 'Orders (all)', value: String(stats.totalOrders || 0), color: 'forest' },
        { label: 'Users', value: String(stats.totalUsers || 0), color: 'forest' },
        { label: 'Creators', value: String(stats.totalCreators || 0), color: 'forest' },
        { label: 'Active Affiliates', value: String(stats.activeAffiliates || 0), color: 'forest' },
        { label: 'Products', value: String(stats.totalProducts || 0), color: 'forest' },
      ]
    : [];

  // Pending items
  const pendingItems = stats
    ? [
        { label: 'Products to review', count: stats.pendingProducts || 0, href: '/admin/products?status=PENDING', icon: '📦' },
        { label: 'Payout requests', count: stats.pendingPayouts || 0, href: '/admin/payouts?status=PENDING', icon: '💸' },
        { label: 'Refund requests', count: stats.pendingRefunds || 0, href: '/admin/refunds?status=PENDING', icon: '↩️' },
        { label: 'Reported reviews', count: stats.pendingReviews || 0, href: '/admin/reviews', icon: '⭐' },
        { label: 'Creator verifications', count: stats.pendingVerifications || 0, href: '/admin/creators', icon: '🎓' },
      ]
    : [];

  const hasPending = pendingItems.some((p) => p.count > 0);

  // 30-day sparkline helper
  const sparkline = (data: { date: string; value: number }[], color = 'bg-forest-400') => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
      <div className="flex h-8 items-end gap-px">
        {data.map((d, i) => (
          <div
            key={i}
            className={`${color} min-w-0 flex-1 rounded-t`}
            style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
            title={`${d.date}: ${d.value}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Platform Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Welcome back, {user?.displayName || 'Admin'}
          </p>
        </div>
        <button
          onClick={loadStats}
          className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-cream-100"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-cream-100" />
            ))
          : statCards.map((card) => (
              <div key={card.label} className="surface-card p-5">
                <p className="eyebrow text-ink-400">{card.label}</p>
                <p className="mt-2 font-display text-2xl font-bold text-ink-900">{card.value}</p>
              </div>
            ))}
      </div>

      {/* Pending items */}
      {hasPending && (
        <div className="mt-6 rounded-2xl border border-gold-200 bg-gold-50 p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Needs attention</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingItems
              .filter((p) => p.count > 0)
              .map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-gold-200 bg-white p-4 transition-colors hover:border-forest-300 hover:bg-cream-100"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{item.label}</p>
                    <p className="text-xs text-ink-500">{item.count} pending</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 font-display text-sm font-bold text-gold-700">
                    {item.count}
                  </span>
                </a>
              ))}
          </div>
        </div>
      )}

      {/* Trends */}
      {stats && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink-400">Revenue (30 days)</p>
              <p className="font-display text-xl font-bold text-forest-900">
                {formatNaira(stats.totalRevenue || 0)}
              </p>
            </div>
            {sparkline(stats.revenueTrend)}
          </div>
          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink-400">Orders (30 days)</p>
              <p className="font-display text-xl font-bold text-ink-900">
                {(stats.ordersTrend || []).reduce((s, d) => s + d.value, 0)}
              </p>
            </div>
            {sparkline(stats.ordersTrend, 'bg-gold-400')}
          </div>
          <div className="surface-card p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow text-ink-400">New users (30 days)</p>
              <p className="font-display text-xl font-bold text-ink-900">
                {(stats.usersTrend || []).reduce((s, d) => s + d.value, 0)}
              </p>
            </div>
            {sparkline(stats.usersTrend, 'bg-forest-300')}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Recent orders</h2>
            <a href="/admin/orders" className="text-sm font-medium text-forest-700 hover:text-forest-600">
              View all →
            </a>
          </div>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : !stats?.recentOrders?.length ? (
            <p className="mt-4 text-sm text-ink-500">No recent orders.</p>
          ) : (
            <div className="mt-4 divide-y divide-ink-100">
              {stats.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {order.invoiceNumber || order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {order.buyer?.displayName || order.buyer?.email || '—'} ·{' '}
                      {new Date(order.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-forest-900">
                    {formatNaira(order.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending products */}
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Pending products</h2>
            <a href="/admin/products?status=PENDING" className="text-sm font-medium text-forest-700 hover:text-forest-600">
              View all →
            </a>
          </div>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : !stats?.pendingProductList?.length ? (
            <p className="mt-4 text-sm text-ink-500">No pending products.</p>
          ) : (
            <div className="mt-4 divide-y divide-ink-100">
              {stats.pendingProductList.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{product.title}</p>
                    <p className="text-xs text-ink-500">
                      by {product.creator?.storeName || '—'} ·{' '}
                      {new Date(product.createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Quick actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { href: '/admin/products?status=PENDING', title: 'Review Products', desc: 'Approve or reject' },
            { href: '/admin/payouts?status=PENDING', title: 'Process Payouts', desc: 'Review requests' },
            { href: '/admin/support', title: 'Support Tickets', desc: 'Reply to users' },
            { href: '/admin/broadcasts', title: 'Send Broadcast', desc: 'Notify users' },
            { href: '/admin/settings/tracking', title: 'Tracking Setup', desc: 'Analytics & pixels' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href as any}
              className="rounded-xl border border-ink-100 p-4 transition-colors hover:border-forest-300 hover:bg-cream-100"
            >
              <p className="text-sm font-medium text-ink-900">{action.title}</p>
              <p className="mt-1 text-xs text-ink-500">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
