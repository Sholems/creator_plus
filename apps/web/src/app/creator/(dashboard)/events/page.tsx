'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AdinkraMark } from '@/components/brand/adinkra';
import { formatEventWhen } from '@/lib/event';

interface CreatorEvent {
  id: string;
  startsAt: string;
  endsAt: string | null;
  locationType: 'VIRTUAL' | 'PHYSICAL' | 'HYBRID';
  capacity: number | null;
  status: 'PUBLISHED' | 'CANCELLED';
  sold: number;
  checkedIn: number;
  product?: { id: string; title: string; slug: string };
}

export default function CreatorEventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<CreatorEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getCreatorEvents(token);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Creator studio</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Events</h1>
          <p className="mt-1 text-sm text-ink-500">Your live events, ticket sales, and door check-in.</p>
        </div>
        <Link
          href="/creator/products/new"
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700"
        >
          + New Event
        </Link>
      </div>

      {error && <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-cream-100" />)
        ) : events.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">No events yet</h3>
            <p className="mt-1 text-sm text-ink-500">
              Create a product and choose “Live event” to sell tickets to a webinar or event.
            </p>
          </div>
        ) : (
          events.map((e) => {
            const past = new Date(e.startsAt).getTime() < Date.now();
            const pct = e.capacity ? Math.min(100, Math.round((e.sold / e.capacity) * 100)) : 0;
            return (
              <div key={e.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-ink-900">{e.product?.title || 'Event'}</h2>
                      {e.status === 'CANCELLED' && (
                        <span className="rounded-full bg-clay-100 px-2 py-0.5 text-xs font-medium text-clay-700">Cancelled</span>
                      )}
                      {past && e.status !== 'CANCELLED' && (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">Past</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{formatEventWhen(e.startsAt, e.endsAt)}</p>
                    <p className="text-xs text-ink-400 capitalize">
                      {e.locationType === 'VIRTUAL' ? 'Online' : e.locationType === 'PHYSICAL' ? 'In person' : 'Hybrid'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-400">Tickets sold</p>
                    <p className="font-display text-xl font-bold text-forest-900">
                      {e.sold}
                      {e.capacity ? <span className="text-sm font-medium text-ink-400"> / {e.capacity}</span> : null}
                    </p>
                    <p className="text-xs text-ink-400">{e.checkedIn} checked in</p>
                  </div>
                </div>

                {e.capacity ? (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream-100">
                    <div className="h-full rounded-full bg-forest-500" style={{ width: `${pct}%` }} />
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-3">
                  {e.product?.id && (
                    <Link
                      href={`/creator/events/${e.product.id}` as Route}
                      className="rounded-full bg-forest-800 px-4 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-700"
                    >
                      Attendees & check-in
                    </Link>
                  )}
                  {e.product?.slug && (
                    <Link href={`/products/${e.product.slug}`} className="text-xs font-medium text-forest-700 hover:text-forest-600">
                      View page ↗
                    </Link>
                  )}
                  {e.product?.id && (
                    <Link
                      href={`/creator/products/${e.product.id}/edit`}
                      className="text-xs font-medium text-ink-500 hover:text-ink-800"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
