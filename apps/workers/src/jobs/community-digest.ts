import { prisma } from '@creatorplus/database';
import { renderEmailLayout } from '@creatorplus/email';
import { QUEUE_NAMES, createWorker, emailQueue, communityDigestQueue } from '../queues';

/**
 * Daily community digest: if anything was posted in the last 24h, email active
 * members a short summary with links. Skips quietly when there's no new
 * activity so members never get an empty email.
 */
const REPEAT_PATTERN = '0 8 * * *'; // 08:00 daily
const JOB_ID = 'community-digest';
const WEB = process.env.WEB_URL || 'https://mycreatorplus.com';

async function sweep() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const posts = await prisma.communityPost.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { author: { select: { displayName: true } } },
  });
  if (posts.length === 0) return { newPosts: 0, queued: 0 };

  // Recipients: members with access right now.
  const subs = await prisma.membershipSubscription.findMany({
    where: { status: { in: ['ACTIVE', 'PAST_DUE'] }, currentPeriodEnd: { gt: new Date() } },
    select: { userId: true },
  });
  const userIds = [...new Set(subs.map((s) => s.userId))];
  if (userIds.length === 0) return { newPosts: posts.length, queued: 0 };
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true } });

  const items = posts
    .map(
      (p) =>
        `<li style="margin:8px 0"><a href="${WEB}/community/post/${p.id}"><strong>${p.title}</strong></a> — by ${p.author.displayName || 'a member'}</li>`,
    )
    .join('');
  const html = renderEmailLayout({
    preview: `${posts.length} new post${posts.length > 1 ? 's' : ''} in the community`,
    eyebrow: 'Community digest',
    title: "What's new in the community",
    body: `<p>Here's what members shared in the last day:</p><ul style="padding-left:18px">${items}</ul>`,
    cta: { label: 'Open the community', url: `${WEB}/community/discussion` },
  });

  let queued = 0;
  for (const u of users) {
    if (!u.email) continue;
    await emailQueue.add(
      'send',
      { to: u.email, subject: "What's new in the community", html },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
    );
    queued++;
  }
  return { newPosts: posts.length, queued };
}

export const communityDigestWorker = createWorker(QUEUE_NAMES.COMMUNITY_DIGEST, async () => sweep());

/** Register the repeatable community digest (idempotent across restarts). */
export async function scheduleCommunityDigest() {
  await communityDigestQueue.add(
    JOB_ID,
    {},
    { repeat: { pattern: REPEAT_PATTERN }, jobId: JOB_ID, removeOnComplete: 100 },
  );
}
