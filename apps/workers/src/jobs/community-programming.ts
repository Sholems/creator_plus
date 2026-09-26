import { prisma } from '@creatorplus/database';
import { renderEmailLayout } from '@creatorplus/email';
import { QUEUE_NAMES, createWorker, emailQueue, communityProgrammingQueue } from '../queues';

/**
 * Community programming worker: delivers deduplicated event reminders and one
 * cancellation notice per RSVP. Durable `CommunityDelivery` rows keyed by a
 * unique idempotency key make retries safe (KTD5); eligibility (published,
 * not cancelled, RSVP GOING, active/un-suspended user, reminder preference,
 * and premium access) is re-checked immediately before each send.
 */
const REPEAT_PATTERN = '*/10 * * * *'; // every 10 minutes
const JOB_ID = 'community-programming';
const WEB = process.env.WEB_URL || 'https://mycreatorplus.com';

const OFFSETS = [
  { label: '24h', ms: 24 * 60 * 60 * 1000, human: '24 hours' },
  { label: '1h', ms: 60 * 60 * 1000, human: '1 hour' },
];

/** userIds (of the given set) who currently hold an active membership. */
async function activeMemberIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const subs = await prisma.membershipSubscription.findMany({
    where: { userId: { in: userIds }, status: { in: ['ACTIVE', 'PAST_DUE'] }, currentPeriodEnd: { gt: new Date() } },
    select: { userId: true },
  });
  return new Set(subs.map((s) => s.userId));
}

const rsvpInclude = {
  rsvps: {
    where: { status: 'GOING' as const },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          communityProfile: { select: { participationStatus: true } },
          communityNotificationPreference: { select: { reminderEmail: true, inAppEnabled: true } },
        },
      },
    },
  },
};

async function sendReminders(now: Date): Promise<number> {
  const horizon = new Date(now.getTime() + OFFSETS[0].ms);
  const events = await prisma.communityEvent.findMany({
    where: { published: true, canceledAt: null, startsAt: { gt: now, lte: horizon } },
    include: rsvpInclude,
  });

  let delivered = 0;
  for (const ev of events) {
    const premium = ev.accessLevel === 'PREMIUM';
    const memberSet = premium ? await activeMemberIds(ev.rsvps.map((r) => r.userId)) : null;

    for (let i = 0; i < OFFSETS.length; i++) {
      const off = OFFSETS[i];
      // Fire each offset only within its own band, so a late sweep never sends a
      // "24 hours" reminder for an event that is actually 1 hour away.
      const lower = ev.startsAt.getTime() - off.ms;
      const upper = i + 1 < OFFSETS.length ? ev.startsAt.getTime() - OFFSETS[i + 1].ms : ev.startsAt.getTime();
      if (!(now.getTime() >= lower && now.getTime() < upper)) continue;
      const fireAt = lower;

      for (const r of ev.rsvps) {
        const u = r.user;
        const key = `event-reminder:${ev.id}:${off.label}:${u.id}`;
        const existing = await prisma.communityDelivery.findUnique({ where: { key } });
        if (existing && existing.status !== 'PENDING') continue; // already delivered/suppressed

        const eligible =
          u.status === 'ACTIVE' &&
          u.communityProfile?.participationStatus !== 'SUSPENDED' &&
          (!premium || memberSet!.has(u.id));

        if (!eligible) {
          await prisma.communityDelivery.upsert({
            where: { key },
            create: { userId: u.id, key, kind: 'EVENT_REMINDER', status: 'SUPPRESSED', scheduledAt: new Date(fireAt), suppressedAt: now, reason: 'ineligible', metadata: { eventId: ev.id, offset: off.label } },
            update: { status: 'SUPPRESSED', suppressedAt: now, reason: 'ineligible' },
          });
          continue;
        }

        const delivery = await prisma.communityDelivery.upsert({
          where: { key },
          create: { userId: u.id, key, kind: 'EVENT_REMINDER', status: 'PENDING', scheduledAt: new Date(fireAt), metadata: { eventId: ev.id, offset: off.label } },
          update: {},
        });
        if (delivery.status !== 'PENDING') continue; // claimed by a concurrent run

        if (u.communityNotificationPreference?.inAppEnabled !== false) {
          await prisma.notification.create({
            data: { userId: u.id, type: 'SYSTEM', title: `Starting in ${off.human}: ${ev.title}`, message: `Your Growth Club event "${ev.title}" starts in about ${off.human}.`, data: { kind: 'event_reminder', communityEventSlug: ev.slug } },
          });
        }
        if (u.email && u.communityNotificationPreference?.reminderEmail !== false) {
          const html = renderEmailLayout({
            preview: `${ev.title} starts in ${off.human}`,
            eyebrow: 'Bold Ideas Growth Club',
            title: ev.title,
            body: `<p>Your event <strong>${ev.title}</strong> starts in about ${off.human}.</p>`,
            cta: { label: 'View the event', url: `${WEB}/community/event/${ev.slug}` },
          });
          await emailQueue.add('send', { to: u.email, subject: `Starting in ${off.human}: ${ev.title}`, html }, { jobId: key, attempts: 3, backoff: { type: 'exponential', delay: 5_000 } });
        }
        await prisma.communityDelivery.update({ where: { id: delivery.id }, data: { status: 'DELIVERED', claimedAt: now, deliveredAt: now } });
        delivered++;
      }
    }
  }
  return delivered;
}

async function sendCancellations(now: Date): Promise<number> {
  const events = await prisma.communityEvent.findMany({
    where: { canceledAt: { not: null }, startsAt: { gt: now } },
    include: rsvpInclude,
  });

  let delivered = 0;
  for (const ev of events) {
    // Suppress any still-pending reminders for the cancelled event.
    await prisma.communityDelivery.updateMany({
      where: { kind: 'EVENT_REMINDER', status: 'PENDING', metadata: { path: ['eventId'], equals: ev.id } },
      data: { status: 'SUPPRESSED', suppressedAt: now, reason: 'event_cancelled' },
    });

    for (const r of ev.rsvps) {
      const u = r.user;
      const key = `event-cancel:${ev.id}:${u.id}`;
      const existing = await prisma.communityDelivery.findUnique({ where: { key } });
      if (existing) continue; // exactly one cancellation notice

      const delivery = await prisma.communityDelivery.create({
        data: { userId: u.id, key, kind: 'EVENT_CANCEL', status: 'PENDING', scheduledAt: now, metadata: { eventId: ev.id } },
      });
      if (u.communityNotificationPreference?.inAppEnabled !== false) {
        await prisma.notification.create({
          data: { userId: u.id, type: 'SYSTEM', title: `Cancelled: ${ev.title}`, message: `The Growth Club event "${ev.title}" has been cancelled.`, data: { kind: 'event_cancelled' } },
        });
      }
      if (u.email && u.communityNotificationPreference?.reminderEmail !== false) {
        const html = renderEmailLayout({
          preview: `${ev.title} was cancelled`,
          eyebrow: 'Bold Ideas Growth Club',
          title: `${ev.title} was cancelled`,
          body: `<p>The event <strong>${ev.title}</strong> has been cancelled. Sorry for the inconvenience.</p>`,
          cta: { label: 'See upcoming events', url: `${WEB}/community/events` },
        });
        await emailQueue.add('send', { to: u.email, subject: `Cancelled: ${ev.title}`, html }, { jobId: key, attempts: 3, backoff: { type: 'exponential', delay: 5_000 } });
      }
      await prisma.communityDelivery.update({ where: { id: delivery.id }, data: { status: 'DELIVERED', deliveredAt: now } });
      delivered++;
    }
  }
  return delivered;
}

export async function sweepCommunityProgramming(now = new Date()) {
  const reminders = await sendReminders(now);
  const cancellations = await sendCancellations(now);
  return { reminders, cancellations };
}

export const communityProgrammingWorker = createWorker(QUEUE_NAMES.COMMUNITY_PROGRAMMING, async () =>
  sweepCommunityProgramming(),
);

/** Register the repeatable programming sweep (idempotent across restarts). */
export async function scheduleCommunityProgramming() {
  await communityProgrammingQueue.add(
    JOB_ID,
    {},
    { repeat: { pattern: REPEAT_PATTERN }, jobId: JOB_ID, removeOnComplete: 100 },
  );
}
