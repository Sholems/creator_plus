import { Injectable, Logger } from '@nestjs/common';
import { prisma, Prisma } from '@creatormarket/database';
import type { AcquisitionSource } from '@creatormarket/database';
import {
  round2,
  allocateDiscount,
} from './commission-math';
import { calculateItemCommission } from './commission-calculator';

export interface CommissionSettings {
  /** Fallback affiliate reward (percent) for legacy products without a rate. */
  affiliateRate: Prisma.Decimal;
  /** The platform's commission on every sale (percent of the commission basis). */
  platformRate: Prisma.Decimal;
  holdingDays: number;
  cookieDays: number;
  minPayout: Prisma.Decimal;
}

export interface ReverseOrderResult {
  /** Creator net per `creatorProfile.id`, proportional to `ratio`, to claw back. */
  creatorNets: Map<string, Prisma.Decimal>;
  reversedConversions: number;
}

/**
 * The money engine for commissions. One `recordCommissions` call per fulfilled
 * order writes the immutable CommissionLedger, the creator Commission rows and
 * (when an affiliate is attributed) the AffiliateConversion rows — all inside
 * the caller's transaction, so a failure can never leave partial money state.
 *
 * Every line's split is computed by `calculateItemCommission` (the single
 * calculator): platform fee on the paid basis, affiliate reward (the creator's
 * per-product rate) deducted from the creator's share, creator as residual.
 */
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  async getSettings(tx?: Prisma.TransactionClient): Promise<CommissionSettings> {
    const client: Prisma.TransactionClient | typeof prisma = tx ?? prisma;
    const keys = await client.systemSetting.findMany({
      where: {
        key: {
          in: [
            'affiliate.commission_rate',
            'commission.platform_rate',
            'affiliate.holding_days',
            'affiliate.cookie_days',
            'affiliate.min_payout',
          ],
        },
      },
    });
    const map = new Map(keys.map((k) => [k.key, k.value]));
    const num = (key: string, fallback: number) => {
      const raw = map.get(key);
      const value = raw === undefined || raw === null ? undefined : Number(raw);
      return value !== undefined && Number.isFinite(value) ? value : fallback;
    };
    return {
      affiliateRate: new Prisma.Decimal(num('affiliate.commission_rate', 20)),
      platformRate: new Prisma.Decimal(num('commission.platform_rate', 10)),
      holdingDays: Math.max(0, Math.floor(num('affiliate.holding_days', 14))),
      cookieDays: Math.max(1, Math.floor(num('affiliate.cookie_days', 30))),
      minPayout: new Prisma.Decimal(num('affiliate.min_payout', 1000)),
    };
  }

  /**
   * Record the commission split for every item of a fulfilled order.
   *
   * Returns the total creator net per `creatorProfile.id` so the caller can
   * credit wallets inside the same transaction. Mutates denormalised counters
   * on Affiliate / AffiliateLink.
   */
  async recordCommissions(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      buyerId: string;
      currency?: string;
      acquisitionSource?: AcquisitionSource;
      utm?: { campaign?: string | null; source?: string | null; medium?: string | null };
      items: Array<{
        id: string;
        productId: string;
        totalPrice: Prisma.Decimal;
        product: {
          id: string;
          title: string;
          creatorId: string;
          affiliateCommissionRate: number | null;
        };
      }>;
    },
    orderTotal: Prisma.Decimal,
    gateway?: {
      provider?: string | null;
      fee?: Prisma.Decimal | null;
      currency?: string | null;
      reference?: string | null;
    },
  ) {
    const settings = await this.getSettings(tx);

    // Which products were actually attributed to an affiliate (last-click)?
    const attributions = await tx.affiliateAttribution.findMany({
      where: { orderId: order.id },
      include: {
        link: { include: { product: { select: { affiliateStatus: true } } } },
        affiliate: { select: { id: true, userId: true, status: true } },
      },
    });
    const attribByProduct = new Map(attributions.map((a) => [a.productId, a]));

    const listTotal = order.items.reduce(
      (sum, i) => sum.add(i.totalPrice),
      new Prisma.Decimal(0),
    );
    const discountTotal = round2(listTotal.sub(orderTotal));
    const discounts = allocateDiscount(
      order.items.map((i) => ({ total: i.totalPrice })),
      discountTotal.isNegative() ? new Prisma.Decimal(0) : discountTotal,
    );

    const currency = order.currency ?? 'NGN';

    const creatorCredits = new Map<string, Prisma.Decimal>();
    const ledgerRows: Prisma.CommissionLedgerUncheckedCreateInput[] = [];
    const commissionRows: Prisma.CommissionUncheckedCreateInput[] = [];
    const conversionRows: Prisma.AffiliateConversionUncheckedCreateInput[] = [];
    const linkStats = new Map<
      string,
      { count: number; gross: Prisma.Decimal; earnings: Prisma.Decimal }
    >();
    const affiliateStats = new Map<string, { count: number }>();

    order.items.forEach((item, idx) => {
      const attribution = attribByProduct.get(item.productId);

      let attributed = false;
      let affiliateId: string | null = null;
      let linkId: string | null = null;
      if (
        attribution &&
        attribution.affiliate.status === 'ACTIVE' &&
        attribution.link.status === 'ACTIVE' &&
        attribution.link.product.affiliateStatus === 'APPROVED' &&
        attribution.affiliate.userId !== order.buyerId
      ) {
        attributed = true;
        affiliateId = attribution.affiliateId;
        linkId = attribution.linkId;
      }

      const { split, acquisitionSource } = calculateItemCommission({
        gross: item.totalPrice,
        discount: discounts[idx],
        platformRate: settings.platformRate,
        productAffiliateRate: item.product.affiliateCommissionRate,
        attributed,
        acquisition: {
          utmCampaign: order.utm?.campaign,
          utmSource: order.utm?.source,
          utmMedium: order.utm?.medium,
          explicit: order.acquisitionSource ?? null,
        },
      });

      ledgerRows.push({
        orderId: order.id,
        orderItemId: item.id,
        productId: item.product.id,
        orderAmount: split.gross,
        discountAmount: split.discount,
        paidAmount: split.paid,
        platformRate: split.platformRate,
        platformAmount: split.platformAmount,
        affiliateId: attributed ? affiliateId : null,
        affiliateRate: split.affiliateRate,
        affiliateAmount: split.affiliateAmount,
        creatorId: item.product.creatorId,
        creatorRate: split.creatorRate,
        creatorAmount: split.creatorAmount,
        currency,
        acquisitionSource,
        gatewayProvider: gateway?.provider ?? null,
        gatewayFee: gateway?.fee ?? null,
        gatewayCurrency: gateway?.currency ?? null,
        gatewayReference: gateway?.reference ?? null,
      });

      commissionRows.push({
        orderId: order.id,
        orderItemId: item.id,
        creatorId: item.product.creatorId,
        amount: split.platformAmount,
        rate: split.platformRate,
        status: 'PENDING' as const,
      });

      if (attributed && affiliateId && linkId) {
        conversionRows.push({
          affiliateId,
          linkId,
          orderId: order.id,
          orderItemId: item.id,
          orderAmount: split.gross,
          amount: split.affiliateAmount,
          rate: split.affiliateRate as Prisma.Decimal,
          creatorAmount: split.creatorAmount,
          platformAmount: split.platformAmount,
          status: 'PENDING' as const,
          heldUntil: new Date(
            Date.now() + settings.holdingDays * 24 * 60 * 60 * 1000,
          ),
        });

        const link = linkStats.get(linkId) ?? {
          count: 0,
          gross: new Prisma.Decimal(0),
          earnings: new Prisma.Decimal(0),
        };
        link.count += 1;
        link.gross = link.gross.add(split.gross);
        link.earnings = link.earnings.add(split.affiliateAmount);
        linkStats.set(linkId, link);

        const aff = affiliateStats.get(affiliateId) ?? { count: 0 };
        aff.count += 1;
        affiliateStats.set(affiliateId, aff);
      }

      creatorCredits.set(
        item.product.creatorId,
        (creatorCredits.get(item.product.creatorId) ?? new Prisma.Decimal(0)).add(
          split.creatorAmount,
        ),
      );
    });

    await tx.commissionLedger.createMany({ data: ledgerRows });
    await tx.commission.createMany({ data: commissionRows });
    if (conversionRows.length > 0) {
      await tx.affiliateConversion.createMany({ data: conversionRows });
    }

    for (const [affiliateId, s] of affiliateStats) {
      await tx.affiliate.update({
        where: { id: affiliateId },
        data: { totalConversions: { increment: s.count } },
      });
    }
    for (const [linkId, s] of linkStats) {
      await tx.affiliateLink.update({
        where: { id: linkId },
        data: {
          conversionCount: { increment: s.count },
          grossSales: { increment: s.gross },
          commissionEarned: { increment: s.earnings },
        },
      });
    }

    return {
      creatorCredits: [...creatorCredits.entries()].map(([creatorId, amount]) => ({
        creatorId,
        amount: round2(amount),
      })),
      affiliateConversionCount: conversionRows.length,
    };
  }

  /**
   * Release conversions whose holding period has elapsed: PENDING -> PAYABLE
   * (released, eligible for payout) and fold them into the affiliate's running
   * earnings. Lazy — called on affiliate dashboard reads and admin views, no
   * scheduler required.
   */
  async releaseDueConversions(affiliateId?: string) {
    const now = new Date();
    const due = await prisma.affiliateConversion.findMany({
      where: {
        status: 'PENDING',
        heldUntil: { lte: now },
        ...(affiliateId ? { affiliateId } : {}),
      },
      select: { id: true, affiliateId: true, amount: true },
    });
    if (due.length === 0) return 0;

    const byAffiliate = new Map<string, Prisma.Decimal>();
    for (const row of due) {
      byAffiliate.set(
        row.affiliateId,
        (byAffiliate.get(row.affiliateId) ?? new Prisma.Decimal(0)).add(
          row.amount,
        ),
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.affiliateConversion.updateMany({
        where: { id: { in: due.map((d) => d.id) } },
        data: { status: 'PAYABLE', releasedAt: now, payableAt: now },
      });
      for (const [affiliateId, amount] of byAffiliate) {
        await tx.affiliate.update({
          where: { id: affiliateId },
          data: { totalEarnings: { increment: round2(amount) } },
        });
      }
    });

    return due.length;
  }

  /**
   * Reverse (part of) a single conversion — refund, fraud, or admin action.
   * `amount` defaults to the full remaining value. Adjusts the affiliate's
   * denormalised counters to stay consistent with the source rows.
   */
  async reverseConversion(
    tx: Prisma.TransactionClient,
    conversionId: string,
    reason: string,
    amount?: Prisma.Decimal,
  ) {
    const conversion = await tx.affiliateConversion.findUnique({
      where: { id: conversionId },
    });
    if (!conversion) return null;
    if (conversion.status === 'REVERSED') return conversion;

    const remaining = conversion.amount.sub(conversion.reversalAmount);
    const requested = amount !== undefined ? round2(amount) : remaining;
    const effective = requested.greaterThan(remaining) ? remaining : requested;
    if (effective.isZero() || effective.isNegative()) return conversion;

    const wasReleased = ['APPROVED', 'PAYABLE', 'PAID'].includes(
      conversion.status,
    );
    const newReversalAmount = round2(conversion.reversalAmount.add(effective));
    const fullyReversed = newReversalAmount.greaterThanOrEqualTo(
      conversion.amount,
    );

    const updated = await tx.affiliateConversion.update({
      where: { id: conversionId },
      data: {
        reversalAmount: newReversalAmount,
        ...(fullyReversed
          ? { status: 'REVERSED', reversedAt: new Date(), reversalReason: reason }
          : {}),
      },
    });

    await tx.affiliate.update({
      where: { id: conversion.affiliateId },
      data: {
        ...(fullyReversed ? { totalConversions: { decrement: 1 } } : {}),
        ...(wasReleased ? { totalEarnings: { decrement: effective } } : {}),
      },
    });

    if (conversion.linkId) {
      await tx.affiliateLink.update({
        where: { id: conversion.linkId },
        data: {
          ...(fullyReversed ? { conversionCount: { decrement: 1 } } : {}),
          grossSales: {
            decrement: round2(
              conversion.orderAmount.mul(effective).div(conversion.amount),
            ),
          },
          commissionEarned: { decrement: effective },
        },
      });
    }

    return updated;
  }

  /**
   * Reverse conversions for an order, proportionally to `ratio` (default: all
   * of it). Used by refund approval and provider-initiated refunds.
   */
  async reverseOrderConversions(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
    ratio: Prisma.Decimal = new Prisma.Decimal(1),
  ) {
    const conversions = await tx.affiliateConversion.findMany({
      where: {
        orderId,
        status: { in: ['PENDING', 'APPROVED', 'PAYABLE', 'PAID'] },
      },
      select: { id: true, amount: true },
    });
    for (const c of conversions) {
      await this.reverseConversion(tx, c.id, reason, round2(c.amount.mul(ratio)));
    }
    return conversions.length;
  }

  /**
   * Reverse every money record for a refunded order: affiliate conversions and
   * platform Commission rows, proportionally to `ratio`. Returns the creator
   * net per `creatorProfile.id` (from the immutable ledger) so the caller can
   * claw back the exact credited amount inside the same transaction.
   */
  async reverseOrderCommissions(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
    ratio: Prisma.Decimal = new Prisma.Decimal(1),
  ): Promise<ReverseOrderResult> {
    const reversedConversions = await this.reverseOrderConversions(
      tx,
      orderId,
      reason,
      ratio,
    );

    const commissions = await tx.commission.findMany({
      where: { orderId, status: { in: ['PENDING', 'APPROVED'] } },
      select: { id: true },
    });
    if (commissions.length > 0) {
      await tx.commission.updateMany({
        where: { id: { in: commissions.map((c) => c.id) } },
        data: { status: 'REVERSED' },
      });
    }

    const ledgerRows = await tx.commissionLedger.findMany({
      where: { orderId },
      select: { creatorId: true, creatorAmount: true },
    });
    const creatorNets = new Map<string, Prisma.Decimal>();
    for (const row of ledgerRows) {
      const amount = round2(row.creatorAmount.mul(ratio));
      creatorNets.set(
        row.creatorId,
        (creatorNets.get(row.creatorId) ?? new Prisma.Decimal(0)).add(amount),
      );
    }

    return { creatorNets, reversedConversions };
  }
}
