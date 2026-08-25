import { randomBytes } from 'crypto';

// Unambiguous alphabet (no 0/O/1/I) for human-readable ticket codes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function group(n: number): string {
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** e.g. TKT-7F3A-9K2B — printed on the ticket and encoded in its QR. */
export function generateTicketCode(): string {
  return `TKT-${group(4)}-${group(4)}`;
}

/**
 * Minimal RFC-5545 calendar invite for a ticket. Returned as a string the
 * buyer's app can offer as a .ics download / data-URI.
 */
export function buildIcs(input: {
  uid: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  url?: string | null;
}): string {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = input.endsAt ?? new Date(input.startsAt.getTime() + 60 * 60 * 1000);
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CreatorPlus//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(input.startsAt)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${esc(input.title)}`,
    input.description ? `DESCRIPTION:${esc(input.description)}` : '',
    input.location ? `LOCATION:${esc(input.location)}` : '',
    input.url ? `URL:${esc(input.url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}
