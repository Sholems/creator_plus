import { Prisma } from '@creatormarket/database';

/**
 * Debit back the exact creator net that fulfillment credited for an order, per
 * `creatorProfile.id`. Shared by provider-initiated refunds and admin-approved
 * refunds so both reversal paths stay identical. Must run inside the caller's
 * transaction.
 *
 * If the creator has already withdrawn, the balance may go negative — that is a
 * deliberate clawback debt and payouts must refuse to pay out a negative or
 * already-reserved balance.
 */
export async function clawBackCreatorCredits(
  tx: Prisma.TransactionClient,
  orderId: string,
  creatorNets: Map<string, Prisma.Decimal>,
  referenceId: string = orderId,
) {
  const profileIds = [...creatorNets.keys()];
  if (profileIds.length === 0) return;

  const profiles = await tx.creatorProfile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, userId: true },
  });
  const userIdByProfile = new Map(profiles.map((p) => [p.id, p.userId]));

  for (const [profileId, amount] of creatorNets) {
    const creatorUserId = userIdByProfile.get(profileId);
    if (!creatorUserId || amount.isZero()) continue;

    const wallet = await tx.wallet.findUnique({ where: { userId: creatorUserId } });
    if (!wallet) continue;

    const before = wallet.availableBalance;
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: amount },
        lifetimeEarnings: { decrement: amount },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'REFUND',
        amount: amount.neg(),
        balanceBefore: before,
        balanceAfter: before.sub(amount),
        description: 'Sale refunded',
        referenceType: 'REFUND',
        referenceId,
      },
    });
  }
}
