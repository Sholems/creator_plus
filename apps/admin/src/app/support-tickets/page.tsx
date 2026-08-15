'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { SearchBox } from '@/components/search-box';
import { useToast } from '@/lib/toast';

const PER_PAGE = 20;
const STATUS_FILTERS = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const PRIORITY_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'badge-gold',
  ASSIGNED: 'badge-blue',
  IN_PROGRESS: 'badge-blue',
  RESOLVED: 'badge-green',
  CLOSED: 'badge-gray',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'badge-gray',
  MEDIUM: 'badge-blue',
  HIGH: 'badge-gold',
  URGENT: 'badge-red',
};

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: 'Technical',
  BILLING: 'Billing',
  DOWNLOADS: 'Downloads',
  REFUNDS: 'Refunds',
  ACCOUNT: 'Account',
  CREATOR_VERIFICATION: 'Verification',
  ABUSE_REPORT: 'Abuse report',
};

export default function AdminTicketsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('ALL');
  const [priority, setPriority] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getTickets(token, {
        page,
        perPage: PER_PAGE,
        status: status === 'ALL' ? undefined : status,
        priority: priority === 'ALL' ? undefined : priority,
        search: search || undefined,
      })
      .then((res) => {
        setTickets(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load tickets', 'error'))
      .finally(() => setLoading(false));
  }, [token, page, status, priority, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Support</p>
          <h1 className="page-title mt-1">Support Tickets</h1>
        </div>
        <span className="badge badge-gold">{pagination?.total ?? 0} tickets</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setStatus(t); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                status === t ? 'bg-forest-800 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
              }`}
            >
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="input w-auto"
          >
            {PRIORITY_FILTERS.map((p) => (
              <option key={p} value={p}>{p === 'ALL' ? 'Any priority' : p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search subject, user…" />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">Subject</th>
                <th className="th">User</th>
                <th className="th">Category</th>
                <th className="th">Priority</th>
                <th className="th">Status</th>
                <th className="th">Replies</th>
                <th className="th">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={7} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} className="td py-10 text-center text-ink-500">No tickets found</td></tr>
              ) : (
                tickets.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="table-row-hover">
                      <td className="td">
                        <Link href={`/support-tickets/${t.id}` as Route} className="block">
                          <span className="block max-w-xs truncate font-medium text-ink-900">{t.subject}</span>
                        </Link>
                      </td>
                      <td className="td">
                        <Link href={`/support-tickets/${t.id}` as Route} className="block text-sm">
                          <span className="block font-medium text-ink-900">{t.user?.displayName || '—'}</span>
                          <span className="block text-xs text-ink-500">{t.user?.email}</span>
                        </Link>
                      </td>
                      <td className="td">
                        <span className="badge badge-purple">{CATEGORY_LABELS[t.category] || t.category}</span>
                      </td>
                      <td className="td">
                        <span className={`badge ${PRIORITY_BADGE[t.priority] || 'badge-gray'}`}>{t.priority}</span>
                      </td>
                      <td className="td">
                        <span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span>
                      </td>
                      <td className="td text-sm text-ink-600">{t._count?.messages ?? 0}</td>
                      <td className="td text-xs text-ink-500">{new Date(t.updatedAt).toLocaleString()}</td>
                    </tr>
                  </Fragment>
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
