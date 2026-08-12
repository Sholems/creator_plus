'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { formatNaira, formatDate } from '@/lib/format';
import { SearchBox } from '@/components/search-box';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'badge-green',
  PROCESSING: 'badge-blue',
  APPROVED: 'badge-green',
  PENDING: 'badge-gold',
  REJECTED: 'badge-red',
  FAILED: 'badge-red',
};

const PER_PAGE = 20;

export default function AdminPayoutsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getPayouts(token, { status: status || undefined, search: search || undefined, page, perPage: PER_PAGE })
      .then((res) => {
        setPayouts(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load payouts', 'error'))
      .finally(() => setLoading(false));
  }, [token, status, search, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Approve this payout? Funds will be scheduled for payment.')) return;
    setBusyId(id);
    try {
      await api.approvePayout(token, id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'APPROVED' } : p)));
      toast('Payout approved');
    } catch (e: any) {
      toast(e.message || 'Failed to approve payout', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Reject this payout request?')) return;
    setBusyId(id);
    try {
      await api.rejectPayout(token, id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'REJECTED' } : p)));
      toast('Payout rejected');
    } catch (e: any) {
      toast(e.message || 'Failed to reject payout', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Mark this payout as paid/complete?')) return;
    setBusyId(id);
    try {
      await api.completePayout(token, id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'COMPLETED', paidAt: new Date().toISOString() } : p)));
      toast('Payout marked complete');
    } catch (e: any) {
      toast(e.message || 'Failed to complete payout', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const totals = useMemo(() => {
    const sum = (statuses: string[]) =>
      payouts
        .filter((p) => statuses.includes(p.status))
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return {
      pending: sum(['PENDING', 'APPROVED']),
      processing: sum(['PROCESSING']),
      completed: sum(['COMPLETED']),
    };
  }, [payouts]);

  const cards = [
    { label: 'Pending Payouts', value: totals.pending, chip: 'bg-gold-100 text-gold-700' },
    { label: 'Processing', value: totals.processing, chip: 'bg-clay-100 text-clay-700' },
    { label: 'Completed', value: totals.completed, chip: 'bg-forest-100 text-forest-700' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Payments</p>
          <h1 className="page-title mt-1">Payouts</h1>
        </div>
        <span className="badge badge-gray">
          {pagination?.total ?? payouts.length} payout{pagination?.total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink-600">{c.label}</h3>
              <span className={`h-2 w-2 rounded-full ${c.chip}`} />
            </div>
            <p className="price-tag mt-3 text-3xl text-ink-900">
              {loading ? '…' : formatNaira(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="surface-card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-ink-900">Payout Requests</h2>
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
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">Failed</option>
            </select>
            <SearchBox
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search creator…"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Creator</th>
                <th className="th">Amount</th>
                <th className="th">Method</th>
                <th className="th">Status</th>
                <th className="th">Requested</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No payout requests found</td></tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="align-top table-row-hover">
                    <td className="td text-ink-900">
                      <p className="font-medium">{p.user?.displayName || 'Creator'}</p>
                      <p className="text-xs text-ink-500">{p.user?.email || '—'}</p>
                    </td>
                    <td className="td price-tag text-ink-900">{formatNaira(p.amount)}</td>
                    <td className="td max-w-xs text-ink-600">
                      <p>{p.method || '—'}</p>
                      {p.notes && <p className="mt-0.5 text-xs text-ink-500">{p.notes}</p>}
                    </td>
                    <td className="td">
                      <span className={`badge ${STATUS_STYLES[p.status] || 'badge-gray'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="td text-ink-500">{formatDate(p.createdAt, { short: true })}</td>
                    <td className="td">
                      <div className="flex flex-wrap items-center gap-2">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={busyId === p.id}
                              className="btn btn-primary btn-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              disabled={busyId === p.id}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.status === 'APPROVED' && (
                          <button
                            onClick={() => handleComplete(p.id)}
                            disabled={busyId === p.id}
                            className="btn btn-primary btn-sm"
                          >
                            Mark Paid
                          </button>
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
