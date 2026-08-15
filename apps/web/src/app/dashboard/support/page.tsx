'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: 'Technical issue',
  BILLING: 'Billing & payments',
  DOWNLOADS: 'Downloads',
  REFUNDS: 'Refunds',
  ACCOUNT: 'Account',
  CREATOR_VERIFICATION: 'Creator verification',
  ABUSE_REPORT: 'Abuse report',
};

const STATUS_FILTERS = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

const statusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return 'bg-yellow-100 text-yellow-700';
    case 'ASSIGNED': return 'bg-blue-100 text-blue-700';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
    case 'RESOLVED': return 'bg-green-100 text-green-700';
    case 'CLOSED': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const emptyForm = { subject: '', category: 'TECHNICAL', description: '' };

export default function SupportTicketsPage() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await api.getMyTickets(token, {
        page,
        perPage: 20,
        status: status === 'ALL' ? undefined : status,
      });
      setTickets(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createSupportTicket(token, form);
      setShowCreate(false);
      setForm(emptyForm);
      setStatus('ALL');
      setPage(1);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your support requests and get help with purchases, accounts, and more.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New ticket
        </button>
      </div>

      {error && !showCreate && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              status === s
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl">🎫</div>
            <h3 className="mt-3 text-sm font-medium text-gray-900">No support tickets</h3>
            <p className="mt-1 text-sm text-gray-500">
              {status === 'ALL' ? 'Create a ticket and we will get back to you shortly.' : `No tickets with status "${status}".`}
            </p>
            {status === 'ALL' && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open a ticket
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/dashboard/support/${t.id}` as Route}
                  className="block px-6 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{t.subject}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {CATEGORY_LABELS[t.category] || t.category}
                        {' · '}
                        {t._count?.messages ?? 0} message{(t._count?.messages ?? 0) === 1 ? '' : 's'}
                        {' · '}
                        Opened {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && total > 20 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <span className="text-xs text-gray-500">{total} total</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={tickets.length < 20}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Open a support ticket</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tell us what went wrong and we will get back to you within 24 hours.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="ticket-subject" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  id="ticket-subject"
                  required
                  maxLength={200}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label htmlFor="ticket-category" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="ticket-category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ticket-description" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="ticket-description"
                  required
                  rows={5}
                  maxLength={10000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue you are experiencing…"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              {error && showCreate && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(null); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
