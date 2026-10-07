/**
 * One-off, idempotent migration: grant a complimentary community membership to
 * everyone who currently holds an active QR Studio Pro pass, so the pivot (QR =
 * membership perk) never cuts off someone who already paid.
 *
 * Usage (from packages/database, with the target DB in DATABASE_URL):
 *   DATABASE_URL="postgres://…" npx ts-node scripts/grandfather-qr-to-membership.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GOODWILL_DAYS = 365; // comp access runs to at least a year out

async function main() {
  const now = new Date();

  const plan = await prisma.membershipPlan.findFirst({
    where: { isActive: true },
    include: { prices: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!plan || plan.prices.length === 0) {
    console.error('No active membership plan/price found. Boot the API once so the default plan seeds, then re-run.');
    process.exit(1);
  }
  const price = plan.prices[0];

  // Active QR Pro passes, newest expiry first → keep the latest per user.
  const passes = await prisma.qrEntitlement.findMany({
    where: { kind: 'PRO_PASS', status: 'ACTIVE', expiresAt: { gt: now } },
    orderBy: { expiresAt: 'desc' },
    select: { userId: true, expiresAt: true },
  });
  const latestByUser = new Map<string, Date>();
  for (const p of passes) {
    const cur = latestByUser.get(p.userId);
    if (!cur || p.expiresAt > cur) latestByUser.set(p.userId, p.expiresAt);
  }

  let granted = 0;
  let skipped = 0;
  for (const [userId, qrExpiry] of latestByUser) {
    const activeMember = await prisma.membershipSubscription.count({
      where: { userId, status: { in: ['ACTIVE', 'PAST_DUE'] }, currentPeriodEnd: { gt: now } },
    });
    const alreadyGrandfathered = await prisma.membershipSubscription.findFirst({
      where: { userId, provider: 'grandfather' },
      select: { id: true },
    });
    if (activeMember > 0 || alreadyGrandfathered) {
      skipped++;
      continue;
    }

    const periodEnd = new Date(Math.max(qrExpiry.getTime(), now.getTime() + GOODWILL_DAYS * 86_400_000));
    await prisma.membershipSubscription.create({
      data: {
        userId,
        planId: plan.id,
        priceId: price.id,
        provider: 'grandfather',
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: true, // comp grant — it won't auto-renew (no provider)
        providerReference: `grandfather:qr:${userId}`,
      },
    });
    granted++;
  }

  console.log(`✔ Grandfathered ${granted} QR Pro user(s) into membership; skipped ${skipped} (already members / already done).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
