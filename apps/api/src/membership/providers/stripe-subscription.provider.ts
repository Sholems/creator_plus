import Stripe from 'stripe';
import {
  EnsurePlanInput,
  StartSubscriptionInput,
  StartSubscriptionResult,
  SubscriptionEvent,
  SubscriptionProvider,
} from './subscription-provider.interface';

const unixToDate = (s?: number | null): Date | undefined =>
  typeof s === 'number' ? new Date(s * 1000) : undefined;

/** Stripe recurring subscriptions for international ($) members. */
export class StripeSubscriptionProvider implements SubscriptionProvider {
  readonly name = 'stripe';
  private client: Stripe | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    this.client = key ? new Stripe(key, { apiVersion: '2025-02-24.acacia' }) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  private require(): Stripe {
    if (!this.client) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
    return this.client;
  }

  async ensurePlan(input: EnsurePlanInput): Promise<string> {
    if (input.existingCode) return input.existingCode;
    const price = await this.require().prices.create({
      currency: input.currency.toLowerCase(),
      unit_amount: Math.round(input.amountMajor * 100),
      recurring: { interval: input.interval === 'ANNUAL' ? 'year' : 'month' },
      product_data: { name: input.name },
    });
    return price.id;
  }

  async startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult> {
    const session = await this.require().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: input.planCode, quantity: 1 }],
      customer_email: input.customerEmail,
      client_reference_id: input.subscriptionId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { purpose: 'membership', subscriptionId: input.subscriptionId },
      subscription_data: { metadata: { purpose: 'membership', subscriptionId: input.subscriptionId } },
    });
    return { provider: this.name, redirectUrl: session.url || '', providerReference: input.subscriptionId };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.require().subscriptions.update(providerSubscriptionId, { cancel_at_period_end: true });
  }

  verifyWebhook(rawBody: any, signature?: string): boolean {
    try {
      this.require().webhooks.constructEvent(rawBody, signature || '', process.env.STRIPE_WEBHOOK_SECRET || '');
      return true;
    } catch {
      return false;
    }
  }

  parseSubscriptionEvent(payload: any): SubscriptionEvent | null {
    if (!payload || typeof payload.type !== 'string') return null;
    const obj = payload.data?.object;

    switch (payload.type) {
      case 'checkout.session.completed': {
        const s = obj as Stripe.Checkout.Session;
        if (s.mode !== 'subscription') return null;
        return {
          type: 'activated',
          providerReference: s.client_reference_id ?? undefined,
          providerSubscriptionId: (s.subscription as string) ?? undefined,
          providerCustomerId: (s.customer as string) ?? undefined,
          customerEmail: s.customer_details?.email ?? s.customer_email ?? undefined,
          raw: payload,
        };
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = obj as Stripe.Subscription;
        const status = sub.status;
        const type: SubscriptionEvent['type'] =
          status === 'past_due' || status === 'unpaid' ? 'past_due'
            : status === 'canceled' ? 'canceled'
              : 'renewed';
        return {
          type,
          providerSubscriptionId: sub.id,
          providerCustomerId: (sub.customer as string) ?? undefined,
          providerReference: (sub.metadata?.subscriptionId as string) ?? undefined,
          currentPeriodEnd: unixToDate((sub as any).current_period_end),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          raw: payload,
        };
      }
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = obj as Stripe.Invoice;
        return {
          type: 'renewed',
          providerSubscriptionId: (inv.subscription as string) ?? undefined,
          providerCustomerId: (inv.customer as string) ?? undefined,
          currentPeriodEnd: unixToDate(inv.lines?.data?.[0]?.period?.end),
          amountMajor: typeof inv.amount_paid === 'number' ? inv.amount_paid / 100 : undefined,
          currency: inv.currency ?? undefined,
          raw: payload,
        };
      }
      case 'invoice.payment_failed': {
        const inv = obj as Stripe.Invoice;
        return {
          type: 'past_due',
          providerSubscriptionId: (inv.subscription as string) ?? undefined,
          providerCustomerId: (inv.customer as string) ?? undefined,
          raw: payload,
        };
      }
      case 'customer.subscription.deleted': {
        const sub = obj as Stripe.Subscription;
        return {
          type: 'canceled',
          providerSubscriptionId: sub.id,
          providerCustomerId: (sub.customer as string) ?? undefined,
          raw: payload,
        };
      }
      default:
        return null;
    }
  }
}
