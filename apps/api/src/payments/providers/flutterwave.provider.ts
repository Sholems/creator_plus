import { v4 as uuidv4 } from 'uuid';
import {
  PaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  WebhookEvent,
  RefundInput,
  RefundResult,
} from './payment-provider.interface';

const FLW_API = 'https://api.flutterwave.com/v3';

/**
 * Flutterwave — pan-African payments gateway. Amounts are in whole naira
 * (NOT minor units — a common integration gotcha). Webhooks are verified
 * via the `verif-hash` header.
 */
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = 'flutterwave';
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
  }

  private get enabled() {
    return Boolean(this.secretKey);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.enabled) {
      throw new Error('Flutterwave secret key is not configured');
    }

    const txRef = `CM_${Date.now()}_${uuidv4().slice(0, 8)}`;

    const response = await fetch(`${FLW_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: input.totalAmount,
        currency: input.currency,
        redirect_url: input.successUrl,
        customer: {
          email: input.buyerEmail,
        },
        meta: {
          orderId: input.orderId,
        },
        customizations: {
          title: 'CreatorPlus market checkout',
        },
      }),
    });

    const body: any = await response.json();

    if (!response.ok || !body.status) {
      throw new Error(body?.message || 'Flutterwave could not initialize payment');
    }

    return {
      provider: this.name,
      redirectUrl: body.data?.link || '',
      providerPaymentId: txRef,
      providerReference: txRef,
    };
  }

  verifyWebhook(_rawBody: any, signature?: string): boolean {
    // Flutterwave's verif-hash is a static value, not a signed digest.
    return Boolean(signature) && signature === this.secretKey;
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    if (!this.enabled) {
      throw new Error('Flutterwave secret key is not configured');
    }

    const response = await fetch(`${FLW_API}/transactions/${input.providerPaymentId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amount,
        comment: input.reason || 'Refund from CreatorPlus support',
      }),
    });

    const body: any = await response.json();
    if (!response.ok || body.status !== 'success') {
      throw new Error(body?.message || 'Flutterwave could not process refund');
    }

    return {
      providerRefundId: body.data?.id ? String(body.data.id) : undefined,
      success: true,
    };
  }

  parseWebhookEvent(payload: any): WebhookEvent | null {
    const type: string | undefined = payload?.['event.type'] || payload?.event;
    const data = payload?.data;

    if (type === 'charge.completed' || type === 'charge.success') {
      return {
        type: 'checkout.completed',
        providerPaymentId: data?.tx_ref,
        providerReference: data?.flw_ref || data?.tx_ref,
        raw: payload,
      };
    }

    if (type === 'charge.failed') {
      return {
        type: 'checkout.failed',
        providerPaymentId: data?.tx_ref,
        providerReference: data?.tx_ref,
        raw: payload,
      };
    }

    if (typeof type === 'string' && type.startsWith('refund.')) {
      return {
        type: 'payment.refunded',
        providerPaymentId: data?.tx_ref,
        providerReference: data?.flw_ref || data?.tx_ref,
        refundId: data?.id ? String(data.id) : undefined,
        raw: payload,
      };
    }

    return null;
  }
}
