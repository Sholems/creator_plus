/**
 * Provider-agnostic recurring-subscription abstraction, mirroring the one-time
 * PaymentProvider interface. Paystack (₦) and Stripe ($) implement it; the
 * membership service and access checks never branch on the provider.
 *
 * Callers always pass MAJOR units (e.g. 5000 for ₦5,000 or 5 for $5). Each
 * adapter converts to its own minor unit (kobo / cents).
 */

export type SubInterval = 'MONTHLY' | 'ANNUAL';

export interface EnsurePlanInput {
  name: string;
  amountMajor: number;
  currency: string;
  interval: SubInterval;
  /** Existing provider plan/price code, if we already created one. */
  existingCode?: string | null;
}

export interface StartSubscriptionInput {
  /** Our internal MembershipSubscription id — correlates the first charge back. */
  subscriptionId: string;
  customerEmail: string;
  /** Provider plan code (Paystack plan_code) or price id (Stripe). */
  planCode: string;
  amountMajor: number;
  currency: string;
  interval: SubInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface StartSubscriptionResult {
  provider: string;
  /** Where to send the subscriber to complete payment. */
  redirectUrl: string;
  /** Provider transaction reference (Paystack) — stored for first-charge correlation. */
  providerReference?: string;
}

export type SubscriptionEventType = 'activated' | 'renewed' | 'past_due' | 'canceled';

/** Normalized subscription lifecycle event, emitted by every adapter. */
export interface SubscriptionEvent {
  type: SubscriptionEventType;
  /** Init-transaction reference we stored at checkout (first-charge correlation). */
  providerReference?: string;
  /** Provider's durable subscription id/code (renewals, cancellations). */
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  /** Provider plan/price code — used to correlate renewals by customer+plan. */
  providerPlanCode?: string;
  customerEmail?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  amountMajor?: number;
  currency?: string;
  raw: any;
}

export interface SubscriptionProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Create (or reuse) a recurring plan/price at the provider; returns its code. */
  ensurePlan(input: EnsurePlanInput): Promise<string>;
  /** Begin a hosted subscription checkout; returns a redirect URL. */
  startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult>;
  /** Cancel at period end where supported (keeps access until currentPeriodEnd). */
  cancelSubscription(providerSubscriptionId: string, opts?: { emailToken?: string }): Promise<void>;
  verifyWebhook(rawBody: any, signature?: string): boolean;
  /** Normalize a raw webhook payload into a subscription event, or null if N/A. */
  parseSubscriptionEvent(payload: any): SubscriptionEvent | null;
}
