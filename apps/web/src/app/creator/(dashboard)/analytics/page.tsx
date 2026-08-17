'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { CreatorEmptyState } from '@/components/market/creator-empty-state';

export default function CreatorAnalyticsPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    netRevenue: 0,
    avgOrderValue: 0,
    conversionRate: 0,
  });
  const [topByViews, setTopByViews] = useState<any[]>([]);
  const [topByRevenue, setTopByRevenue] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    if (token) loadAnalytics();
  }, [token]);

  const loadAnalytics = async () => {
    if (!token) return;
    try {
      const [earnings, profile, salesData] = await Promise.all([
        api.getCreatorEarnings(token).catch(() => null),
        api.getCreatorProfile(token).catch(() => null),
        api.getCreatorSales(token, { perPage: 50 }).catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);

      if (!profile || !earnings) {
        setNoProfile(true);
        return;
      }

      const creatorId = profile.id;
      let products: any[] = [];
      let totalViews = 0;
      if (creatorId) {
        const productData = await api.getProducts({ creatorId, perPage: 100 }, token).catch(() => ({ data: [] }));
        products = productData.data || [];
        totalViews = products.reduce((sum: number, p: any) => sum + (p.viewCount || 0), 0);
      }

      const orders = salesData.data || [];
      const totalRevenue = earnings.totalEarnings || 0;
      const netRevenue = earnings.netEarnings || totalRevenue * 0.9;
      const totalSales = salesData.paidTotal ?? (salesData.pagination?.total || 0);
      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
      const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

      setAnalytics({
        totalViews,
        totalProducts: products.length,
        totalSales,
        totalRevenue,
        netRevenue,
        avgOrderValue,
        conversionRate,
      });

      // Top by views
      const byViews = [...products]
        .sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5);
      setTopByViews(byViews);

      // Top by revenue (sales count * price)
      const byRevenue = [...products]
        .map((p: any) => ({
          ...p,
          estimatedRevenue: (p._count?.orderItems || p.salesCount || 0) * Number(p.price || 0),
        }))
        .sort((a: any, b: any) => b.estimatedRevenue - a.estimatedRevenue)
        .slice(0, 5);
      setTopByRevenue(byRevenue);

      setRecentOrders(orders.slice(0, 10));
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (noProfile) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Analytics</h1>
        <CreatorEmptyState />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-gold-600">Performance</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900">Analytics</h1>
        </div>
        <Link
          href="/creator/analytics"
          className="text-sm font-medium text-forest-700 hover:text-forest-600"
        >
          Refresh →
        </Link>
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="surface-card p-5">
          <p className="eyebrow text-ink-400">Total Views</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {isLoading ? '…' : analytics.totalViews.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-ink-400">across {analytics.totalProducts} products</p>
        </div>
        <div className="surface-card p-5">
          <p className="eyebrow text-ink-400">Conversion Rate</p>
          <p className="mt-2 font-display text-2xl font-bold text-forest-900">
            {isLoading ? '…' : `${analytics.conversionRate.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-ink-400">views → sales</p>
        </div>
        <div className="surface-card p-5">
          <p className="eyebrow text-ink-400">Total Sales</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {isLoading ? '…' : analytics.totalSales}
          </p>
          <p className="mt-1 text-xs text-ink-400">completed orders</p>
        </div>
        <div className="surface-card p-5">
          <p className="eyebrow text-ink-400">Avg. Order Value</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-900">
            {isLoading ? '…' : formatNaira(analytics.avgOrderValue)}
          </p>
          <p className="mt-1 text-xs text-ink-400">per transaction</p>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="mt-6 surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Revenue overview</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-ink-500">Gross revenue</p>
            <p className="mt-1 font-display text-xl font-bold text-ink-900">
              {isLoading ? '…' : formatNaira(analytics.totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-500">Platform fee (10%)</p>
            <p className="mt-1 font-display text-xl font-bold text-clay-600">
              {isLoading ? '…' : `−${formatNaira(analytics.totalRevenue - analytics.netRevenue)}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-ink-500">You keep</p>
            <p className="mt-1 font-display text-xl font-bold text-forest-700">
              {isLoading ? '…' : formatNaira(analytics.netRevenue)}
            </p>
          </div>
        </div>
        {/* Visual bar */}
        {!isLoading && analytics.totalRevenue > 0 && (
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded-full bg-cream-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-forest-600 to-forest-500 transition-all duration-500"
                style={{ width: `${Math.min((analytics.netRevenue / analytics.totalRevenue) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-right text-xs text-ink-400">
              You keep {analytics.totalRevenue > 0 ? ((analytics.netRevenue / analytics.totalRevenue) * 100).toFixed(0) : 0}% of revenue
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top products by revenue */}
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Top products by revenue</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : topByRevenue.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No products yet</p>
          ) : (
            <div className="mt-4 divide-y divide-ink-100">
              {topByRevenue.map((product, i) => {
                const sales = product._count?.orderItems || product.salesCount || 0;
                return (
                  <div key={product.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-100 font-mono text-xs font-bold text-ink-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{product.title}</p>
                      <p className="text-xs text-ink-500">
                        {sales} sale{sales !== 1 ? 's' : ''} · {product.category?.name || '—'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-forest-900">
                      {formatNaira(product.estimatedRevenue)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products by views */}
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Top products by views</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : topByViews.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No products yet</p>
          ) : (
            <div className="mt-4 divide-y divide-ink-100">
              {topByViews.map((product, i) => (
                <div key={product.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-100 font-mono text-xs font-bold text-ink-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{product.title}</p>
                    <p className="text-xs text-ink-500">
                      {product.category?.name || '—'} · {formatNaira(product.price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink-700">
                    {(product.viewCount || 0).toLocaleString()} views
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="mt-6 surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Recent orders</h2>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-100" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No orders yet</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs text-ink-400">
                  <th className="pb-2 font-medium">Order</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-2.5 font-medium text-ink-900">
                      {order.invoiceNumber || order.id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 text-ink-500">
                      {new Date(order.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5">
                      {order.incomplete ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-semibold text-amber-700">
                          Incomplete
                        </span>
                      ) : (
                        <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[0.625rem] font-semibold text-forest-700">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 text-right font-semibold ${order.incomplete ? 'text-ink-400' : 'text-forest-900'}`}>
                      {formatNaira(order.totalAmount)}
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
