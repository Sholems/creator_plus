import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { prisma, Prisma } from '@creatorplus/database';
import { v4 as uuidv4 } from 'uuid';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { WebhookEvent } from './providers/payment-provider.interface';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionService } from '../affiliates/commission.service';
import { EventsService } from '../events/events.service';
import { LicensesService } from '../licenses/licenses.service';
import { clawBackCreatorCredits } from '../common/money-reversal';
import { groupBy } from '../common/group-by';
import { webBaseUrl } from '../common/urls';

// Order statuses that mean "already fulfilled" — used by the atomic claim so a
// duplicate/concurrent webhook can never double-process an order.
const FULFILLED_STATUSES: Prisma.OrderWhereInput['status'] = {
  notIn: ['PAID', 'FULFILLED', 'COMPLETED', 'REFUNDED'],
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly commissionService: CommissionService,
    private readonly licensesService: LicensesService,
    private readonly eventsService: EventsService,
  ) {}

  private readonly logger = new Logger(PaymentsService.name);

  async createCheckoutSession(
    orderId: string,
    buyerId: string,
    buyerEmail: string,
    providerName?: string,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Not authorized to pay for this order');
    }

    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new BadRequestException(
        `Order cannot be paid in its current state (${order.status})`,
      );
    }

    const webBase = webBaseUrl();

    // Free order (e.g. a 100% coupon brings the total to ₦0). No provider can
    // charge zero — Paystack rejects it with "Invalid Amount Sent" — so fulfill
    // the order directly, exactly as a confirmed payment would.
    if (order.totalAmount.lte(0)) {
      await prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          amount: 0,
          currency: order.currency || 'NGN',
          status: 'SUCCEEDED',
          provider: 'free',
        },
        update: { amount: 0, status: 'SUCCEEDED', provider: 'free' },
      });
      await this.fulfillOrder(order.id);
      return {
        provider: 'free',
        free: true,
        url: `${webBase}/checkout/success?orderId=${order.id}&provider=free`,
        orderId: order.id,
      };
    }

    const provider = this.providerFactory.get(providerName);
    const platformFeePercent = (await this.commissionService.getSettings())
      .platformRate.toNumber();

    let result;
    try {
      result = await provider.createCheckout({
        orderId: order.id,
        buyerEmail,
        currency: order.currency || 'NGN',
        totalAmount: order.totalAmount.toNumber(),
        items: order.items.map((item) => ({
          productId: item.productId,
          title: item.product.title || item.productName || 'Product',
          unitPrice: item.unitPrice.toNumber(),
          quantity: item.quantity,
        })),
        successUrl: `${webBase}/checkout/success?orderId=${order.id}&provider=${provider.name}`,
        cancelUrl: `${webBase}/cart`,
        platformFeePercent,
      });
    } catch (err: any) {
      // Providers throw plain Errors (e.g. Paystack "Invalid Amount Sent"). Log
      // it and surface a clean message instead of a bare 500.
      this.logger.error(`[checkout:${provider.name}] ${err?.message}`);
      throw new BadRequestException(
        err?.message || `Could not start ${provider.name} checkout. Please try again.`,
      );
    }

    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        amount: order.totalAmount,
        currency: order.currency || 'NGN',
        status: 'PENDING',
        provider: provider.name,
        providerPaymentId: result.providerPaymentId,
        providerResponse: { redirectUrl: result.redirectUrl, reference: result.providerReference },
        stripeSessionId: provider.name === 'stripe' ? result.providerPaymentId : undefined,
      },
      update: {
        provider: provider.name,
        providerPaymentId: result.providerPaymentId,
        providerResponse: { redirectUrl: result.redirectUrl, reference: result.providerReference },
        stripeSessionId: provider.name === 'stripe' ? result.providerPaymentId : undefined,
      },
    });

    return {
      provider: provider.name,
      url: result.redirectUrl,
      orderId: order.id,
    };
  }

  async handleWebhook(providerName: string, rawBody: any, signature?: string) {
    const provider = this.providerFactory.get(providerName);

    if (!provider.verifyWebhook(rawBody, signature)) {
      throw new BadRequestException('Webhook signature verification failed');
    }

    let payload: any;
    try {
      const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      payload = typeof rawString === 'string' ? JSON.parse(rawString) : rawString;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const event: WebhookEvent | null = provider.parseWebhookEvent(payload);
    if (!event) {
      return { received: true, ignored: true };
    }

    if (event.type === 'checkout.completed') {
      await this.markOrderPaid(event);
    } else if (event.type === 'checkout.failed') {
      await this.markOrderFailed(event);
    } else if (event.type === 'payment.refunded') {
      await this.markOrderRefunded(event);
    }

    return { received: true };
  }

  private async markOrderPaid(event: WebhookEvent) {
    const payment = await this.findPaymentForEvent(event);
    if (!payment) {
      throw new BadRequestException('Payment record not found for webhook event');
    }

    // Defense-in-depth: the signature already proves the event is authentic, but
    // also confirm the amount actually paid matches what we expect to be charged
    // for this order. A mismatch (e.g. a reused reference for a cheaper charge)
    // must never fulfill. Only enforced when the provider reports an amount; the
    // ~1 major-unit tolerance absorbs rounding between minor/major units.
    if (event.amount != null) {
      const expected = payment.amount.toNumber();
      if (Math.abs(event.amount - expected) > 1) {
        this.logger.error(
          `[webhook] amount mismatch for payment ${payment.id}: reported ${event.amount}, expected ${expected}`,
        );
        throw new BadRequestException('Webhook amount does not match the order total');
      }
    }

    // Atomic claim: only the first webhook to arrive flips the payment to
    // SUCCEEDED. Concurrent/duplicate deliveries see count === 0 and bail,
    // so fulfillment runs exactly once.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: { not: 'SUCCEEDED' } },
      data: { status: 'SUCCEEDED' },
    });
    if (claimed.count === 0) return; // duplicate webhook

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerResponse: {
          ...(payment.providerResponse as Record<string, any>),
          webhook: event.raw,
        },
      },
    });

    await this.fulfillOrder(payment.orderId, {
      provider: payment.provider,
      ...this.extractGatewayFee(event),
    });
  }

  /**
   * Best-effort extraction of the gateway processing fee from a webhook event.
   * Fees are recorded on the CommissionLedger separately from the platform
   * commission — the processor's cost is never blended into the commission
   * split. Supports Paystack's `data.fees` (kobo) and generic `fee` payloads.
   */
  private extractGatewayFee(event: WebhookEvent): {
    fee?: Prisma.Decimal | null;
    currency?: string | null;
    reference?: string | null;
  } {
    try {
      const raw = event.raw ?? {};
      const data = raw.data ?? raw;
      let fee: Prisma.Decimal | null = null;

      if (typeof data.fees === 'number' || typeof data.fees === 'string') {
        // Paystack reports fees in kobo (minor units) for NGN.
        fee = new Prisma.Decimal(data.fees).div(100).toDecimalPlaces(2);
      } else if (typeof raw.fee === 'number' || typeof raw.fee === 'string') {
        fee = new Prisma.Decimal(raw.fee).toDecimalPlaces(2);
      }

      return {
        fee,
        currency: data.currency ?? null,
        reference: event.providerReference ?? event.refundId ?? null,
      };
    } catch {
      return { fee: null, currency: null, reference: null };
    }
  }

  /**
   * Complete an order after payment is confirmed: mark it PAID, issue download
   * records, and credit creator wallets and platform commissions — all inside a
   * single database transaction so a failure can never leave partial state.
   *
   * Idempotent and concurrency-safe: the order is claimed with an atomic
   * compare-and-set, so duplicate/parallel webhooks each become a no-op after
   * the first. Best-effort side effects (emails, notifications) run only after
   * the transaction commits and never roll money back.
   *
   * Note: `Commission.creatorId` and `WalletTransaction` are keyed by
   * `creatorProfile.id` (standardized here — see remediation plan C4).
   */
  private async fulfillOrder(
    orderId: string,
    gateway?: {
      provider?: string | null;
      fee?: Prisma.Decimal | null;
      currency?: string | null;
      reference?: string | null;
    },
  ) {
    const order = await prisma.$transaction(async (tx) => {
      // Atomic claim — only the first caller flips the status and proceeds.
      const claim = await tx.order.updateMany({
        where: { id: orderId, status: FULFILLED_STATUSES },
        data: { status: 'PAID' },
      });
      if (claim.count === 0) return null; // already fulfilled elsewhere

      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          buyer: { select: { id: true, email: true, displayName: true } },
        },
      });

      // Download grants for every purchased item.
      await tx.download.createMany({
        data: order.items.map((item) => ({
          orderItemId: item.id,
          productId: item.productId,
          userId: order.buyerId,
          token: uuidv4(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })),
      });

      // Issue license keys for any license-enabled items (no-op otherwise).
      await this.licensesService.issueForOrder(tx, {
        id: order.id,
        buyerId: order.buyerId,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          product: {
            licenseKeysEnabled: i.product.licenseKeysEnabled,
            licenseMaxActivations: i.product.licenseMaxActivations,
            licenseValidityDays: i.product.licenseValidityDays,
          },
        })),
      });

      // Confirm any held event seats now that payment has cleared.
      await this.eventsService.confirmForOrder(tx, order.id);

      // Redeem the coupon exactly once, now that the order is actually paid.
      // (Deferred from apply/create time so abandoned carts and apply-then-remove
      // never consume a use.) The atomic order claim above guarantees this runs
      // once per order. Scoped by the order's product creators to disambiguate
      // codes that different creators may share.
      if (order.couponCode && order.discountAmount && order.discountAmount.gt(0)) {
        const creatorIds = [...new Set(order.items.map((i) => i.product.creatorId))];
        const coupon = await tx.coupon.findFirst({
          where: { code: order.couponCode, creatorId: { in: creatorIds } },
          select: { id: true },
        });
        if (coupon) {
          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId: order.buyerId,
              orderId: order.id,
              amount: order.discountAmount,
            },
          });
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // Commission engine: writes the immutable CommissionLedger, the platform
      // Commission rows and (when an affiliate is attributed) the
      // AffiliateConversion rows for this order, then hands back the exact net
      // each creator earned — the source of truth for the wallet credits below.
      const { creatorCredits } = await this.commissionService.recordCommissions(
        tx,
        {
          id: order.id,
          buyerId: order.buyerId,
          currency: order.currency || 'NGN',
          acquisitionSource: order.acquisitionSource,
          items: order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            totalPrice: i.totalPrice,
            product: {
              id: i.product.id,
              title: i.product.title,
              creatorId: i.product.creatorId,
              affiliateCommissionRate: i.product.affiliateCommissionRate,
            },
          })),
        },
        order.totalAmount,
        gateway,
      );

      const profileIds = creatorCredits.map((c) => c.creatorId);
      const profiles = await tx.creatorProfile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, userId: true },
      });
      const userIdByProfile = new Map(profiles.map((p) => [p.id, p.userId]));

      for (const { creatorId, amount } of creatorCredits) {
        const creatorUserId = userIdByProfile.get(creatorId);
        if (!creatorUserId) continue;

        const wallet = await tx.wallet.upsert({
          where: { userId: creatorUserId },
          update: {},
          create: { userId: creatorUserId },
        });
        const balanceBefore = wallet.availableBalance;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { increment: amount },
            lifetimeEarnings: { increment: amount },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'SALE',
            amount,
            balanceBefore,
            balanceAfter: balanceBefore.add(amount),
            description: 'Product sale',
            referenceType: 'ORDER',
            referenceId: order.id,
          },
        });
      }

      return order;
    });

    if (!order) return; // idempotent no-op

    // Side effects run post-commit; failures here must not undo the sale.
    void this.dispatchFulfillmentNotifications(order);
  }

  /**
   * Best-effort buyer/creator notifications for a freshly fulfilled order.
   * Runs after the fulfillment transaction commits. Never throws into the
   * caller — a broken mailer must not roll back money.
   */
  private async dispatchFulfillmentNotifications(order: {
    id: string;
    totalAmount: Prisma.Decimal;
    buyerId: string;
    buyer: { email: string; displayName: string | null };
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      product: { title: string; slug: string; creatorId: string };
    }>;
  }) {
    try {
    const webBase = webBaseUrl();

      // Event tickets: email the buyer their join link / codes (best-effort).
      void this.eventsService.sendTicketConfirmations(order.id);

      void this.emailService.sendOrderConfirmation(
        order.buyer.email,
        order.buyer.displayName || 'there',
        {
          id: order.id,
          total: order.totalAmount.toNumber(),
          items: order.items.map((i) => ({
            title: i.product.title || i.productName,
            price: i.unitPrice.toNumber(),
          })),
          viewUrl: `${webBase}/dashboard/downloads`,
        },
      );

      // Post-purchase follow-up: ask the buyer for a review a few days later
      // (scheduled via the email queue when enabled, inline otherwise).
      for (const item of order.items) {
        void this.emailService.sendReviewRequest(
          order.buyer.email,
          order.buyer.displayName || 'there',
          { title: item.product.title || item.productName, slug: item.product.slug },
          `${webBase}/products/${item.product.slug}`,
        );
      }

      // Resolve every creator user in one query, then notify.
      const byProfile = groupBy(order.items, (i) => i.product.creatorId);
      const creators = await prisma.creatorProfile.findMany({
        where: { id: { in: Object.keys(byProfile) } },
        select: { id: true, user: { select: { id: true, email: true, displayName: true } } },
      });

      for (const creator of creators) {
        const items = byProfile[creator.id] ?? [];
        for (const item of items) {
          const amount = item.unitPrice.mul(item.quantity).toNumber();
          void this.emailService.sendNewSale(
            creator.user.email,
            creator.user.displayName || 'there',
            { title: item.product.title || item.productName },
            amount,
          );
          void this.notificationsService.create(
            creator.user.id,
            'SALE',
            'New sale! 🎉',
            `You sold "${item.product.title || item.productName}" for ${amount} NGN.`,
            { orderId: order.id, productId: item.productId, amount },
          );
        }
      }
    } catch (err) {
      this.logger.error(`[fulfillment:notifications] ${(err as Error).message}`);
    }
  }

  /**
   * Wallet-balance checkout: pay for an order directly from the buyer's CreatorPlus
   * wallet (available balance). Debits the buyer, then fulfills the order the
   * same way a provider webhook would. Idempotent for already-paid orders.
   */
  async payWithWallet(orderId: string, buyerId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        buyer: { select: { id: true, email: true, displayName: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Not authorized to pay for this order');
    }
    if (order.status === 'PAID') {
      return { provider: 'wallet', alreadyPaid: true, orderId: order.id };
    }
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new BadRequestException(
        `Order cannot be paid in its current state (${order.status})`,
      );
    }

    const total = order.totalAmount;

    // Debit the wallet atomically: the guarded decrement only succeeds while
    // the balance is still sufficient, so concurrent orders can never overdraw
    // (no read-then-write race). Wallet + ledger + payment all commit together.
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: buyerId },
        update: {},
        create: { userId: buyerId },
      });
      const balanceBefore = wallet.availableBalance;

      const debit = await tx.wallet.updateMany({
        where: { id: wallet.id, availableBalance: { gte: total } },
        data: { availableBalance: { decrement: total } },
      });
      if (debit.count === 0) {
        throw new BadRequestException(
          `Insufficient wallet balance. You have ₦${balanceBefore
            .toNumber()
            .toLocaleString()} but this order costs ₦${total.toNumber().toLocaleString()}.`,
        );
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'ADJUSTMENT',
          amount: total.neg(),
          balanceBefore,
          balanceAfter: balanceBefore.sub(total),
          description: 'Wallet purchase',
          referenceType: 'ORDER',
          referenceId: order.id,
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          currency: order.currency || 'NGN',
          status: 'SUCCEEDED',
          provider: 'wallet',
        },
      });
    });

    await this.fulfillOrder(order.id);

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, slug: true, thumbnail: true } },
          },
        },
        payment: true,
      },
    });

    return {
      provider: 'wallet',
      status: 'PAID',
      orderId: order.id,
      order: updated,
    };
  }

  async getWallet(userId: string) {
    return prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  private async markOrderFailed(event: WebhookEvent) {
    const payment = await this.findPaymentForEvent(event);
    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'FAILED' },
    });
    // Release any held event seats back to the pool.
    await this.eventsService.cancelTicketsForOrder(payment.orderId);
  }

  /**
   * Provider-initiated refund (e.g. Paystack refund webhook). Reverses every
   * money record the same way an admin-approved refund would: affiliate
   * conversions, platform Commission rows, and the creator wallet credits from
   * fulfillment. Atomic and idempotent (claims the payment once).
   */
  private async markOrderRefunded(event: WebhookEvent) {
    const payment = await this.findPaymentForEvent(event);
    if (!payment) return;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: 'REFUNDED' } },
        data: { status: 'REFUNDED' },
      });
      if (claimed.count === 0) return; // duplicate refund webhook

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'REFUNDED' },
      });

      const { creatorNets } = await this.commissionService.reverseOrderCommissions(
        tx,
        payment.orderId,
        'Refunded via payment provider',
      );
      await clawBackCreatorCredits(tx, payment.orderId, creatorNets);
    });

    // Release event seats held/confirmed by this order.
    await this.eventsService.cancelTicketsForOrder(payment.orderId);
  }

  private async findPaymentForEvent(event: WebhookEvent) {
    const refs = [
      event.providerPaymentId,
      event.providerReference,
      event.refundId,
    ].filter(Boolean);

    for (const ref of refs) {
      const byId = await prisma.payment.findFirst({
        where: { providerPaymentId: ref },
      });
      if (byId) return byId;

      const bySession = await prisma.payment.findFirst({
        where: { stripeSessionId: ref },
      });
      if (bySession) return bySession;
    }
    return null;
  }

  async findByOrderId(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { buyerId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Not authorized to view these payments');
    }

    return prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            buyerId: true,
            totalAmount: true,
            currency: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.order?.buyerId !== userId) {
      throw new ForbiddenException('Not authorized to view this payment');
    }

    return payment;
  }
}
