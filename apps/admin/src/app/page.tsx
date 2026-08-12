'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api, AdminStats } from '@/lib/api';
import { formatNaira, formatCompact, formatDate } from '@/lib/format';
import { StatCard } from '@/components/stat-card';
import { TrendAreaChart, TrendBarChart } from '@/components/charts';
import { useToast } from '@/lib/toast';

function Icon({ name }: { name: string }) {
  const common = { className: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 } as const;
  switch (name) {
    case 'currency':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      );
    case 'orders':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.6-6.2 4.6 2.4-7.6L2 9.6h7.6z" />
        </svg>
      );
    case 'refund':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14l-4-4 4-4M5 10h11a4 4 0 010 8h-1" />
        </svg>
      );
    case 'payout':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case 'affiliate':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    default:
      return null;
  }
}

function sum(values: { value: number }[]) {
  return values.reduce((acc, v) => acc + (v.value || 0), 0);
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getStats(token)
      .then(setStats)
      .catch((e) => toast(e.message || 'Failed to load stats', 'error'))
      .finally(() => setLoading(false));
  }, [token, refreshKey, toast]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await api.approveProduct(token, id);
      setStats((prev) => prev && { ...prev, pendingProductList: prev.pendingProductList.filter((p) => p.id !== id), pendingProducts: Math.max(0, prev.pendingProducts - 1) });
      toast('Product approved');
    } catch (e: any) {
      toast(e.message || 'Failed to approve product', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    const reason = window.prompt('Reason for rejection (sent to creator):') || undefined;
    setBusyId(id);
    try {
      await api.rejectProduct(token, id, reason);
      setStats((prev) => prev && { ...prev, pendingProductList: prev.pendingProductList.filter((p) => p.id !== id), pendingProducts: Math.max(0, prev.pendingProducts - 1) });
      toast('Product rejected');
    } catch (e: any) {
      toast(e.message || 'Failed to reject product', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const lastValue = useCallback(
    (trend?: { date: string; value: number }[]) => (trend && trend.length ? trend[trend.length - 1].value : 0),
    [],
  );

  const cards: {
    label: string;
    value: string;
    icon: string;
    tone: 'gold' | 'forest' | 'clay' | 'cream';
    href: string;
    sublabel?: string;
  }[] = [
    { label: 'Total Revenue', value: loading ? '…' : formatNaira(stats?.totalRevenue), icon: 'currency', tone: 'gold', href: '/orders', sublabel: loading ? undefined : `Last 30d ${formatCompact(sum(stats?.revenueTrend ?? []))}` },
    { label: 'Total Users', value: loading ? '…' : (stats?.totalUsers ?? 0).toLocaleString(), icon: 'users', tone: 'forest', href: '/users', sublabel: loading ? undefined : `${stats?.totalCreators ?? 0} creators` },
    { label: 'Total Products', value: loading ? '…' : (stats?.totalProducts ?? 0).toLocaleString(), icon: 'box', tone: 'clay', href: '/products', sublabel: loading ? undefined : `${stats?.pendingProducts ?? 0} pending approval` },
    { label: 'Total Orders', value: loading ? '…' : (stats?.totalOrders ?? 0).toLocaleString(), icon: 'orders', tone: 'cream', href: '/orders', sublabel: loading ? undefined : `Last 30d ${sum(stats?.orderTrend ?? [])}` },
    { label: 'Pending Reviews', value: loading ? '…' : (stats?.pendingReviews ?? 0).toLocaleString(), icon: 'star', tone: 'gold', href: '/reviews', sublabel: 'Awaiting moderation' },
    { label: 'Pending Refunds', value: loading ? '…' : (stats?.pendingRefunds ?? 0).toLocaleString(), icon: 'refund', tone: 'clay', href: '/refunds', sublabel: `${stats?.openFraudFlags ?? 0} fraud flags` },
    { label: 'Pending Payouts', value: loading ? '…' : (stats?.pendingPayouts ?? 0).toLocaleString(), icon: 'payout', tone: 'forest', href: '/payouts', sublabel: `${stats?.pendingVerifications ?? 0} creator verifications` },
    { label: 'Affiliate Apps', value: loading ? '…' : (stats?.pendingAffiliates ?? 0).toLocaleString(), icon: 'affiliate', tone: 'cream', href: '/affiliates', sublabel: `${stats?.activeAffiliates ?? 0} active` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Overview</p>
          <h1 className="page-title mt-1">Platform Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-500">
            {stats ? `Updated ${formatDate(new Date().toISOString(), { time: true })}` : ''}
          </span>
          <button onClick={() => setRefreshKey((k) => k + 1)} className="btn btn-ghost btn-sm" disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} icon={<Icon name={c.icon} />} />
        ))}
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="surface-card lg:col-span-2">
          <div className="surface-card-header flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-ink-900">Revenue — Last 30 days</h2>
            <Link href="/orders" className="text-xs font-medium text-gold-600 hover:text-gold-700">
              View orders →
            </Link>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="py-12 text-center text-sm text-ink-500">Loading…</p>
            ) : stats?.revenueTrend?.length ? (
              <TrendAreaChart data={stats.revenueTrend} color="#cda434" formatValue={(v) => formatCompact(v)} />
            ) : (
              <p className="py-12 text-center text-sm text-ink-500">No revenue data</p>
            )}
          </div>
        </div>

        <div className="surface-card">
          <div className="surface-card-header">
            <h2 className="font-display text-base font-semibold text-ink-900">Orders — Last 30 days</h2>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="py-12 text-center text-sm text-ink-500">Loading…</p>
            ) : stats?.orderTrend?.length ? (
              <TrendBarChart data={stats.orderTrend} color="#0a2e22" />
            ) : (
              <p className="py-12 text-center text-sm text-ink-500">No order data</p>
            )}
          </div>
        </div>
      </div>

      {/* New users + recent orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card">
          <div className="surface-card-header">
            <h2 className="font-display text-base font-semibold text-ink-900">New Users — Last 30 days</h2>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="py-12 text-center text-sm text-ink-500">Loading…</p>
            ) : stats?.userTrend?.length ? (
              <TrendAreaChart data={stats.userTrend} color="#6b7d74" formatValue={(v) => Math.round(v).toString()} />
            ) : (
              <p className="py-12 text-center text-sm text-ink-500">No user data</p>
            )}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="surface-card-header flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs font-medium text-gold-600 hover:text-gold-700">
              All orders →
            </Link>
          </div>
          <div className="divide-y divide-ink-100">
            {loading ? (
              <p className="p-6 text-sm text-ink-500">Loading…</p>
            ) : stats?.recentOrders?.length ? (
              stats.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="price-tag text-sm text-ink-900">{o.invoiceNumber}</p>
                    <p className="text-xs text-ink-500">
                      {o.buyer?.displayName || o.buyer?.email} · {o.items?.length || 0} item(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="price-tag text-sm text-ink-900">{formatNaira(o.totalAmount)}</p>
                    <span className="badge badge-gray">{o.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-6 text-sm text-ink-500">No orders yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending products */}
      <div className="surface-card overflow-hidden">
        <div className="surface-card-header flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-ink-900">
            Pending Products ({loading ? '…' : stats?.pendingProducts ?? 0})
          </h2>
          <Link href="/products?status=pending" className="text-xs font-medium text-gold-600 hover:text-gold-700">
            Review queue →
          </Link>
        </div>
        <div className="divide-y divide-ink-100">
          {loading ? (
            <p className="p-6 text-sm text-ink-500">Loading…</p>
          ) : stats?.pendingProductList?.length ? (
            stats.pendingProductList.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{p.title}</p>
                  <p className="text-xs text-ink-500">{p.creator?.storeName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="price-tag text-sm text-ink-900">{formatNaira(p.price)}</p>
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={busyId === p.id}
                    className="btn btn-primary btn-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(p.id)}
                    disabled={busyId === p.id}
                    className="btn btn-danger btn-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-sm text-ink-500">No pending products</p>
          )}
        </div>
      </div>
    </div>
  );
}
