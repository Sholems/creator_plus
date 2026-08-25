// Helpers for rendering live-event products. Times come from the API in UTC;
// we display them in the buyer's own timezone via the built-in Intl API.

export function formatEventWhen(startsAt: string, endsAt?: string | null): string {
  const start = new Date(startsAt);
  const datePart = start.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (endsAt) {
    const end = new Date(endsAt);
    const sameDay = start.toDateString() === end.toDateString();
    const endStr = sameDay
      ? end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : end.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${datePart} · ${timePart} – ${endStr}`;
  }
  return `${datePart} · ${timePart}`;
}

export function localTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time';
  } catch {
    return 'your local time';
  }
}

/** Minutes until the event starts (negative once it has begun). */
export function minutesUntil(startsAt: string): number {
  return Math.round((new Date(startsAt).getTime() - Date.now()) / 60000);
}

/** A downloadable "add to calendar" data URI (RFC-5545). */
export function calendarDataUri(input: {
  uid: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  url?: string | null;
}): string {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CreatorPlus//Events//EN',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${esc(input.title)}`,
    input.description ? `DESCRIPTION:${esc(input.description)}` : '',
    input.location ? `LOCATION:${esc(input.location)}` : '',
    input.url ? `URL:${esc(input.url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}
