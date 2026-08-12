'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNaira } from '@/lib/format';

interface DashboardData {
  affiliate: { clicks: number; totalEarnings: number };
  totals: { clicks: number; grossSales: number; totalEarnings: number; conversions: number };
  links: any[];
}

interface LinkStat {
  link: any;
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
}

export default function AffiliateAnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [dash, conv] = await Promise.all([
          api.getAffiliateDashboard(token),
          api.getAffiliateConversions(token, { perPage: 100 }),
        ]);
        setData(dash);
        setConversions(conv.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
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
        <p className="text-sm text-ink-500">{error || 'Could not load analytics'}</p>
      </div>
    );
  }

  const byLink: Record<string, LinkStat> = {};
  for (const link of data.links ?? []) {
    byLink[link.id] = { link, clicks: link.clickCount ?? 0, conversions: 0, revenue: 0, commission: 0 };
  }
  for (const c of conversions) {
    const entry = c.link?.id ? byLink[c.link.id] : undefined;
    if (!entry) continue;
    entry.conversions += 1;
    entry.revenue += Number(c.orderAmount ?? 0);
    entry.commission += Number(c.amount ?? 0);
  }
  const linkStats = Object.values(byLink).sort((a, b) => b.clicks - a.clicks);
  const totalRevenue = linkStats.reduce((sum, s) => sum + s.revenue, 0);

  const stats = [
    { label: 'Total clicks', value: data.totals.clicks.toLocaleString() },
    { label: 'Gross referred sales', value: formatNaira(totalRevenue) },
    { label: 'Total earnings', value: formatNaira(data.totals.totalEarnings) },
    { label: 'Conversion rate', value: data.totals.clicks > 0 ? `${((data.totals.conversions / data.totals.clicks) * 100).toFixed(2)}%` : '—' },
  ];

  return (
    <div>
      <p className="eyebrow text-gold-600">Analytics</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
        Your performance
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Clicks, conversions and commission across every link you&apos;ve generated.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-5">
            <p className="eyebrow text-ink-400">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        {linkStats.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-400">
            No links yet — generate links in the marketplace to start tracking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-cream-50 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 text-right font-medium">Clicks</th>
                  <th className="px-5 py-3 text-right font-medium">Sales</th>
                  <th className="px-5 py-3 text-right font-medium">Revenue</th>
                  <th className="px-5 py-3 text-right font-medium">Commission</th>
                  <th className="px-5 py-3 text-right font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {linkStats.map((s) => (
                  <tr key={s.link.id} className="border-b border-ink-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {s.link.product?.thumbnail && (
                          <img src={s.link.product.thumbnail} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        )}
                        <span className="line-clamp-1 font-medium text-ink-900">
                          {s.link.product?.title ?? s.link.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-700">{s.clicks}</td>
                    <td className="px-5 py-3 text-right text-ink-700">{s.conversions}</td>
                    <td className="px-5 py-3 text-right text-ink-700">{formatNaira(s.revenue)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-forest-800">
                      {formatNaira(s.commission)}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-500">
                      {s.clicks > 0 ? `${((s.conversions / s.clicks) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
