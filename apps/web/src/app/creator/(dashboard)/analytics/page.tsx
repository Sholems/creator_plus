'use client';

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
    avgOrderValue: 0,
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    if (token) {
      loadAnalytics();
    }
  }, [token]);

  const loadAnalytics = async () => {
    if (!token) return;
    try {
      const [earnings, profile, salesData] = await Promise.all([
        api.getCreatorEarnings(token).catch(() => null),
        api.getCreatorProfile(token).catch(() => null),
        api.getCreatorSales(token, { perPage: 20 }).catch(() => ({ data: [], pagination: { total: 0 } })),
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
      const totalSales = salesData.paidTotal ?? (salesData.pagination?.total || 0);
      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      setAnalytics({
        totalViews,
        totalProducts: products.length,
        totalSales,
        totalRevenue,
        avgOrderValue,
      });

      const sorted = [...products]
        .sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 5);
      setTopProducts(sorted);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
        <CreatorEmptyState />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {isLoading ? '...' : analytics.totalViews.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Products</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {isLoading ? '...' : analytics.totalProducts}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Conversion</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {isLoading ? '...' : analytics.totalViews > 0
              ? `${((analytics.totalSales / analytics.totalViews) * 100).toFixed(1)}%`
              : '0%'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg. Order Value</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {isLoading ? '...' : formatNaira(analytics.avgOrderValue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Views</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-gray-500">No products yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                    <p className="text-xs text-gray-500">{product.category?.name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-medium text-gray-900">{product.viewCount || 0} views</p>
                    <p className="text-xs text-gray-500">{formatNaira(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-gray-500">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {order.invoiceNumber || order.id.slice(0, 8)}
                      {order.incomplete && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase text-amber-700">
                          Incomplete
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className={`text-sm font-semibold ${order.incomplete ? 'text-gray-400' : 'text-green-600'}`}>
                    {formatNaira(order.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
