'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { formatNaira, formatDateTime } from '@/lib/format';
import { SearchBox } from '@/components/search-box';
import { Pagination } from '@/components/pagination';
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

const PER_PAGE = 20;

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getOrders(token, { status: status || undefined, search: search || undefined, page, perPage: PER_PAGE })
      .then((res) => {
        setOrders(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load orders', 'error'))
      .finally(() => setLoading(false));
  }, [token, status, search, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Sales</p>
          <h1 className="page-title mt-1">Orders</h1>
        </div>
        <span className="badge badge-gray">
          {pagination?.total ?? orders.length} order{pagination?.total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="surface-card-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All statuses</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search invoice, email, name…"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Invoice</th>
                <th className="th">Buyer</th>
                <th className="th">Items</th>
                <th className="th">Total</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No orders found</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="table-row-hover">
                    <td className="td price-tag text-ink-900">{o.invoiceNumber}</td>
                    <td className="td text-ink-600">{o.buyer?.displayName || o.buyer?.email || '—'}</td>
                    <td className="td text-ink-600">{o.items?.length ?? 0}</td>
                    <td className="td price-tag text-ink-900">{formatNaira(o.totalAmount)}</td>
                    <td className="td">
                      <span className={`badge ${STATUS_STYLES[o.status] || 'badge-gray'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="td text-ink-500">{formatDateTime(o.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={pagination?.totalPages ?? 1}
          total={pagination?.total ?? 0}
          perPage={PER_PAGE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
