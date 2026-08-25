'use client';

import { useState } from 'react';

export interface EventConfigValue {
  startsAt: string | null; // ISO (UTC)
  endsAt: string | null;
  timezone: string;
  locationType: 'VIRTUAL' | 'PHYSICAL' | 'HYBRID';
  joinUrl: string;
  venueName: string;
  venueAddress: string;
  capacity: number | null;
  registrationDeadline: string | null;
}

// datetime-local <-> ISO helpers (the input is in the creator's local time).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}
function localInputToIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

const inputCls =
  'mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

export function EventOptionsForm({
  value,
  onChange,
}: {
  value: EventConfigValue;
  onChange: (v: EventConfigValue) => void;
}) {
  const [v, setV] = useState<EventConfigValue>(value);
  const tz = value.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos';

  const patch = (p: Partial<EventConfigValue>) => {
    const next = { ...v, timezone: tz, ...p };
    setV(next);
    onChange(next);
  };

  const isVirtual = v.locationType === 'VIRTUAL' || v.locationType === 'HYBRID';
  const isPhysical = v.locationType === 'PHYSICAL' || v.locationType === 'HYBRID';

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
      <h2 className="font-display text-lg font-semibold text-ink-900">Event details</h2>
      <p className="mt-1 text-sm text-ink-500">
        When and where your live event happens. Times are in your timezone ({tz}).
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink-700">Starts</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(v.startsAt)}
            onChange={(e) => patch({ startsAt: localInputToIso(e.target.value) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Ends (optional)</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(v.endsAt)}
            onChange={(e) => patch({ endsAt: localInputToIso(e.target.value) })}
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-ink-700">Location</label>
        <div className="mt-2 inline-flex rounded-full border border-ink-100 bg-cream-50 p-1">
          {(['VIRTUAL', 'PHYSICAL', 'HYBRID'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch({ locationType: t })}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                v.locationType === t ? 'bg-forest-800 text-cream-50' : 'text-ink-600'
              }`}
            >
              {t === 'VIRTUAL' ? 'Online' : t === 'PHYSICAL' ? 'In person' : 'Hybrid'}
            </button>
          ))}
        </div>
      </div>

      {isVirtual && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-ink-700">Join link</label>
          <p className="mt-0.5 text-xs text-ink-400">Zoom / Google Meet / stream URL — revealed to buyers after purchase.</p>
          <input
            type="url"
            value={v.joinUrl}
            onChange={(e) => patch({ joinUrl: e.target.value })}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
      )}

      {isPhysical && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink-700">Venue name</label>
            <input
              value={v.venueName}
              onChange={(e) => patch({ venueName: e.target.value })}
              placeholder="e.g. Landmark Centre"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700">Address</label>
            <input
              value={v.venueAddress}
              onChange={(e) => patch({ venueAddress: e.target.value })}
              placeholder="Street, city"
              className={inputCls}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink-700">Capacity</label>
          <p className="mt-0.5 text-xs text-ink-400">Total seats. Leave blank for unlimited.</p>
          <input
            type="number"
            min={1}
            value={v.capacity ?? ''}
            onChange={(e) => patch({ capacity: e.target.value ? Math.max(1, parseInt(e.target.value)) : null })}
            placeholder="Unlimited"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700">Registration closes (optional)</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(v.registrationDeadline)}
            onChange={(e) => patch({ registrationDeadline: localInputToIso(e.target.value) })}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
