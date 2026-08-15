'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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

export default function SupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace(`/auth/login?next=/dashboard/support/${ticketId}`);
      return;
    }
    load();
  }, [token, ticketId]);

  const load = async () => {
    try {
      setIsLoading(true);
      setTicket(await api.getMyTicket(token!, ticketId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !reply.trim()) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await api.replyToTicket(token, ticketId, reply.trim());
      setReply('');
      setNotice({ ok: true, text: 'Reply sent. We will get back to you soon.' });
      load();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Failed to send reply' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Unable to load ticket</h2>
        <p className="mt-1 text-sm text-gray-600">{error || 'Ticket not found'}</p>
        <Link href="/dashboard/support" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to support
        </Link>
      </div>
    );
  }

  const closed = ticket.status === 'CLOSED';
  const messages: any[] = ticket.messages || [];

  return (
    <div>
      <Link href="/dashboard/support" className="text-sm font-medium text-blue-600 hover:text-blue-700">
        ← Back to support
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {CATEGORY_LABELS[ticket.category] || ticket.category}
              {' · Priority '}
              {ticket.priority}
              {' · Opened '}
              {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500">Your message</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{ticket.description}</p>
          </div>

          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`rounded-lg p-4 ${mine ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <p className="text-xs font-semibold text-gray-500">
                  {mine ? 'You' : m.sender?.displayName || m.sender?.email || 'Support team'}
                  {' · '}
                  {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{m.message}</p>
              </div>
            );
          })}

          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              No replies yet. Our support team will respond soon.
            </p>
          )}
        </div>

        {notice && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${notice.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {notice.text}
          </div>
        )}

        {closed ? (
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            This ticket is closed and can no longer be replied to.
          </div>
        ) : (
          <form onSubmit={submitReply} className="mt-4">
            <label htmlFor="reply" className="mb-1.5 block text-sm font-medium text-gray-700">
              Add a reply
            </label>
            <textarea
              id="reply"
              required
              rows={4}
              maxLength={10000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your reply…"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !reply.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
