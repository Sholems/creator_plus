'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'badge-gold',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  COMPLETED: 'badge-green',
};

const PER_PAGE = 20;

export default function AdminRefundsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getRefunds(token, { status: status || undefined, page, perPage: PER_PAGE })
      .then((res) => {
        setRefunds(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load refunds', 'error'))
      .finally(() => setLoading(false));
  }, [token, status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Approve this refund? The payment will be refunded and the order marked refunded.')) return;
    setBusyId(id);
    try {
      await api.approveRefund(token, id);
      setRefunds((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r)));
      toast('Refund approved');
    } catch (e: any) {
      toast(e.message || 'Failed to approve refund', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Reject this refund request?')) return;
    setBusyId(id);
    try {
      await api.rejectRefund(token, id);
      setRefunds((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'REJECTED' } : r)));
      toast('Refund rejected');
    } catch (e: any) {
      toast(e.message || 'Failed to reject refund', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = pagination?.total && status === '' ? refunds.filter((r) => r.status === 'PENDING').length : undefined;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Support</p>
          <h1 className="page-title mt-1">Refund Requests</h1>
        </div>
        <span className="badge badge-gold">
          {pagination?.total ?? refunds.length} request{pagination?.total === 1 ? '' : 's'}
          {pendingCount ? ` · ${pendingCount} pending` : ''}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="surface-card-header flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="input w-auto"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Order</th>
                <th className="th">Buyer</th>
                <th className="th">Amount</th>
                <th className="th">Reason</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : refunds.length === 0 ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No refund requests</td></tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.id} className="align-top table-row-hover">
                    <td className="td price-tag text-ink-900">
                      {r.order?.invoiceNumber || r.orderId?.slice(0, 8)}
                    </td>
                    <td className="td text-ink-600">
                      {r.order?.buyer?.displayName || r.order?.buyer?.email || '—'}
                    </td>
                    <td className="td price-tag text-ink-900">
                      {formatNaira(r.amount ?? r.order?.totalAmount)}
                    </td>
                    <td className="td max-w-xs text-ink-600">{r.reason}</td>
                    <td className="td">
                      <span className={`badge ${STATUS_STYLES[r.status] || 'badge-gray'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={busyId === r.id}
                              className="btn btn-primary btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(r.id)}
                              disabled={busyId === r.id}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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
