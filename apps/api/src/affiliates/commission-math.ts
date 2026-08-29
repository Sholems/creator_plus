import { Prisma } from '@creatorplus/database';
import type { AcquisitionSource } from '@creatorplus/database';

/**
 * Pure commission-split math. Everything stays in Prisma.Decimal so no binary
 * float rounding is ever introduced mid-calculation; values are rounded to
 * kobo (2dp) only at the boundary of each share.
 *
 * Economics (single source of truth for every sale, affiliate or not):
 *   - The commission basis is the amount the buyer actually paid for the line
 *     (gross minus the line's pro-rata coupon discount).
 *   - The platform fee is always `platformRate`% of that basis — the affiliate
 *     share can never eat into the platform's cut.
 *   - The affiliate reward is deducted from the creator's side.
 *   - The creator nets the residual: creator = basis - platform - affiliate.
 *
 * Invariant for reconciliation:
 *   platformAmount + affiliateAmount + creatorAmount === paid
 */

export type Decimal = Prisma.Decimal;

export const round2 = (d: Decimal): Decimal => d.toDecimalPlaces(2);

export interface ItemSplit {
  /** List-price value of the item (unitPrice * quantity). */
  gross: Decimal;
  /** This item's pro-rata share of the order-level coupon discount. */
  discount: Decimal;
  /** Commission basis — the amount the buyer actually paid for the item. */
  paid: Decimal;
  platformRate: Decimal;
  platformAmount: Decimal;
  /** Effective affiliate reward rate (0 when no affiliate is attributed). */
  affiliateRate: Decimal;
  affiliateAmount: Decimal;
  creatorRate: Decimal;
  creatorAmount: Decimal;
  attributed: boolean;
}

/**
 * Split a single order line on its commission basis (`paid`). Uniform for all
 * acquisition sources: the platform fee is always taken first on the basis,
 * the affiliate reward (0 for direct sales) is deducted from the creator's
 * share, and the creator is the residual. The three shares always sum exactly
 * to `paid` with no rounding drift.
 */
export function computeItemSplit(input: {
  gross: Decimal;
  discount: Decimal;
  platformRate: Decimal;
  affiliateRate: Decimal;
}): ItemSplit {
  const gross = round2(input.gross);
  const discount = round2(input.discount);
  const paid = round2(gross.sub(discount)).isNegative()
    ? new Prisma.Decimal(0)
    : round2(gross.sub(discount));
  const platformRate = round2(input.platformRate);
  const affiliateRate = round2(input.affiliateRate);
  const attributed = affiliateRate.greaterThan(0);

  const platformAmount = round2(paid.mul(platformRate).div(100));

  // Creator is always the residual; if rates ever exceeded 100% the affiliate
  // share is clamped so the platform fee is never reduced.
  const creatorCap = round2(paid.sub(platformAmount));
  let affiliateAmount = round2(paid.mul(affiliateRate).div(100));
  if (affiliateAmount.greaterThan(creatorCap)) {
    affiliateAmount = creatorCap;
  }
  const creatorAmount = round2(paid.sub(platformAmount).sub(affiliateAmount));
  const creatorRate = round2(
    new Prisma.Decimal(100).sub(platformRate).sub(affiliateRate),
  );

  return {
    gross,
    discount,
    paid,
    platformRate,
    platformAmount,
    affiliateRate,
    affiliateAmount,
    creatorRate,
    creatorAmount,
    attributed,
  };
}

/**
 * Classify where a sale came from for analytics. Attribution to an affiliate
 * wins; otherwise a platform marketing campaign (utm parameters) is recorded;
 * otherwise the source is UNKNOWN (the creator_direct / marketplace_organic
 * distinction is only meaningful when the caller can observe it, e.g. via an
 * explicit source hint). Every source pays the identical commission split.
 */
export function classifyAcquisition(input: {
  attributed: boolean;
  utmCampaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  explicit?: AcquisitionSource | null;
}): AcquisitionSource {
  if (input.explicit) return input.explicit;
  if (input.attributed) return 'AFFILIATE';
  if (input.utmCampaign || input.utmSource || input.utmMedium) {
    return 'PLATFORM_CAMPAIGN';
  }
  return 'UNKNOWN';
}

/**
 * Apportion an order-level coupon discount across line items pro-rata to their
 * list totals. Returns one discount per item, rounded to kobo, with the
 * rounding remainder folded into the last item so the returned values sum
 * exactly to `discountTotal`.
 */
export function allocateDiscount(
  items: { total: Decimal }[],
  discountTotal: Decimal,
): Decimal[] {
  if (items.length === 0) return [];
  const total = round2(discountTotal);
  if (total.isZero()) return items.map(() => new Prisma.Decimal(0));

  const grossTotal = items.reduce(
    (sum, i) => sum.add(i.total),
    new Prisma.Decimal(0),
  );
  if (grossTotal.isZero()) return items.map(() => new Prisma.Decimal(0));

  const shares = items.map((i) => round2(i.total.mul(total).div(grossTotal)));
  const sum = shares.reduce((acc, s) => acc.add(s), new Prisma.Decimal(0));
  const diff = total.sub(sum);
  shares[shares.length - 1] = round2(shares[shares.length - 1].add(diff));
  return shares;
}
