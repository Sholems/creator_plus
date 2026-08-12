import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { prisma, PlanTier, SubscriptionStatus, CreditPurchaseStatus } from '@creatormarket/database';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });
  }

  private getStripePriceId(tier: PlanTier): string {
    switch (tier) {
      case PlanTier.STARTER:
        return process.env.STRIPE_PRICE_STARTER || '';
      case PlanTier.PRO:
        return process.env.STRIPE_PRICE_PRO || '';
      case PlanTier.ENTERPRISE:
        return process.env.STRIPE_PRICE_ENTERPRISE || '';
      default:
        throw new BadRequestException('Invalid tier for checkout');
    }
  }

  async getSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription) {
      return subscription;
    }

    // No subscription row yet — report the implicit free plan instead of null,
    // which would serialize to an empty body and break JSON clients.
    return {
      id: null,
      userId,
      tier: PlanTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      createdAt: null,
      updatedAt: null,
    };
  }

  async createCheckoutSession(userId: string, tier: PlanTier, successUrl?: string, cancelUrl?: string) {
    if (tier === PlanTier.FREE) {
      throw new BadRequestException('Cannot checkout for FREE tier');
    }

    const priceId = this.getStripePriceId(tier);
    if (!priceId) {
      throw new BadRequestException('Stripe price not configured for tier');
    }

    const existing = await prisma.subscription.findUnique({ where: { userId } });

    const customer = await this.stripe.customers.create({
      metadata: { userId },
    });

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.WEB_URL || 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.WEB_URL || 'http://localhost:3000'}/billing`,
      metadata: { userId, tier },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { userId },
        data: {
          stripeCustomerId: customer.id,
          tier,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          tier,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: customer.id,
        },
      });
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async cancelSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (subscription.tier === PlanTier.FREE) {
      throw new BadRequestException('Cannot cancel FREE tier subscription');
    }
    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active Stripe subscription');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  async reactivateSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active Stripe subscription');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: false },
    });
  }

  async getCreditBalance(userId: string) {
    let balance = await prisma.creditBalance.findUnique({ where: { userId } });
    if (!balance) {
      balance = await prisma.creditBalance.create({
        data: { userId },
      });
    }
    return balance;
  }

  async getCreditPacks() {
    return prisma.creditPack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async purchaseCreditPack(userId: string, packId: string, successUrl?: string, cancelUrl?: string) {
    const pack = await prisma.creditPack.findUnique({ where: { id: packId } });
    if (!pack || !pack.isActive) {
      throw new NotFoundException('Credit pack not found or inactive');
    }
    if (!pack.stripePriceId) {
      throw new BadRequestException('Credit pack not configured for checkout');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      success_url: successUrl || `${process.env.WEB_URL || 'http://localhost:3000'}/billing/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.WEB_URL || 'http://localhost:3000'}/billing/credits`,
      metadata: { userId, packId, credits: pack.credits.toString() },
    });

    await prisma.creditPurchase.create({
      data: {
        userId,
        creditPackId: packId,
        credits: pack.credits,
        amountPaidInCents: pack.priceInCents,
        stripePaymentIntentId: session.payment_intent as string,
        status: CreditPurchaseStatus.COMPLETED,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async handleSubscriptionWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as PlanTier;

        if (!userId || !tier) break;

        const existing = await prisma.subscription.findUnique({ where: { userId } });

        if (existing) {
          await prisma.subscription.update({
            where: { userId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.metadata?.priceId || undefined,
              tier,
              status: SubscriptionStatus.ACTIVE,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.metadata?.priceId || undefined,
              tier,
              status: SubscriptionStatus.ACTIVE,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (subscription) {
          let status: SubscriptionStatus;
          switch (stripeSubscription.status) {
            case 'active':
              status = SubscriptionStatus.ACTIVE;
              break;
            case 'past_due':
              status = SubscriptionStatus.PAST_DUE;
              break;
            case 'canceled':
            case 'unpaid':
              status = SubscriptionStatus.CANCELED;
              break;
            default:
              status = SubscriptionStatus.ACTIVE;
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubscription.id },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: SubscriptionStatus.CANCELED,
              tier: PlanTier.FREE,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = await prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.PAST_DUE },
          });
        }
        break;
      }
    }

    return { received: true };
  }

  async handleCreditWebhook(event: Stripe.Event) {
    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const packId = session.metadata?.packId;

    if (!userId || !packId) return { received: true };

    const purchase = await prisma.creditPurchase.findFirst({
      where: {
        userId,
        creditPackId: packId,
      },
    });

    if (!purchase) return { received: true };

    if (session.payment_intent) {
      await prisma.creditPurchase.update({
        where: { id: purchase.id },
        data: {
          stripePaymentIntentId: session.payment_intent as string,
          status: CreditPurchaseStatus.COMPLETED,
        },
      });
    }

    let balance = await prisma.creditBalance.findUnique({ where: { userId } });
    if (!balance) {
      balance = await prisma.creditBalance.create({
        data: { userId, totalCredits: purchase.credits },
      });
    } else {
      balance = await prisma.creditBalance.update({
        where: { userId },
        data: {
          totalCredits: balance.totalCredits + purchase.credits,
          lastTopUpAt: new Date(),
        },
      });
    }

    await prisma.creditTransaction.create({
      data: {
        balanceId: balance.id,
        type: 'PURCHASE',
        amount: purchase.credits,
        description: 'Credit pack purchase',
        referenceType: 'CreditPurchase',
        referenceId: purchase.id,
      },
    });

    return { received: true };
  }
}
