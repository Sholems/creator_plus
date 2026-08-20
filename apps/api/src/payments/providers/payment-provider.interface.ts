/**
 * Provider-agnostic payment abstraction.
 *
 * CreatorPlus is Nigeria-first, so Paystack and Flutterwave are the primary
 * gateways; Stripe remains available for international buyers. Each
 * provider owns its own unit convention (Paystack uses kobo, Flutterwave
 * uses whole naira, Stripe uses minor units) — callers always pass major
 * units (e.g. 1500 for ₦1,500).
 */

export interface CheckoutLineItem {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  buyerEmail: string;
  currency: string;
  totalAmount: number;
  items: CheckoutLineItem[];
  successUrl: string;
  cancelUrl: string;
  platformFeePercent: number;
}

export interface CreateCheckoutResult {
  provider: string;
  /** Where the buyer should be redirected to complete payment. */
  redirectUrl: string;
  /** Provider's own payment id / reference (stored as providerPaymentId). */
  providerPaymentId?: string;
  /** Human-friendly reference (e.g. Paystack transaction reference). */
  providerReference?: string;
}

export type WebhookEventType =
  | 'checkout.completed'
  | 'checkout.failed'
  | 'payment.refunded';

export interface WebhookEvent {
  type: WebhookEventType;
  /** Provider payment id that we stored at checkout time. */
  providerPaymentId?: string;
  /** Provider transaction reference (Paystack/Flutterwave). */
  providerReference?: string;
  refundId?: string;
  /** Amount the provider reports as paid, normalized to MAJOR units (e.g. 1500
   *  for ₦1,500). Used to verify the webhook against the order total. */
  amount?: number;
  /** Currency the provider reports (e.g. "NGN"). */
  currency?: string;
  raw: any;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /**
   * Refund a previously completed transaction. Implementations are
   * best-effort: providers without a configured secret key throw, and
   * callers should treat failures as non-fatal for the case workflow.
   */
  refundPayment(input: RefundInput): Promise<RefundResult>;
  /**
   * Verify a webhook signature. Providers without signature support may
   * return true (relied upon only when the payload is otherwise validated).
   */
  verifyWebhook(rawBody: any, signature?: string): boolean;
  /** Normalize a provider webhook payload into an internal event. */
  parseWebhookEvent(payload: any): WebhookEvent | null;
}

export interface RefundInput {
  /** Provider payment id / reference stored at checkout time. */
  providerPaymentId: string;
  /** Amount to refund in major units (e.g. 1500 for ₦1,500). */
  amount: number;
  reason?: string;
}

export interface RefundResult {
  /** Provider's own refund id. */
  providerRefundId?: string;
  success: boolean;
}
