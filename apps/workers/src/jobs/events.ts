import { prisma } from '@creatorplus/database';
import { renderEmailLayout } from '@creatorplus/email';
import { QUEUE_NAMES, createWorker, emailQueue, eventsQueue } from '../queues';

/**
 * Event maintenance sweep, every 15 minutes:
 *  1. Release expired seat holds (unpaid checkouts) back to the pool.
 *  2. Send "starting soon" reminders ~24h and ~1h before an event. Dedup is by
 *     a 15-minute window matched to the cron cadence (same technique as the
 *     abandoned-cart sweep) — each event passes through a given window once.
 */

const REPEAT_PATTERN = '*/15 * * * *';
const WINDOW_MS = 15 * 60 * 1000;
const JOB_ID = 'events-sweep';
const WEB = process.env.WEB_URL || 'https://mycreatorplus.com';

async function releaseExpiredHolds(): Promise<number> {
  const res = await prisma.ticket.updateMany({
    where: { status: 'HELD', holdExpiresAt: { lt: new Date() } },
    data: { status: 'CANCELLED', holdExpiresAt: null },
  });
  return res.count;
}

async function sendReminders(now: number, minutesBefore: number, label: string): Promise<number> {
  const target = now + minutesBefore * 60 * 1000;
  const windowStart = new Date(target - WINDOW_MS);
  const windowEnd = new Date(target);

  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gte: windowStart, lt: windowEnd } },
    select: {
      startsAt: true,
      timezone: true,
      locationType: true,
      joinUrl: true,
      venueName: true,
      venueAddress: true,
      product: { select: { title: true } },
      tickets: {
        where: { status: { in: ['VALID', 'CHECKED_IN'] } },
        select: { buyer: { select: { email: true, displayName: true } } },
      },
    },
  });

  let queued = 0;
  for (const ev of events) {
    const whenText =
      new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: ev.timezone,
      }).format(ev.startsAt) + ` (${ev.timezone})`;
    const where =
      ev.locationType === 'VIRTUAL'
        ? 'Online event'
        : [ev.venueName, ev.venueAddress].filter(Boolean).join(', ') || 'In person';
    const join = ev.locationType !== 'PHYSICAL' && ev.joinUrl ? ev.joinUrl : null;

    for (const t of ev.tickets) {
      if (!t.buyer?.email) continue;
      const body = `
        <p>Hi ${t.buyer.displayName || 'there'},</p>
        <p><strong>${ev.product.title}</strong> starts in about ${label}.</p>
        <p><strong>When:</strong> ${whenText}<br/><strong>Where:</strong> ${where}</p>
        ${join ? `<p><strong>Join link:</strong> <a href="${join}">${join}</a></p>` : ''}
      `;
      const html = renderEmailLayout({
        preview: `${ev.product.title} starts in ${label}`,
        eyebrow: 'Starting soon',
        title: ev.product.title,
        body,
        cta: { label: 'View my tickets', url: `${WEB}/dashboard/tickets` },
      });
      await emailQueue.add(
        'send',
        { to: t.buyer.email, subject: `Reminder: ${ev.product.title} starts in ${label}`, html },
        { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
      );
      queued++;
    }
  }
  return queued;
}

async function sendCommunityEventReminders(
  now: number,
  minutesBefore: number,
  label: string,
): Promise<number> {
  const target = now + minutesBefore * 60 * 1000;
  const events = await prisma.communityEvent.findMany({
    where: {
      published: true,
      startsAt: { gte: new Date(target - WINDOW_MS), lt: new Date(target) },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      startsAt: true,
      timezone: true,
      rsvps: {
        where: {
          status: 'GOING',
          user: {
            status: 'ACTIVE',
            OR: [
              { communityNotificationPreference: { is: null } },
              { communityNotificationPreference: { is: { reminderEmail: true } } },
            ],
          },
        },
        select: { user: { select: { id: true, email: true, displayName: true } } },
      },
    },
  });

  let queued = 0;
  for (const event of events) {
    const whenText = new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: event.timezone,
    }).format(event.startsAt);
    for (const { user } of event.rsvps) {
      if (!user.email) continue;
      const key = `community-event:${event.id}:${label}:${user.id}`;
      const delivery = await prisma.communityDelivery.upsert({
        where: { key },
        create: {
          userId: user.id,
          key,
          kind: 'EVENT_REMINDER',
          status: 'PENDING',
          scheduledAt: new Date(now),
          metadata: { eventId: event.id, minutesBefore },
        },
        update: {},
      });
      if (delivery.status === 'QUEUED' || delivery.status === 'DELIVERED') continue;
      const html = renderEmailLayout({
        preview: `${event.title} starts in ${label}`,
        eyebrow: 'Bold Ideas Growth Club',
        title: event.title,
        body: `<p>Hi ${user.displayName || 'there'},</p><p>Your Growth Club session starts in about ${label}.</p><p><strong>When:</strong> ${whenText} (${event.timezone})</p>`,
        cta: { label: 'Open event', url: `${WEB}/community/event/${event.slug}` },
      });
      await emailQueue.add(
        'send',
        { to: user.email, subject: `Reminder: ${event.title} starts in ${label}`, html },
        { jobId: key, attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
      );
      await prisma.communityDelivery.update({
        where: { id: delivery.id },
        data: { status: 'QUEUED', claimedAt: new Date(now) },
      });
      queued += 1;
    }
  }
  return queued;
}

async function sweep() {
  const now = Date.now();
  const released = await releaseExpiredHolds();
  const r24 = await sendReminders(now, 24 * 60, '24 hours');
  const r1 = await sendReminders(now, 60, '1 hour');
  const community24 = await sendCommunityEventReminders(now, 24 * 60, '24-hours');
  const community1 = await sendCommunityEventReminders(now, 60, '1-hour');
  return { released, reminders: r24 + r1 + community24 + community1 };
}

export const eventsWorker = createWorker(QUEUE_NAMES.EVENTS, async () => sweep());

/** Register the repeatable events sweep (idempotent across restarts). */
export async function scheduleEventsSweep() {
  await eventsQueue.add(
    JOB_ID,
    {},
    { repeat: { pattern: REPEAT_PATTERN }, jobId: JOB_ID, removeOnComplete: 100 },
  );
}
