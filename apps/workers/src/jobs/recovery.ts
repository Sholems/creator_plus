import { prisma } from '@creatormarket/database';
import { renderAbandonedCartEmail } from '@creatormarket/email';
import { QUEUE_NAMES, createWorker, emailQueue, recoveryQueue } from '../queues';

/**
 * Abandoned-cart recovery. A repeatable job runs every few hours and finds
 * carts that went quiet more than 24h ago (and no earlier than 24-30h ago),
 * then queues a single recovery email per cart. The narrow time window is the
 * dedupe: once a cart is emailed it falls out of range until the buyer adds
 * more items (which bumps updatedAt), so nobody is spammed twice.
 */

const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000; // no activity for 24h
const WINDOW_MS = 6 * 60 * 60 * 1000; // only the first run after 24h of quiet
const REPEAT_PATTERN = '0 */3 * * *'; // every 3 hours
const JOB_ID = 'recover-abandoned-carts';

const CART_URL = `${process.env.WEB_URL || 'https://mycreatorplus.com'}/cart`;

async function recoverAbandonedCarts(): Promise<{ scanned: number }> {
  const now = Date.now();
  const quietSince = new Date(now - ABANDON_AFTER_MS);
  const windowStart = new Date(now - ABANDON_AFTER_MS - WINDOW_MS);

  const carts = await prisma.cart.findMany({
    where: {
      userId: { not: null },
      updatedAt: { gte: windowStart, lt: quietSince },
      items: { some: {} },
    },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      items: {
        include: {
          product: { select: { id: true, title: true, price: true, slug: true } },
        },
      },
    },
  });

  for (const cart of carts) {
    const user = cart.user;
    if (!user?.email) continue;

    // If the buyer checked out recently, don't chase the leftover cart.
    const recentOrder = await prisma.order.findFirst({
      where: { buyerId: user.id, createdAt: { gte: windowStart } },
      select: { id: true },
    });
    if (recentOrder) continue;

    const html = renderAbandonedCartEmail({
      name: user.displayName || 'there',
      items: cart.items.map((i) => ({
        title: i.product.title,
        price: i.product.price.toNumber(),
      })),
      cartUrl: CART_URL,
    });

    await emailQueue.add(
      'send',
      {
        to: user.email,
        subject: 'Your CreatorPlus cart is still waiting for you',
        html,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
    );
  }

  return { scanned: carts.length };
}

export const recoveryWorker = createWorker(QUEUE_NAMES.RECOVERY, async () => {
  return recoverAbandonedCarts();
});

/** Register the repeatable recovery sweep (idempotent across restarts). */
export async function scheduleRecovery() {
  await recoveryQueue.add(
    JOB_ID,
    {},
    { repeat: { pattern: REPEAT_PATTERN }, jobId: JOB_ID, removeOnComplete: 100 },
  );
}
