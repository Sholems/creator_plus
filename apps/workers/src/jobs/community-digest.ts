import { prisma } from '@creatorplus/database';
import { renderEmailLayout } from '@creatorplus/email';
import { QUEUE_NAMES, createWorker, emailQueue, communityDigestQueue } from '../queues';

/**
 * Daily Bold Ideas Growth Club digest: if anything was posted in the last 24h,
 * email active members a short summary with links. Skips quietly when there's no new
 * activity so members never get an empty email.
 */
const REPEAT_PATTERN = '0 8 * * *'; // 08:00 daily
const JOB_ID = 'community-digest';
const WEB = process.env.WEB_URL || 'https://mycreatorplus.com';

export async function sweepCommunityDigest(now = new Date()) {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const posts = await prisma.communityPost.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { author: { select: { displayName: true } } },
  });
  if (posts.length === 0) return { newPosts: 0, queued: 0 };

  // Community access is free. Email only active members who explicitly opted
  // into the digest and are not suspended from Growth Club.
  const preferences = await prisma.communityNotificationPreference.findMany({
    where: {
      digestEmail: true,
      user: {
        status: 'ACTIVE',
        OR: [
          { communityProfile: null },
          { communityProfile: { is: { participationStatus: 'ACTIVE' } } },
        ],
      },
    },
    select: { user: { select: { id: true, email: true } } },
  });
  const users = preferences.map(({ user }) => user);
  if (users.length === 0) return { newPosts: posts.length, queued: 0 };

  const items = posts
    .map(
      (p) =>
        `<li style="margin:8px 0"><a href="${WEB}/community/post/${p.id}"><strong>${p.title}</strong></a> — by ${p.author.displayName || 'a member'}</li>`,
    )
    .join('');
  const html = renderEmailLayout({
    preview: `${posts.length} new post${posts.length > 1 ? 's' : ''} in Bold Ideas Growth Club`,
    eyebrow: 'Bold Ideas Growth Club',
    title: "What's new in the Growth Club",
    body: `<p>Here's what Growth Club members shared in the last day:</p><ul style="padding-left:18px">${items}</ul>`,
    cta: { label: 'Open the Growth Club', url: `${WEB}/community/discussion` },
  });

  let queued = 0;
  for (const u of users) {
    if (!u.email) continue;
    const day = now.toISOString().slice(0, 10);
    const key = `community-digest:${day}:${u.id}`;
    const delivery = await prisma.communityDelivery.upsert({
      where: { key },
      create: { userId: u.id, key, kind: 'DIGEST', status: 'PENDING', scheduledAt: now },
      update: {},
    });
    if (delivery.status === 'QUEUED' || delivery.status === 'DELIVERED') continue;
    await emailQueue.add(
      'send',
      { to: u.email, subject: "What's new in Bold Ideas Growth Club", html },
      { jobId: key, attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
    );
    await prisma.communityDelivery.update({
      where: { id: delivery.id },
      data: { status: 'QUEUED', claimedAt: now },
    });
    queued += 1;
  }
  return { newPosts: posts.length, queued };
}

export const communityDigestWorker = createWorker(QUEUE_NAMES.COMMUNITY_DIGEST, async () =>
  sweepCommunityDigest(),
);

/** Register the repeatable community digest (idempotent across restarts). */
export async function scheduleCommunityDigest() {
  await communityDigestQueue.add(
    JOB_ID,
    {},
    { repeat: { pattern: REPEAT_PATTERN }, jobId: JOB_ID, removeOnComplete: 100 },
  );
}
