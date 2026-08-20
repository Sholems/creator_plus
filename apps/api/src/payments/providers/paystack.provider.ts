import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  WebhookEvent,
  RefundInput,
  RefundResult,
} from './payment-provider.interface';

const PAYSTACK_API = 'https://api.paystack.co';

/**
 * Paystack — the leading Nigerian payments gateway. Amounts are in kobo
 * (naira × 100). Success is signalled by the `charge.success` event whose
 * `data.reference` matches the reference we stored at checkout time.
 */
export class PaystackProvider implements PaymentProvider {
  readonly name = 'paystack';
  private secretKey: string;

  // The secret is resolved by the factory (DB settings → env fallback) and
  // passed in, so an admin can rotate it at runtime. Falls back to env when
  // constructed without an argument.
  constructor(secretKey?: string) {
    this.secretKey = (secretKey ?? process.env.PAYSTACK_SECRET_KEY ?? '').trim();
  }

  private get enabled() {
    return Boolean(this.secretKey);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!this.enabled) {
      throw new Error('Paystack secret key is not configured');
    }

    const reference = `CM_${Date.now()}_${uuidv4().slice(0, 8)}`;

    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.buyerEmail,
        amount: Math.round(input.totalAmount * 100),
        currency: input.currency,
        reference,
        callback_url: input.successUrl,
        metadata: {
          orderId: input.orderId,
          custom_fields: [
            {
              display_name: 'Order',
              variable_name: 'order_id',
              value: input.orderId,
            },
          ],
        },
      }),
    });

    const body: any = await response.json();

    if (!response.ok || !body.status) {
      throw new Error(body?.message || 'Paystack could not initialize payment');
    }

    return {
      provider: this.name,
      redirectUrl: body.data?.authorization_url || '',
      providerPaymentId: body.data?.reference || reference,
      providerReference: body.data?.reference || reference,
    };
  }

  verifyWebhook(rawBody: any, signature?: string): boolean {
    if (!this.enabled || !signature) return false;
    try {
      const expected = createHmac('sha512', this.secretKey)
        .update(rawBody)
        .digest('hex');
      const received = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expected, 'utf8');
      return (
        received.length === expectedBuf.length &&
        timingSafeEqual(received, expectedBuf)
      );
    } catch {
      return false;
    }
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    if (!this.enabled) {
      throw new Error('Paystack secret key is not configured');
    }

    const response = await fetch(`${PAYSTACK_API}/transaction/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: input.providerPaymentId,
        amount: Math.round(input.amount * 100),
        // Paystack supports a customer note; reason is a helpful trace.
        merchant_note: input.reason || 'Refund from CreatorPlus support',
      }),
    });

    const body: any = await response.json();
    if (!response.ok || !body.status) {
      throw new Error(body?.message || 'Paystack could not process refund');
    }

    return {
      providerRefundId: body.data?.id ? String(body.data.id) : undefined,
      success: true,
    };
  }

  parseWebhookEvent(payload: any): WebhookEvent | null {
    const type: string | undefined = payload?.event;
    const data = payload?.data;

    if (type === 'charge.success') {
      return {
        type: 'checkout.completed',
        providerPaymentId: data?.reference,
        providerReference: data?.reference,
        // Paystack reports amount in kobo (minor units).
        amount: typeof data?.amount === 'number' ? data.amount / 100 : undefined,
        currency: data?.currency,
        raw: payload,
      };
    }

    if (type === 'charge.failed') {
      return {
        type: 'checkout.failed',
        providerPaymentId: data?.reference,
        providerReference: data?.reference,
        raw: payload,
      };
    }

    if (typeof type === 'string' && type.startsWith('refund.')) {
      return {
        type: 'payment.refunded',
        providerPaymentId: data?.transaction?.reference || data?.reference,
        providerReference: data?.reference,
        refundId: data?.id ? String(data.id) : undefined,
        raw: payload,
      };
    }

    return null;
  }
}
