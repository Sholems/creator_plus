import { prisma } from '@creatorplus/database';
import { QUEUE_NAMES, createWorker, membershipQueue } from '../queues';

/**
 * Daily membership hygiene sweep. Access is already gated by
 * `currentPeriodEnd > now`, so this only flips lapsed rows to EXPIRED for clean
 * reporting: PAST_DUE past a short grace, and cancel-at-period-end rows whose
 * period has ended.
 */
const REPEAT_PATTERN = '0 3 * * *'; // 03:00 daily
const JOB_ID = 'membership-sweep';
const GRACE_DAYS = Number(process.env.MEMBERSHIP_GRACE_DAYS) || 3;

async function sweep() {
  const now = new Date();
  const graceCut = new Date(now.getTime() - GRACE_DAYS * 86_400_000);
  const res = await prisma.membershipSubscription.updateMany({
    where: {
      OR: [
        { status: 'PAST_DUE', currentPeriodEnd: { lt: graceCut } },
        { status: { in: ['ACTIVE', 'CANCELED'] }, cancelAtPeriodEnd: true, currentPeriodEnd: { lt: now } },
      ],
    },
    data: { status: 'EXPIRED' },
  });
  return { expired: res.count };
}

export const membershipWorker = createWorker(QUEUE_NAMES.MEMBERSHIP, async () => sweep());

/** Register the repeatable membership sweep (idempotent across restarts). */
export async function scheduleMembershipSweep() {
  await membershipQueue.add(
    JOB_ID,
    {},
    { repeat: { pattern: REPEAT_PATTERN }, jobId: JOB_ID, removeOnComplete: 100 },
  );
}
