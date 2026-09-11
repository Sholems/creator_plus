import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  EnsurePlanInput,
  StartSubscriptionInput,
  StartSubscriptionResult,
  SubscriptionEvent,
  SubscriptionProvider,
} from './subscription-provider.interface';

const PAYSTACK_API = 'https://api.paystack.co';

function paystackInterval(interval: 'MONTHLY' | 'ANNUAL'): 'monthly' | 'annually' {
  return interval === 'ANNUAL' ? 'annually' : 'monthly';
}

/** Add one billing interval to a date, for deriving a period end from a charge. */
function addPaystackInterval(from: Date, interval?: string): Date {
  const d = new Date(from);
  switch (interval) {
    case 'annually': d.setFullYear(d.getFullYear() + 1); break;
    case 'biannually': d.setMonth(d.getMonth() + 6); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'daily': d.setDate(d.getDate() + 1); break;
    default: d.setMonth(d.getMonth() + 1); // monthly
  }
  return d;
}

/**
 * Paystack recurring subscriptions. A checkout transaction that carries a
 * `plan` code makes Paystack auto-create a subscription and charge it each
 * interval. Amounts are in kobo (naira × 100).
 */
export class PaystackSubscriptionProvider implements SubscriptionProvider {
  readonly name = 'paystack';
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = (secretKey ?? process.env.PAYSTACK_SECRET_KEY ?? '').trim();
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  private async api(path: string, method: string, body?: any): Promise<any> {
    const res = await fetch(`${PAYSTACK_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) {
      throw new Error(json?.message || `Paystack ${path} failed`);
    }
    return json;
  }

  async ensurePlan(input: EnsurePlanInput): Promise<string> {
    if (input.existingCode) return input.existingCode;
    const json = await this.api('/plan', 'POST', {
      name: input.name,
      amount: Math.round(input.amountMajor * 100),
      interval: paystackInterval(input.interval),
      currency: input.currency,
    });
    return json.data?.plan_code;
  }

  async startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult> {
    const reference = `MBR_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const json = await this.api('/transaction/initialize', 'POST', {
      email: input.customerEmail,
      amount: Math.round(input.amountMajor * 100),
      currency: input.currency,
      plan: input.planCode,
      reference,
      callback_url: input.successUrl,
      metadata: { purpose: 'membership', subscriptionId: input.subscriptionId },
    });
    return {
      provider: this.name,
      redirectUrl: json.data?.authorization_url || '',
      providerReference: json.data?.reference || reference,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    // Disabling needs the subscription's email token; fetch it, then disable.
    const detail = await this.api(`/subscription/${providerSubscriptionId}`, 'GET');
    const token = detail.data?.email_token;
    await this.api('/subscription/disable', 'POST', { code: providerSubscriptionId, token });
  }

  verifyWebhook(rawBody: any, signature?: string): boolean {
    if (!this.isConfigured() || !signature) return false;
    try {
      const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
      const received = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expected, 'utf8');
      return received.length === expectedBuf.length && timingSafeEqual(received, expectedBuf);
    } catch {
      return false;
    }
  }

  parseSubscriptionEvent(payload: any): SubscriptionEvent | null {
    const type: string | undefined = payload?.event;
    const data = payload?.data;
    if (!type || !data) return null;

    switch (type) {
      case 'charge.success': {
        // Only subscription charges carry a plan; one-time order charges don't.
        if (!data.plan) return null;
        const isFirst = data.metadata?.purpose === 'membership' && !!data.metadata?.subscriptionId;
        const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
        return {
          type: isFirst ? 'activated' : 'renewed',
          providerReference: data.reference,
          providerCustomerId: data.customer?.customer_code,
          providerPlanCode: data.plan?.plan_code,
          customerEmail: data.customer?.email,
          currentPeriodEnd: addPaystackInterval(paidAt, data.plan?.interval),
          amountMajor: typeof data.amount === 'number' ? data.amount / 100 : undefined,
          currency: data.currency,
          raw: payload,
        };
      }
      case 'subscription.create': {
        return {
          type: 'activated',
          providerSubscriptionId: data.subscription_code,
          providerCustomerId: data.customer?.customer_code,
          providerPlanCode: data.plan?.plan_code,
          customerEmail: data.customer?.email,
          currentPeriodEnd: data.next_payment_date ? new Date(data.next_payment_date) : undefined,
          raw: payload,
        };
      }
      case 'invoice.update':
      case 'invoice.payment_success': {
        const paid = data.paid === true || data.status === 'success';
        return {
          type: paid ? 'renewed' : 'past_due',
          providerSubscriptionId: data.subscription?.subscription_code,
          providerCustomerId: data.customer?.customer_code,
          currentPeriodEnd: data.subscription?.next_payment_date
            ? new Date(data.subscription.next_payment_date)
            : undefined,
          raw: payload,
        };
      }
      case 'invoice.payment_failed': {
        return {
          type: 'past_due',
          providerSubscriptionId: data.subscription?.subscription_code,
          providerCustomerId: data.customer?.customer_code,
          raw: payload,
        };
      }
      case 'subscription.not_renew': {
        // Cancels at period end — keep access, flag the pending cancellation.
        return {
          type: 'renewed',
          providerSubscriptionId: data.subscription_code,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: data.next_payment_date ? new Date(data.next_payment_date) : undefined,
          raw: payload,
        };
      }
      case 'subscription.disable': {
        return {
          type: 'canceled',
          providerSubscriptionId: data.subscription_code,
          providerCustomerId: data.customer?.customer_code,
          raw: payload,
        };
      }
      default:
        return null;
    }
  }
}
