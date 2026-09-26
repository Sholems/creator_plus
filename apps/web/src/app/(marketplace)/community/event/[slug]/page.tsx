'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { CommunityRichContent } from '@/components/community/rich-content';

export default function CommunityEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !slug) return;
    api
      .getCommunityEvent(token, slug)
      .then(setEvent)
      .catch((e) => setError(e.message));
  }, [token, slug]);

  async function toggleRsvp() {
    if (!token || !event) return;
    setBusy(true);
    try {
      const wasGoing = event.rsvpStatus === 'GOING';
      const result = await api.rsvpCommunityEvent(token, event.id, !wasGoing);
      setEvent((current: any) => ({
        ...current,
        rsvpStatus: result.status,
        meetingUrl: result.meetingUrl,
        attendeeCount: Math.max(0, current.attendeeCount + (wasGoing ? -1 : 1)),
      }));
    } catch (e: any) {
      setError(e.message || 'Could not update RSVP');
    } finally {
      setBusy(false);
    }
  }

  if (error && !event) return <main className="p-8 text-clay-700">{error}</main>;
  if (!event) return <main className="p-8 text-ink-500">Loading event…</main>;

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-ink-100 bg-white shadow-sm">
        {event.coverImage && (
          <img src={event.coverImage} alt="" className="aspect-[16/7] w-full object-cover" />
        )}
        <div className="p-6 md:p-10">
          <Link href={'/community/events' as Route} className="text-sm text-ink-500">
            ← Events
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-clay-600">
            {event.type.replaceAll('_', ' ')}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">{event.title}</h1>
          <p className="mt-4 font-semibold text-ink-700">
            {new Intl.DateTimeFormat('en-NG', {
              dateStyle: 'full',
              timeStyle: 'short',
              timeZone: event.timezone,
            }).format(new Date(event.startsAt))}{' '}
            · {event.timezone}
          </p>
          {event.hostName && (
            <p className="mt-1 text-sm text-ink-500">Hosted by {event.hostName}</p>
          )}
          {event.description && (
            <div className="mt-7">
              <CommunityRichContent body={event.description} format={event.descriptionFormat} />
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-6">
            <button
              onClick={toggleRsvp}
              disabled={busy}
              className={
                event.rsvpStatus === 'GOING'
                  ? 'rounded-full border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-700'
                  : 'rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50'
              }
            >
              {event.rsvpStatus === 'GOING' ? 'Cancel RSVP' : 'Reserve my place'}
            </button>
            <span className="text-sm text-ink-500">{event.attendeeCount} members going</span>
            {event.meetingUrl && (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto rounded-full bg-clay-600 px-6 py-3 text-sm font-semibold text-white"
              >
                Join live session
              </a>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-clay-700">{error}</p>}
          {event.replayUrl && (
            <div className="mt-8 rounded-2xl bg-forest-950 p-5 text-cream-50">
              <h2 className="font-display text-xl font-semibold">Session replay</h2>
              <a
                href={event.replayUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-gold-300"
              >
                Watch replay →
              </a>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
