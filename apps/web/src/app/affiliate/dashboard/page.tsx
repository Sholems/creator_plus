'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNaira } from '@/lib/format';
import { useAffiliate } from '@/components/affiliate/affiliate-gate';

interface DashboardData {
  affiliate: { clicks: number; totalEarnings: number };
  totals: {
    clicks: number;
    grossSales: number;
    totalEarnings: number;
    conversions: number;
    byStatus: Record<string, { count: number; amount: number }>;
  };
  conversions: any[];
  payouts: any[];
  links: any[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAYABLE: 'Payable',
  PAID: 'Paid',
  REVERSED: 'Reversed',
};

export default function AffiliateDashboardPage() {
  const { token } = useAuth();
  const { me } = useAffiliate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .getAffiliateDashboard(token)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-cream-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center">
        <p className="text-sm text-ink-500">{error || 'Could not load your dashboard'}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total clicks', value: data.totals.clicks.toLocaleString() },
    { label: 'Gross referred sales', value: formatNaira(data.totals.grossSales) },
    { label: 'Total earnings', value: formatNaira(data.totals.totalEarnings) },
    { label: 'Conversions', value: String(data.totals.conversions) },
  ];

  const statusOrder = ['PENDING', 'APPROVED', 'PAYABLE', 'PAID', 'REVERSED'];
  const recentLinks = (data.links ?? []).slice(0, 5);
  const recentConversions = (data.conversions ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-gold-600">Affiliate dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          Welcome back, promoter 🎉
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Your referral code is{' '}
          <code className="rounded-md bg-cream-100 px-2 py-0.5 font-mono text-sm font-semibold text-forest-800">
            {me?.code}
          </code>
          .
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-5">
            <p className="eyebrow text-ink-400">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Earnings by status */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-ink-900">Earnings by status</h2>
          <div className="mt-4 space-y-3">
            {statusOrder
              .filter((s) => data.totals.byStatus?.[s])
              .map((s) => {
                const row = data.totals.byStatus[s];
                return (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <span className="text-ink-500">{STATUS_LABELS[s] ?? s}</span>
                    <span className="font-medium text-ink-900">{formatNaira(row.amount)}</span>
                  </div>
                );
              })}
            {!statusOrder.some((s) => data.totals.byStatus?.[s]) && (
              <p className="text-sm text-ink-400">No conversions yet.</p>
            )}
          </div>
          <Link
            href="/affiliate/earnings"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-600"
          >
            View earnings &amp; request payout →
          </Link>
        </div>

        {/* Recent conversions */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Recent conversions</h2>
            <Link href="/affiliate/analytics" className="text-sm font-semibold text-forest-700 hover:text-forest-600">
              View analytics →
            </Link>
          </div>
          {recentConversions.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-400">
              No conversions yet — share your links and watch them convert here.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="pb-2 pr-4 font-medium">Product</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Order</th>
                    <th className="pb-2 text-right font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversions.map((c) => {
                    const product = c.order?.items?.[0]?.product;
                    return (
                      <tr key={c.id} className="border-b border-ink-50">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            {product?.thumbnail && (
                              <img src={product.thumbnail} alt="" className="h-8 w-8 rounded-lg object-cover" />
                            )}
                            <span className="line-clamp-1 text-ink-900">
                              {product?.title ?? c.order?.invoiceNumber}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-ink-500">
                          {c.order?.invoiceNumber}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-forest-800">
                          {formatNaira(c.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent links */}
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Your links</h2>
          <Link href="/affiliate/marketplace" className="text-sm font-semibold text-forest-700 hover:text-forest-600">
            Generate a new link →
          </Link>
        </div>
        {recentLinks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">You haven&apos;t created any links yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {recentLinks.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{link.product?.title}</p>
                  <code className="truncate text-xs text-ink-400">{link.url}</code>
                </div>
                <span className="flex shrink-0 items-center gap-3 text-xs text-ink-500">
                  <span>{link.clickCount ?? 0} clicks</span>
                  <span className={link.status === 'ACTIVE' ? 'font-medium text-forest-700' : 'font-medium text-clay-600'}>
                    {link.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
