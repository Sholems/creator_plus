import Stripe from 'stripe';
import {
  PaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  WebhookEvent,
  RefundInput,
  RefundResult,
} from './payment-provider.interface';

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private client: Stripe | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    // The factory instantiates every provider at boot, but Stripe is optional
    // (Paystack-first). Only build the client when a key is configured; the
    // provider is only ever *selected* when STRIPE_SECRET_KEY is set.
    this.client = key ? new Stripe(key, { apiVersion: '2025-02-24.acacia' }) : null;
  }

  private requireClient(): Stripe {
    if (!this.client) {
      throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
    }
    return this.client;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.items.map(
      (item) => ({
        price_data: {
          currency: input.currency.toLowerCase(),
          product_data: {
            name: item.title,
            metadata: {
              productId: item.productId,
              orderId: input.orderId,
            },
          },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      }),
    );

    const session = await this.requireClient().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: input.buyerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        orderId: input.orderId,
      },
    });

    return {
      provider: this.name,
      redirectUrl: session.url || '',
      providerPaymentId: session.id,
    };
  }

  verifyWebhook(rawBody: any, signature?: string): boolean {
    try {
      this.requireClient().webhooks.constructEvent(
        rawBody,
        signature || '',
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );
      return true;
    } catch {
      return false;
    }
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    // providerPaymentId is the checkout session id; refunds need the
    // payment intent. Look it up first when the id looks like a session.
    let paymentIntent: string = input.providerPaymentId;
    if (input.providerPaymentId.startsWith('cs_')) {
      const session = await this.requireClient().checkout.sessions.retrieve(
        input.providerPaymentId,
      );
      paymentIntent = session.payment_intent as string;
    }

    const refund = await this.requireClient().refunds.create({
      payment_intent: paymentIntent,
      amount: Math.round(input.amount * 100),
      reason: input.reason?.toLowerCase().includes('fraud')
        ? 'fraudulent'
        : 'requested_by_customer',
      metadata: {
        reason: input.reason || '',
      },
    });

    return {
      providerRefundId: refund.id,
      success: true,
    };
  }

  parseWebhookEvent(payload: any): WebhookEvent | null {
    if (!payload || typeof payload.type !== 'string') return null;

    switch (payload.type) {
      case 'checkout.session.completed': {
        const session = payload.data?.object as Stripe.Checkout.Session;
        return {
          type: 'checkout.completed',
          providerPaymentId: session?.id,
          providerReference: session?.payment_intent
            ? (session.payment_intent as string)
            : undefined,
          // Stripe reports amount_total in minor units (kobo/cents).
          amount:
            typeof session?.amount_total === 'number'
              ? session.amount_total / 100
              : undefined,
          currency: session?.currency ?? undefined,
          raw: payload,
        };
      }
      case 'payment_intent.payment_failed': {
        const intent = payload.data?.object as Stripe.PaymentIntent;
        return {
          type: 'checkout.failed',
          providerReference: intent?.id,
          raw: payload,
        };
      }
      case 'charge.refunded': {
        const charge = payload.data?.object as Stripe.Charge;
        return {
          type: 'payment.refunded',
          providerReference: charge?.payment_intent
            ? (charge.payment_intent as string)
            : undefined,
          raw: payload,
        };
      }
      default:
        return null;
    }
  }
}
