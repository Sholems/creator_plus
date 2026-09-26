'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export default function CommunityEventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .getCommunityEvents(token)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [token]);

  const upcoming = useMemo(
    () => events.filter((event) => new Date(event.startsAt) >= new Date()),
    [events],
  );
  const replays = useMemo(() => events.filter((event) => event.replayUrl), [events]);

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-600">Live learning</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">
          Show up, ask questions, make progress.
        </h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Join workshops, live sessions, and office hours hosted by the CreatorPlus team.
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-ink-500">Loading events…</p>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {upcoming.map((event) => (
              <Link
                key={event.id}
                href={`/community/event/${event.slug}` as Route}
                className="group rounded-3xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-forest-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full bg-clay-50 px-3 py-1 text-xs font-bold text-clay-700">
                    {event.type.replaceAll('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold text-ink-500">
                    {event.accessLevel === 'PREMIUM' ? 'Premium' : 'All members'}
                  </span>
                </div>
                <h2 className="mt-5 font-display text-2xl font-bold text-ink-900 group-hover:text-forest-800">
                  {event.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-ink-600">
                  {formatDate(event.startsAt, event.timezone)} · {event.timezone}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-ink-500">
                  <span>{event.hostName ? `Hosted by ${event.hostName}` : 'CreatorPlus live'}</span>
                  <span>{event.attendeeCount} going</span>
                </div>
              </Link>
            ))}
            {!upcoming.length && (
              <p className="rounded-2xl border border-ink-100 bg-white p-6 text-ink-500">
                No upcoming events yet. New sessions will appear here.
              </p>
            )}
          </div>
        )}

        {replays.length > 0 && (
          <section className="mt-12 border-t border-ink-100 pt-8">
            <h2 className="font-display text-2xl font-bold text-ink-900">Replay library</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {replays.map((event) => (
                <Link
                  key={event.id}
                  href={`/community/event/${event.slug}` as Route}
                  className="rounded-2xl bg-forest-950 p-5 text-cream-50"
                >
                  <strong>{event.title}</strong>
                  <p className="mt-1 text-xs text-cream-200">Watch the session replay</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
