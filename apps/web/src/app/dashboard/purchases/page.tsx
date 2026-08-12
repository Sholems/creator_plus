'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';

export default function PurchasesPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, perPage: 20, total: 0, totalPages: 0 });
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token, pagination.page]);

  const loadOrders = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await api.getOrders(token, { page: pagination.page, perPage: pagination.perPage });
      setOrders(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const canRefund = (status: string) => ['PAID', 'FULFILLED', 'COMPLETED'].includes(status);

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !refundTarget) return;
    if (!refundReason.trim()) return;
    setSubmitting(true);
    setRefundMessage(null);
    try {
      await api.requestRefund(token, refundTarget.id, refundReason);
      setRefundMessage({ ok: true, text: 'Refund request submitted. Our support team will review it within 48 hours.' });
      setRefundTarget(null);
      setRefundReason('');
    } catch (err) {
      setRefundMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to submit refund request' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-700';
      case 'REFUNDED': return 'bg-red-100 text-red-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Purchases</h1>

      {refundMessage && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${refundMessage.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {refundMessage.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No purchases yet</h3>
              <p className="mt-1 text-sm text-gray-500">Start exploring our marketplace to find amazing digital products.</p>
              <div className="mt-6">
                <Link
                  href="/products"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Products
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-gray-900">
                          {order.invoiceNumber || order.id.slice(0, 8)}
                        </p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatNaira(order.totalAmount)}</p>
                      <p className="text-xs text-gray-500">{order.items?.length || 0} item(s)</p>
                      <div className="mt-1 flex items-center justify-end gap-3">
                        <Link href={`/orders/${order.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                          Track
                        </Link>
                        {canRefund(order.status) && (
                          <button
                            onClick={() => setRefundTarget(order)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Request refund
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.items.map((item: any) => (
                        <Link
                          key={item.id}
                          href={`/products/${item.product?.slug}`}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          <span>{item.product?.title || 'Product'}</span>
                          <span className="text-gray-400">&middot;</span>
                          <span className="text-gray-400 capitalize">{item.licenseType}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {['PAID', 'FULFILLED', 'COMPLETED'].includes(order.status) && (
                    <Link
                      href={`/products/${order.items?.[0]?.product?.slug}#reviews`}
                      className="mt-1 text-xs font-medium text-green-600 hover:text-green-700"
                    >
                      Leave a review
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRefundTarget(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">Request a refund</h2>
            <p className="mt-1 text-sm text-gray-500">
              Order {refundTarget.invoiceNumber || refundTarget.id.slice(0, 8)} · {formatNaira(refundTarget.totalAmount)}.
              Covered by our 30-day money-back guarantee.
            </p>
            <form onSubmit={submitRefund} className="mt-4">
              <label htmlFor="refund-reason" className="mb-1.5 block text-sm font-medium text-gray-700">
                Reason for refund
              </label>
              <textarea
                id="refund-reason"
                required
                rows={4}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Tell us what went wrong with this purchase…"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !refundReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
