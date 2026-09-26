'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CommunityAdminNav } from '@/components/community/admin/admin-nav';

const input = 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm';
export default function ManageCommunityEventsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.roles?.some((role) => role === 'admin' || role === 'super_admin');
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    startsAt: '',
    endsAt: '',
    timezone: 'Africa/Lagos',
    meetingUrl: '',
    accessLevel: 'FREE',
    published: false,
  });
  const [error, setError] = useState('');
  async function refresh() {
    if (token) setEvents(await api.adminGetCommunityEvents(token));
  }
  useEffect(() => {
    refresh();
  }, [token]);
  async function create() {
    if (!token || !form.title || !form.startsAt) return;
    try {
      setError('');
      await api.adminCreateCommunityEvent(token, {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        meetingUrl: form.meetingUrl || undefined,
      });
      setForm({ ...form, title: '', startsAt: '', endsAt: '', meetingUrl: '' });
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }
  if (!isAdmin) return <main className="p-8 text-ink-600">Administrator access required.</main>;
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">
          Growth Club operations
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">
          Events and office hours
        </h1>
        <CommunityAdminNav />
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-ink-100 bg-white p-5">
            <h2 className="font-display text-xl font-bold text-ink-900">Create event</h2>
            <div className="mt-4 space-y-3">
              <input
                className={input}
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <label className="block text-xs font-semibold text-ink-500">
                Starts
                <input
                  className={`${input} mt-1`}
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-ink-500">
                Ends
                <input
                  className={`${input} mt-1`}
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </label>
              <input
                className={input}
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="IANA timezone"
              />
              <input
                className={input}
                value={form.meetingUrl}
                onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })}
                placeholder="HTTPS meeting link"
              />
              <select
                className={input}
                value={form.accessLevel}
                onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
              >
                <option value="FREE">All members</option>
                <option value="PREMIUM">Premium members</option>
              </select>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />{' '}
                Publish immediately
              </label>
              <button
                onClick={create}
                className="w-full rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50"
              >
                Create event
              </button>
              {error && <p className="text-sm text-clay-700">{error}</p>}
            </div>
          </section>
          <section className="space-y-3">
            {events.map((event) => (
              <article key={event.id} className="rounded-2xl border border-ink-100 bg-white p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <strong className="text-ink-900">{event.title}</strong>
                    <p className="mt-1 text-xs text-ink-500">
                      {new Date(event.startsAt).toLocaleString()} · {event.timezone}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {!event.canceledAt && (
                      <button
                        onClick={async () => {
                          await api.adminUpdateCommunityEvent(token!, event.id, {
                            published: !event.published,
                          });
                          await refresh();
                        }}
                        className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold"
                      >
                        {event.published ? 'Unpublish' : 'Publish'}
                      </button>
                    )}
                    {event.canceledAt ? (
                      <span className="rounded-full bg-clay-50 px-3 py-1 text-xs font-semibold text-clay-700">Cancelled</span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!confirm('Cancel this event? Attendees will be notified and reminders stopped.')) return;
                          await api.adminCancelCommunityEvent(token!, event.id);
                          await refresh();
                        }}
                        className="rounded-full border border-clay-200 px-3 py-1 text-xs font-semibold text-clay-700 hover:bg-clay-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
