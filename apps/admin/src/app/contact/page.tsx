'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PaginationMeta } from '@/lib/api';
import { Pagination } from '@/components/pagination';
import { useToast } from '@/lib/toast';

const PER_PAGE = 20;
type StatusFilter = 'ALL' | 'NEW' | 'READ' | 'ARCHIVED';

const STATUS_BADGE: Record<string, string> = {
  NEW: 'badge-gold',
  READ: 'badge-blue',
  ARCHIVED: 'badge-gray',
};

export default function AdminContactPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api
      .getContacts(token, { status: status === 'ALL' ? undefined : status, page, perPage: PER_PAGE })
      .then((res) => {
        setMessages(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch((e) => toast(e.message || 'Failed to load messages', 'error'))
      .finally(() => setLoading(false));
  }, [token, page, status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id: string, next: 'NEW' | 'READ' | 'ARCHIVED') => {
    if (!token) return;
    setBusyId(id);
    try {
      await api.setContactStatus(token, id, next);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
      toast(`Marked ${next.toLowerCase()}`);
    } catch (e: any) {
      toast(e.message || 'Failed to update', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const tabs: StatusFilter[] = ['ALL', 'NEW', 'READ', 'ARCHIVED'];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-gold-600">Support</p>
          <h1 className="page-title mt-1">Contact Inbox</h1>
        </div>
        <span className="badge badge-gold">
          {pagination?.total ?? 0} messages
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setStatus(t);
              setPage(1);
              setSelectedId(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              status === t ? 'bg-forest-800 text-white' : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
            }`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-head-row">
                <th className="th">From</th>
                <th className="th">Subject</th>
                <th className="th">Category</th>
                <th className="th">Status</th>
                <th className="th">Received</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">Loading…</td></tr>
              ) : messages.length === 0 ? (
                <tr><td colSpan={6} className="td py-10 text-center text-ink-500">No messages</td></tr>
              ) : (
                messages.map((m) => (
                  <Fragment key={m.id}>
                    <tr className="table-row-hover">
                      <td className="td">
                        <button
                          onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                          className="text-left"
                        >
                          <span className="block font-medium text-ink-900">{m.name}</span>
                          <span className="block text-xs text-ink-500">{m.email}</span>
                        </button>
                      </td>
                      <td className="td font-medium text-ink-900">{m.subject}</td>
                      <td className="td">
                        <span className="badge badge-purple">{m.category}</span>
                      </td>
                      <td className="td">
                        <span className={`badge ${STATUS_BADGE[m.status] || 'badge-gray'}`}>{m.status}</span>
                      </td>
                      <td className="td text-xs text-ink-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeStatus(m.id, 'READ')}
                            disabled={busyId === m.id || m.status === 'READ'}
                            className="btn btn-ghost btn-sm"
                          >
                            Mark read
                          </button>
                          <button
                            onClick={() => changeStatus(m.id, 'ARCHIVED')}
                            disabled={busyId === m.id || m.status === 'ARCHIVED'}
                            className="btn btn-ghost btn-sm"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                    {selectedId === m.id && (
                      <tr className="bg-cream-100/50">
                        <td colSpan={6} className="td">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Message</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{m.message}</p>
                          {m.user && (
                            <p className="mt-3 text-xs text-ink-500">
                              Sent by registered user: {m.user.displayName || m.user.email}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
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
