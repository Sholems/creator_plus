'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { cn } from '@creatormarket/ui';

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-forest-100 text-forest-700',
  PENDING: 'bg-gold-100 text-gold-700',
  FAILED: 'bg-clay-100 text-clay-700',
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSpent: 0,
    totalDownloads: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) loadDashboard();
  }, [token]);

  const loadDashboard = async () => {
    if (!token) return;
    try {
      const [ordersData, downloadsData] = await Promise.all([
        api.getOrders(token, { perPage: 5 }),
        api.getDownloads(token, { perPage: 100 }).catch(() => ({ data: [], pagination: { total: 0 } })),
      ]);

      const orders = ordersData.data || [];
      const totalSpent = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

      setStats({
        totalPurchases: ordersData.pagination?.total || 0,
        totalSpent,
        totalDownloads: downloadsData.pagination?.total || 0,
      });
      setRecentOrders(orders);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const cards: { label: string; value: string; href?: Route; cta?: string }[] = [
    {
      label: 'Total Purchases',
      value: isLoading ? '…' : String(stats.totalPurchases),
      href: '/dashboard/purchases',
      cta: 'View all purchases',
    },
    {
      label: 'Total Spent',
      value: isLoading ? '…' : formatNaira(stats.totalSpent),
    },
    {
      label: 'Total Downloads',
      value: isLoading ? '…' : String(stats.totalDownloads),
      href: '/dashboard/downloads',
      cta: 'View downloads',
    },
  ];

  return (
    <div>
      <p className="eyebrow text-gold-600">My account</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
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

      <div className="surface-card mt-8 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Recent activity</h2>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-cream-100" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-ink-200 p-8 text-center">
            <p className="text-sm text-ink-500">No recent activity yet.</p>
            <Link href="/products" className="mt-2 inline-block text-sm font-medium text-forest-700 hover:underline">
              Browse the market →
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-ink-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    Order {order.invoiceNumber || order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {order.items?.length || 0} item(s) ·{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="price-tag text-sm font-bold text-ink-900">{formatNaira(order.totalAmount)}</p>
                  <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase', STATUS_STYLES[order.status] || 'bg-cream-100 text-ink-500')}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
