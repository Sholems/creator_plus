'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark } from '@/components/brand/adinkra';

interface SaleItem {
  id: string;
  productName?: string;
  quantity: number;
  licenseType?: string;
  totalPrice: number;
  product?: { id: string; title: string; slug: string; thumbnail?: string | null };
}

interface Sale {
  id: string;
  invoiceNumber: string | null;
  status: string;
  isPaid: boolean;
  currency: string;
  createdAt: string;
  buyer?: { id: string; email: string; displayName: string | null } | null;
  payment?: { status: string; provider: string; paidAt: string | null } | null;
  items: SaleItem[];
  creatorSubtotal: number;
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  PAID: { label: 'Paid', classes: 'bg-forest-100 text-forest-700' },
  FULFILLED: { label: 'Delivered', classes: 'bg-forest-100 text-forest-700' },
  COMPLETED: { label: 'Completed', classes: 'bg-forest-100 text-forest-700' },
  PENDING: { label: 'Pending', classes: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'Processing', classes: 'bg-amber-100 text-amber-700' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-ink-100 text-ink-500' },
  REFUNDED: { label: 'Refunded', classes: 'bg-clay-100 text-clay-700' },
};

const PER_PAGE = 20;

export default function CreatorSalesPage() {
  const { token } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<{ ordersCount: number; unitsSold: number; grossRevenue: number } | null>(null);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getCreatorSales(token, { page, perPage: PER_PAGE });
      setSales(Array.isArray(res.data) ? res.data : []);
      setSummary(res.summary || null);
      setPagination(res.pagination || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div>
      <div>
        <p className="eyebrow text-gold-600">Creator studio</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Sales
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Every order that includes your products, with buyer details and the revenue from your items.
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>
      )}

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-forest-200 bg-forest-50 p-5">
          <p className="text-xs text-forest-600">Gross revenue (paid)</p>
          <p className="mt-1 font-display text-2xl font-bold text-forest-800">
            {summary ? formatNaira(summary.grossRevenue) : '—'}
          </p>
          <p className="mt-1 text-[0.6875rem] text-forest-600">From your items on completed orders</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <p className="text-xs text-ink-400">Units sold</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900">
            {summary ? summary.unitsSold.toLocaleString() : '—'}
          </p>
          <p className="mt-1 text-[0.6875rem] text-ink-400">Paid line items delivered</p>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5">
          <p className="text-xs text-ink-400">Total orders</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900">
            {summary ? summary.ordersCount.toLocaleString() : '—'}
          </p>
          <p className="mt-1 text-[0.6875rem] text-ink-400">Including pending checkouts</p>
        </div>
      </div>

      {/* Sales list */}
      <div className="surface-card mt-6">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="py-14 text-center">
              <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">No sales yet</h3>
              <p className="mt-1 text-sm text-ink-500">
                When someone buys one of your products, the order will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {sales.map((sale) => {
                const meta = STATUS_META[sale.status] || { label: sale.status, classes: 'bg-ink-100 text-ink-500' };
                const buyerName = sale.buyer?.displayName || sale.buyer?.email || 'Guest';
                return (
                  <div key={sale.id} className="py-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-ink-500">
                            {sale.invoiceNumber || `${sale.id.slice(0, 8)}…`}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.classes}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-ink-900">{buyerName}</p>
                        {sale.buyer?.email && sale.buyer?.displayName && (
                          <p className="text-xs text-ink-400">{sale.buyer.email}</p>
                        )}
                        <p className="mt-0.5 text-xs text-ink-400">
                          {new Date(sale.createdAt).toLocaleString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {sale.payment?.provider ? ` · ${sale.payment.provider}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-ink-400">Your revenue</p>
                        <p className="price-tag font-display text-lg font-bold text-forest-900">
                          {formatNaira(sale.creatorSubtotal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {sale.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-cream-50 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                              {item.product?.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.product.thumbnail}
                                  alt={item.product?.title || item.productName || ''}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              {item.product?.slug ? (
                                <Link
                                  href={`/products/${item.product.slug}`}
                                  className="truncate text-sm font-medium text-ink-900 hover:text-forest-700"
                                >
                                  {item.product?.title || item.productName}
                                </Link>
                              ) : (
                                <span className="truncate text-sm font-medium text-ink-900">
                                  {item.product?.title || item.productName}
                                </span>
                              )}
                              <p className="text-xs capitalize text-ink-400">
                                {(item.licenseType || 'personal').toLowerCase()} license · ×{item.quantity}
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 text-sm font-medium text-ink-900">{formatNaira(item.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-100 px-6 py-4">
            <p className="text-xs text-ink-400">
              Page {pagination?.page ?? page} of {totalPages} · {pagination?.total ?? sales.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(pagination?.page ?? page) <= 1}
                className="rounded-full border border-ink-100 px-4 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-cream-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={(pagination?.page ?? page) >= totalPages}
                className="rounded-full border border-ink-100 px-4 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-cream-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
