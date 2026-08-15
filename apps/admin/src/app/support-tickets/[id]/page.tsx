'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

const STATUS_OPTIONS = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

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
  TECHNICAL: 'Technical issue',
  BILLING: 'Billing & payments',
  DOWNLOADS: 'Downloads',
  REFUNDS: 'Refunds',
  ACCOUNT: 'Account',
  CREATOR_VERIFICATION: 'Creator verification',
  ABUSE_REPORT: 'Abuse report',
};

export default function AdminTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { toast } = useToast();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignId, setAssignId] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    api
      .getTicket(token, ticketId)
      .then((t) => setTicket(t))
      .catch((e) => toast(e.message || 'Failed to load ticket', 'error'))
      .finally(() => setLoading(false));
  }, [token, ticketId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async () => {
    if (!token || !reply.trim()) return;
    setBusy(true);
    try {
      await api.replyToTicket(token, ticketId, reply.trim());
      setReply('');
      toast('Reply sent');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to send reply', 'error');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api.setTicketStatus(token, ticketId, status as any);
      toast(`Status set to ${status}`);
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to update status', 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePriority = async (priority: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api.setTicketPriority(token, ticketId, priority as any);
      toast(`Priority set to ${priority}`);
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to update priority', 'error');
    } finally {
      setBusy(false);
    }
  };

  const assign = async (assignedTo?: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await api.assignTicket(token, ticketId, assignedTo);
      toast(assignedTo ? 'Ticket assigned' : 'Ticket unassigned');
      setAssignId('');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to assign ticket', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-ink-500">Loading…</div>;
  }

  if (!ticket) {
    return (
      <div className="surface-card p-12 text-center">
        <p className="text-ink-600">Ticket not found.</p>
        <Link href="/support-tickets" className="mt-2 inline-block text-sm font-semibold text-gold-600 hover:text-gold-500">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/support-tickets" className="text-sm font-semibold text-gold-600 hover:text-gold-500">
        ← Back to tickets
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{ticket.subject}</h1>
            <span className={`badge ${STATUS_BADGE[ticket.status] || 'badge-gray'}`}>{ticket.status}</span>
            <span className={`badge ${PRIORITY_BADGE[ticket.priority] || 'badge-gray'}`}>Priority: {ticket.priority}</span>
          </div>
          <p className="mt-1 text-sm text-ink-600">
            {ticket.user?.displayName || ticket.user?.email || 'Unknown user'}
            {ticket.user?.email ? ` · ${ticket.user.email}` : ''}
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            {CATEGORY_LABELS[ticket.category] || ticket.category}
            {' · Opened '}
            {new Date(ticket.createdAt).toLocaleString()}
            {' · Updated '}
            {new Date(ticket.updatedAt).toLocaleString()}
          </p>
          {ticket.assignedToUser && (
            <p className="mt-1 text-xs text-ink-600">
              Assigned to: {ticket.assignedToUser.displayName || ticket.assignedToUser.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Thread */}
        <div className="surface-card p-6 lg:col-span-2">
          <div className="space-y-4">
            <div className="rounded-xl bg-cream-100 p-4">
              <p className="eyebrow text-ink-400">Opener</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{ticket.description}</p>
            </div>

            {ticket.messages?.map((m: any) => (
              <div key={m.id} className={`rounded-xl p-4 ${m.senderType === 'ADMIN' ? 'bg-gold-50' : 'bg-cream-100'}`}>
                <p className="eyebrow text-ink-400">
                  {m.senderType === 'ADMIN'
                    ? `Support (${m.sender?.displayName || m.sender?.email || 'agent'})`
                    : m.sender?.displayName || m.sender?.email || 'User'}
                  {' · '}
                  {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{m.message}</p>
              </div>
            ))}

            {(!ticket.messages || ticket.messages.length === 0) && (
              <p className="text-center text-sm text-ink-500">No replies yet.</p>
            )}
          </div>

          <div className="mt-6 border-t border-ink-100 pt-4">
            <label htmlFor="admin-reply" className="mb-1.5 block text-sm font-medium text-ink-700">
              Reply as support
            </label>
            <textarea
              id="admin-reply"
              rows={4}
              maxLength={10000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply to the user…"
              className="input w-full"
            />
            <div className="mt-3 flex justify-end">
              <button onClick={sendReply} disabled={busy || !reply.trim()} className="btn btn-gold btn-md">
                {busy ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="surface-card p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={busy || ticket.status === s}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    ticket.status === s
                      ? 'bg-forest-800 text-white'
                      : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Priority</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => changePriority(p)}
                  disabled={busy || ticket.priority === p}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    ticket.priority === p
                      ? 'bg-forest-800 text-white'
                      : 'bg-cream-100 text-ink-600 hover:bg-cream-200'
                  }`}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-display text-base font-semibold text-ink-900">Assignment</h2>
            {ticket.assignedToUser ? (
              <p className="mt-2 text-sm text-ink-700">
                {ticket.assignedToUser.displayName || ticket.assignedToUser.email}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-500">Unassigned</p>
            )}
            <div className="mt-3 space-y-2">
              <input
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
                placeholder="User ID to assign"
                className="input w-full"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => assign(assignId.trim() || undefined)}
                  disabled={busy || !assignId.trim()}
                  className="btn btn-gold btn-sm"
                >
                  Assign
                </button>
                {ticket.assignedToUser && (
                  <button onClick={() => assign()} disabled={busy} className="btn btn-ghost btn-sm">
                    Unassign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
