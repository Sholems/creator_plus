import { Prisma } from '@creatormarket/database';
import type { AcquisitionSource } from '@creatormarket/database';
import {
  Decimal,
  ItemSplit,
  computeItemSplit,
  classifyAcquisition,
  round2,
} from './commission-math';

/**
 * Central commission calculator — the single source of truth for how a sale is
 * split between platform, affiliate and creator.
 *
 * The affiliate reward is a creator-chosen whole percent per product. The MVP
 * exposes the discrete set below; every other value is rejected at the DTO and
 * product-service boundary, so fulfillment can trust the stored value.
 */
export const AFFILIATE_COMMISSION_RATES = [20, 25, 30, 35, 40, 50] as const;
export type AffiliateCommissionRate = (typeof AFFILIATE_COMMISSION_RATES)[number];
export const DEFAULT_AFFILIATE_COMMISSION_RATE: AffiliateCommissionRate = 20;

/** Platform fee is a platform-wide setting; 10% is the canonical default. */
export const DEFAULT_PLATFORM_RATE = 10;

/** The creator must keep something; a 100% platform+affiliate split is invalid. */
export const MAX_AFFILIATE_RATE = 50;

export function isAllowedAffiliateRate(rate: number): boolean {
  return (AFFILIATE_COMMISSION_RATES as readonly number[]).includes(rate);
}

/**
 * The effective reward percent for a sale: the product's stored rate when an
 * affiliate is attributed, otherwise 0. Legacy products without a stored rate
 * fall back to the platform default of 20%.
 */
export function effectiveAffiliateRate(
  productRate: number | null | undefined,
  attributed: boolean,
): number {
  if (!attributed) return 0;
  if (productRate != null && isAllowedAffiliateRate(productRate)) {
    return productRate;
  }
  return DEFAULT_AFFILIATE_COMMISSION_RATE;
}

export interface CalculateCommissionInput {
  /** List value of the line (unitPrice * quantity). */
  gross: Decimal;
  /** The line's pro-rata share of the order coupon discount. */
  discount: Decimal;
  platformRate: Decimal;
  /** Product.affiliateCommissionRate (percent) — the creator's chosen reward. */
  productAffiliateRate: number | null | undefined;
  attributed: boolean;
  acquisition?: {
    utmCampaign?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    explicit?: AcquisitionSource | null;
  };
}

export interface CalculateCommissionResult {
  split: ItemSplit;
  /** Effective affiliate reward rate used for this line (snapshot source). */
  effectiveAffiliateRate: number;
  acquisitionSource: AcquisitionSource;
}

/**
 * Compute the full split for one order line. Never throws for validated data;
 * the only defensive clamp is in computeItemSplit (rates summing past 100%).
 */
export function calculateItemCommission(
  input: CalculateCommissionInput,
): CalculateCommissionResult {
  const affiliateRate = effectiveAffiliateRate(
    input.productAffiliateRate,
    input.attributed,
  );
  const split = computeItemSplit({
    gross: input.gross,
    discount: input.discount,
    platformRate: input.platformRate,
    affiliateRate: new Prisma.Decimal(affiliateRate),
  });
  return {
    split,
    effectiveAffiliateRate: affiliateRate,
    acquisitionSource: classifyAcquisition({
      attributed: input.attributed,
      utmCampaign: input.acquisition?.utmCampaign,
      utmSource: input.acquisition?.utmSource,
      utmMedium: input.acquisition?.utmMedium,
      explicit: input.acquisition?.explicit,
    }),
  };
}

/** Round a money value to kobo at the API boundary. */
export function toDisplayNumber(value: Decimal): number {
  return round2(value).toNumber();
}
