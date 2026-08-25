'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AdinkraMark } from '@/components/brand/adinkra';
import { formatEventWhen, localTimezoneLabel, calendarDataUri } from '@/lib/event';
import { QrCode } from '@/components/market/qr-code';

interface Ticket {
  id: string;
  ticketCode: string;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  checkedInAt: string | null;
  event: {
    id: string;
    startsAt: string;
    endsAt: string | null;
    timezone: string;
    locationType: 'VIRTUAL' | 'PHYSICAL' | 'HYBRID';
    joinUrl: string | null;
    venueName: string | null;
    venueAddress: string | null;
    status: 'PUBLISHED' | 'CANCELLED';
    product?: { id: string; title: string; slug: string; thumbnail?: string | null };
  };
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  VALID: { label: 'Valid', classes: 'bg-forest-100 text-forest-700' },
  CHECKED_IN: { label: 'Checked in', classes: 'bg-gold-100 text-gold-700' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-clay-100 text-clay-700' },
};

export default function MyTicketsPage() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getMyEventTickets(token);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your tickets');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div>
        <p className="eyebrow text-gold-600">Buyer dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">My Tickets</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your tickets to live events. Times are shown in {localTimezoneLabel()}.
        </p>
      </div>

      {error && <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-cream-100" />)
        ) : tickets.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">No tickets yet</h3>
            <p className="mt-1 text-sm text-ink-500">When you buy a ticket to an event, it shows up here.</p>
            <Link href="/products" className="mt-4 inline-block font-semibold text-forest-700 hover:underline">
              Browse events & products
            </Link>
          </div>
        ) : (
          tickets.map((t) => {
            const meta = STATUS_META[t.status];
            const cancelled = t.status === 'CANCELLED' || t.event.status === 'CANCELLED';
            const past = new Date(t.event.startsAt).getTime() < Date.now();
            const location =
              t.event.locationType === 'VIRTUAL'
                ? 'Online event'
                : [t.event.venueName, t.event.venueAddress].filter(Boolean).join(' · ') || 'In-person event';
            return (
              <div key={t.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {t.event.product?.slug ? (
                      <Link href={`/products/${t.event.product.slug}`} className="font-display text-lg font-semibold text-ink-900 hover:text-forest-700">
                        {t.event.product?.title}
                      </Link>
                    ) : (
                      <span className="font-display text-lg font-semibold text-ink-900">{t.event.product?.title || 'Event'}</span>
                    )}
                    <p className="mt-1 text-sm font-medium text-ink-700">{formatEventWhen(t.event.startsAt, t.event.endsAt)}</p>
                    <p className="text-xs text-ink-400">{location}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.classes}`}>{meta.label}</span>
                </div>

                {!cancelled && (
                  <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-4">
                    <div className="rounded-xl border border-ink-100 bg-white p-2">
                      <QrCode value={t.ticketCode} size={112} />
                    </div>
                    <div>
                      <p className="text-xs text-ink-400">Show this at the door to check in</p>
                      <p className="mt-1 font-mono text-lg font-bold tracking-wide text-ink-900">{t.ticketCode}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                  <span className="rounded-lg bg-cream-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-ink-900">
                    {t.ticketCode}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(t.ticketCode); setCopied(t.id); setTimeout(() => setCopied(''), 2000); }}
                    className="text-xs font-medium text-forest-700 hover:text-forest-600"
                  >
                    {copied === t.id ? 'Copied' : 'Copy code'}
                  </button>

                  {!cancelled && (
                    <>
                      {t.event.locationType === 'VIRTUAL' && t.event.joinUrl && !past && (
                        <a
                          href={t.event.joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto rounded-full bg-forest-800 px-4 py-1.5 text-xs font-semibold text-cream-50 hover:bg-forest-700"
                        >
                          Join event
                        </a>
                      )}
                      <a
                        href={calendarDataUri({
                          uid: t.id,
                          title: t.event.product?.title || 'Event',
                          startsAt: t.event.startsAt,
                          endsAt: t.event.endsAt,
                          location: t.event.locationType === 'VIRTUAL' ? (t.event.joinUrl || undefined) : location,
                          url: t.event.joinUrl || undefined,
                        })}
                        download={`${(t.event.product?.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`}
                        className={`rounded-full border border-ink-200 px-4 py-1.5 text-xs font-semibold text-ink-600 hover:bg-cream-100 ${t.event.locationType === 'VIRTUAL' && t.event.joinUrl && !past ? '' : 'ml-auto'}`}
                      >
                        Add to calendar
                      </a>
                    </>
                  )}
                </div>

                {t.event.locationType === 'VIRTUAL' && !t.event.joinUrl && !cancelled && (
                  <p className="mt-2 text-xs text-ink-400">The join link will appear here closer to the event.</p>
                )}
                {cancelled && <p className="mt-2 text-xs text-clay-600">This event was cancelled.</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
