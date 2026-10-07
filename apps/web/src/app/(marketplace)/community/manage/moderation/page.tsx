'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CommunityAdminNav } from '@/components/community/admin/admin-nav';

export default function CommunityModerationPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.roles?.some((role) => role === 'admin' || role === 'super_admin');
  const [overview, setOverview] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [memberId, setMemberId] = useState('');
  const [participationReason, setParticipationReason] = useState('');
  async function refresh() {
    if (!token) return;
    const [o, r, h] = await Promise.all([
      api.getCommunityAdminOverview(token),
      api.getCommunityReports(token),
      api.getCommunityModerationHistory(token),
    ]);
    setOverview(o);
    setReports(r);
    setHistory(h);
  }
  useEffect(() => {
    refresh();
  }, [token]);
  if (!isAdmin) return <main className="p-8 text-ink-600">Administrator access required.</main>;
  const metrics = overview
    ? [
        ['Active members', overview.activeMembers],
        ['Suspended', overview.suspendedMembers],
        ['Open reports', overview.openReports],
        ['Upcoming events', overview.upcomingEvents],
        ['Active challenges', overview.activeChallenges],
        ['Failed deliveries', overview.deliveryFailures],
        ['Overdue deliveries', overview.pendingDeliveries],
      ]
    : [];
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">
          CreatorPlus Community operations
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">Moderation and health</h1>
        <CommunityAdminNav />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-ink-100 bg-white p-4">
              <p className="text-xs font-semibold text-ink-500">{label}</p>
              <strong className="mt-2 block font-display text-3xl text-ink-900">{value}</strong>
            </div>
          ))}
        </div>
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold text-ink-900">Report queue</h2>
          <div className="mt-3 space-y-3">
            {reports.length ? (
              reports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-ink-100 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <strong className="text-ink-900">{report.reason}</strong>
                      <p className="mt-1 text-xs text-ink-500">
                        {report.targetType} · reporter{' '}
                        {report.reporter.displayName || report.reporter.email}
                      </p>
                      {report.details && (
                        <p className="mt-2 text-sm text-ink-600">{report.details}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(report.targetType === 'POST' || report.targetType === 'COMMENT') && (
                        <button
                          onClick={async () => {
                            await api.moderateCommunityContent(
                              token!,
                              report.targetType,
                              report.targetId,
                              'HIDE',
                              report.reason,
                            );
                            await api.updateCommunityReport(token!, report.id, 'RESOLVED');
                            await refresh();
                          }}
                          className="rounded-full bg-clay-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Hide content
                        </button>
                      )}
                      {report.targetType === 'PROFILE' && (
                        <button
                          onClick={async () => {
                            await api.setCommunityParticipation(
                              token!,
                              report.targetId,
                              'SUSPENDED',
                              report.reason,
                            );
                            await api.updateCommunityReport(token!, report.id, 'RESOLVED');
                            await refresh();
                          }}
                          className="rounded-full bg-clay-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Suspend from community
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await api.updateCommunityReport(token!, report.id, 'DISMISSED');
                          await refresh();
                        }}
                        className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={async () => {
                          await api.updateCommunityReport(token!, report.id, 'RESOLVED');
                          await refresh();
                        }}
                        className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-cream-50"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-white p-5 text-sm text-ink-500">No open reports.</p>
            )}
          </div>
        </section>
        <section className="mt-8 rounded-2xl border border-ink-100 bg-white p-5">
          <h2 className="font-display text-2xl font-bold text-ink-900">Community access control</h2>
          <p className="mt-1 text-sm text-ink-500">
            This changes CreatorPlus Community participation only. Marketplace roles, purchases, and creator
            data are untouched.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              placeholder="Member user ID"
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
            <input
              value={participationReason}
              onChange={(event) => setParticipationReason(event.target.value)}
              placeholder="Reason for audit history"
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
            <button
              onClick={async () => {
                if (!memberId.trim()) return;
                await api.setCommunityParticipation(
                  token!,
                  memberId.trim(),
                  'SUSPENDED',
                  participationReason,
                );
                await refresh();
              }}
              className="rounded-full bg-clay-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Suspend
            </button>
            <button
              onClick={async () => {
                if (!memberId.trim()) return;
                await api.setCommunityParticipation(
                  token!,
                  memberId.trim(),
                  'ACTIVE',
                  participationReason,
                );
                await refresh();
              }}
              className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold"
            >
              Restore
            </button>
          </div>
        </section>
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold text-ink-900">
            Recent moderation history
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-ink-100 bg-white">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-ink-100 p-4 text-sm last:border-0"
              >
                <span>
                  <strong>{item.action.replaceAll('_', ' ')}</strong> · {item.targetType}
                </span>
                <span className="text-xs text-ink-500">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
