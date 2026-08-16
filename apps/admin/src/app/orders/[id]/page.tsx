'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira, formatDateTime } from '@/lib/format';
import { useToast } from '@/lib/toast';

const STATUS_STYLES: Record<string, string> = {
  PAID: 'badge-green',
  COMPLETED: 'badge-green',
  FULFILLED: 'badge-green',
  PENDING: 'badge-gold',
  PROCESSING: 'badge-blue',
  REFUNDED: 'badge-gold',
  CANCELLED: 'badge-red',
  FAILED: 'badge-red',
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const { token } = useAuth();
  const { toast } = useToast();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    api
      .getOrder(token, orderId)
      .then(setOrder)
      .catch((e) => toast(e.message || 'Failed to load order', 'error'))
      .finally(() => setLoading(false));
  }, [token, orderId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReminder = async () => {
    setSendingReminder(true);
    try {
      await api.sendOrderReminder(token!, orderId);
      toast('Payment reminder sent', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to send reminder', 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return <div className="td py-10 text-center text-ink-500">Loading…</div>;
  }

  if (!order) {
    return <div className="td py-10 text-center text-ink-500">Order not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/orders" className="text-sm text-ink-500 hover:text-ink-700">
          ← Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{order.invoiceNumber}</h1>
          {order.incomplete ? (
            <span className="badge badge-gold">INCOMPLETE</span>
          ) : (
            <span className={`badge ${STATUS_STYLES[order.status] || 'badge-gray'}`}>{order.status}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order info */}
        <div className="surface-card p-6">
          <h2 className="eyebrow text-ink-400">Order</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Status</dt><dd className="font-medium text-ink-900">{order.status}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Total</dt><dd className="price-tag font-bold text-ink-900">{formatNaira(order.totalAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Created</dt><dd className="text-ink-900">{formatDateTime(order.createdAt)}</dd></div>
            {order.payment && (
              <>
                <div className="flex justify-between"><dt className="text-ink-500">Payment</dt><dd className="font-medium text-ink-900">{order.payment.provider || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">Payment status</dt><dd className="font-medium text-ink-900">{order.payment.status}</dd></div>
              </>
            )}
          </dl>
        </div>

        {/* Buyer */}
        <div className="surface-card p-6">
          <h2 className="eyebrow text-ink-400">Buyer</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Name</dt><dd className="text-ink-900">{order.buyer?.displayName || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Email</dt><dd className="text-ink-900">{order.buyer?.email || '—'}</dd></div>
          </dl>
        </div>

        {/* Actions */}
        {order.incomplete && (
          <div className="surface-card p-6">
            <h2 className="eyebrow text-ink-400">Follow-up</h2>
            <p className="mt-3 text-sm text-ink-600">This order was never paid. Send a reminder to the buyer to complete checkout.</p>
            <button
              onClick={handleReminder}
              disabled={sendingReminder}
              className="mt-4 btn-gold w-full text-sm"
            >
              {sendingReminder ? 'Sending…' : 'Send payment reminder'}
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="surface-card mt-6 overflow-hidden">
        <div className="surface-card-header">
          <h2 className="eyebrow text-ink-400">Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Product</th>
                <th className="th">License</th>
                <th className="th">Qty</th>
                <th className="th">Unit Price</th>
                <th className="th">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(order.items || []).map((item: any) => (
                <tr key={item.id} className="table-row-hover">
                  <td className="td text-ink-900">{item.product?.title || item.productName}</td>
                  <td className="td text-ink-600 capitalize">{item.licenseType?.toLowerCase()}</td>
                  <td className="td text-ink-600">{item.quantity}</td>
                  <td className="td price-tag text-ink-900">{formatNaira(item.unitPrice)}</td>
                  <td className="td price-tag text-ink-900">{formatNaira(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
