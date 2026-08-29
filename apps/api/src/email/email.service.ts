import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  BRAND,
  createEmailTransport,
  fromAddress,
  renderAbandonedCartEmail,
  renderPaymentReminderEmail,
  renderEmailLayout,
  SITE_NAME,
} from '@creatorplus/email';
import { enqueueEmail } from '../common/queue';
import { webBaseUrl } from '../common/urls';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Brevo SMTP relay by default (see @creatorplus/email transport);
    // any SMTP provider can be used by overriding the SMTP_* env vars.
    this.transporter = createEmailTransport();
  }

  // -------------------------------------------------------------------------
  // Auth lifecycle
  // -------------------------------------------------------------------------

  async sendWelcome(to: string, name: string) {
    const html = renderEmailLayout({
      preview: `Welcome to ${SITE_NAME}!`,
      eyebrow: 'You joined the marketplace',
      title: `Welcome to ${SITE_NAME}`,
      body: this.templates.welcome(name),
      cta: { label: 'Explore the marketplace', url: webBaseUrl() },
    });
    return this.send(to, `Welcome to ${SITE_NAME}!`, html);
  }

  async sendEmailVerification(to: string, name: string, token: string) {
    const verificationUrl = `${webBaseUrl()}/auth/verify?token=${token}`;
    const html = renderEmailLayout({
      preview: 'Please confirm your email address',
      eyebrow: 'Almost there',
      title: 'Confirm your email',
      body: this.templates.emailVerification(name, verificationUrl),
      cta: { label: 'Verify my email', url: verificationUrl },
    });
    return this.send(to, 'Verify your email address', html);
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const resetUrl = `${webBaseUrl()}/auth/reset-password?token=${token}`;
    const html = renderEmailLayout({
      preview: 'Reset your password',
      eyebrow: 'Account security',
      title: 'Reset your password',
      body: this.templates.passwordReset(name, resetUrl),
      cta: { label: 'Reset password', url: resetUrl },
    });
    return this.send(to, 'Reset your password', html);
  }

  // -------------------------------------------------------------------------
  // Orders & payouts
  // -------------------------------------------------------------------------

  async sendOrderConfirmation(
    to: string,
    name: string,
    order: {
      id: string;
      total: number;
      items: { title: string; price: number }[];
      viewUrl?: string;
    },
  ) {
    const html = renderEmailLayout({
      preview: `Order ${order.id.slice(0, 8).toUpperCase()} confirmed`,
      eyebrow: 'Payment received',
      title: 'Your order is confirmed',
      body: this.templates.orderConfirmation(name, order),
      cta: { label: 'View your downloads', url: order.viewUrl || `${webBaseUrl()}/dashboard/downloads` },
    });
    return this.send(to, `Order ${order.id.slice(0, 8).toUpperCase()} confirmed`, html);
  }

  async sendEventTicket(
    to: string,
    name: string,
    data: {
      eventTitle: string;
      whenText: string;
      locationText: string;
      joinUrl?: string | null;
      ticketCodes: string[];
      viewUrl: string;
    },
  ) {
    const esc = (s: string) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const many = data.ticketCodes.length > 1;
    const codes = data.ticketCodes.map((c) => `<code>${esc(c)}</code>`).join(' &nbsp; ');
    const body = `
      <p>Hi ${esc(name)},</p>
      <p>Your ticket${many ? 's are' : ' is'} confirmed for <strong>${esc(data.eventTitle)}</strong>.</p>
      <p><strong>When:</strong> ${esc(data.whenText)}<br/>
         <strong>Where:</strong> ${esc(data.locationText)}</p>
      ${data.joinUrl ? `<p><strong>Join link:</strong> <a href="${esc(data.joinUrl)}">${esc(data.joinUrl)}</a></p>` : ''}
      <p><strong>Ticket code${many ? 's' : ''}:</strong> ${codes}</p>
      <p>Show the QR code from your dashboard at the door to check in.</p>
    `;
    const html = renderEmailLayout({
      preview: `Your ticket to ${data.eventTitle}`,
      eyebrow: 'You’re going!',
      title: data.eventTitle,
      body,
      cta: { label: 'View my tickets', url: data.viewUrl },
    });
    return this.send(to, `Your ticket to ${data.eventTitle}`, html);
  }

  async sendNewSale(to: string, name: string, product: { title: string }, amount: number) {
    const html = renderEmailLayout({
      preview: 'You have a new sale!',
      eyebrow: 'Cha-ching',
      title: 'You have a new sale!',
      body: this.templates.newSale(name, product, amount),
      cta: { label: 'View your analytics', url: `${webBaseUrl()}/creator/analytics` },
    });
    return this.send(to, 'You have a new sale!', html);
  }

  async sendPayoutCompleted(to: string, name: string, amount: number, method: string) {
    const html = renderEmailLayout({
      preview: 'Your payout has been processed',
      eyebrow: 'Payments',
      title: 'Payout processed',
      body: this.templates.payoutCompleted(name, amount, method),
    });
    return this.send(to, 'Your payout has been processed', html);
  }

  // -------------------------------------------------------------------------
  // Follow-up & recovery
  // -------------------------------------------------------------------------

  async sendReviewRequest(
    to: string,
    name: string,
    product: { title: string; slug: string },
    reviewUrl?: string,
    delayMs = 3 * 24 * 60 * 60 * 1000, // follow-up: 3 days after purchase
  ) {
    const html = renderEmailLayout({
      preview: `How was ${product.title}?`,
      eyebrow: 'Follow-up',
      title: `How was ${product.title}?`,
      body: this.templates.reviewRequest(name, product),
      cta: { label: 'Leave a review', url: reviewUrl || `${webBaseUrl()}/products/${product.slug}` },
    });
    return this.send(to, `How was ${product.title}? Share your review`, html, { delayMs });
  }

  async sendAbandonedCart(
    to: string,
    name: string,
    items: { title: string; price: number }[],
    cartUrl?: string,
  ) {
    const html = renderAbandonedCartEmail({
      name,
      items,
      cartUrl: cartUrl || `${webBaseUrl()}/cart`,
    });
    return this.send(to, 'Your CreatorPlus cart is still waiting for you', html, {
      marketing: true,
    });
  }

  async sendPaymentReminder(
    to: string,
    name: string,
    order: { id: string; items: { title: string; price: number }[] },
  ) {
    const html = renderPaymentReminderEmail({
      name,
      orderId: order.id,
      items: order.items,
      checkoutUrl: `${webBaseUrl()}/checkout?orderId=${order.id}`,
    });
    return this.send(to, 'Complete your order on CreatorPlus', html);
  }

  // -------------------------------------------------------------------------
  // Creator / product lifecycle
  // -------------------------------------------------------------------------

  async sendProductApproved(to: string, name: string, product: { title: string; slug: string }) {
    const productUrl = `${webBaseUrl()}/products/${product.slug}`;
    const html = renderEmailLayout({
      preview: 'Your product has been approved!',
      eyebrow: 'Marketplace',
      title: 'Your product is live!',
      body: this.templates.productApproved(name, product),
      cta: { label: 'View product', url: productUrl },
    });
    return this.send(to, 'Your product has been approved!', html);
  }

  async sendProductRejected(to: string, name: string, product: { title: string; reason?: string }) {
    const html = renderEmailLayout({
      preview: 'Update on your product submission',
      eyebrow: 'Marketplace',
      title: 'We need an update on your product',
      body: this.templates.productRejected(name, product),
    });
    return this.send(to, 'Update on your product submission', html);
  }

  async sendNewReview(
    to: string,
    name: string,
    product: { title: string },
    review: { rating: number; comment: string },
  ) {
    const html = renderEmailLayout({
      preview: 'Your product received a new review',
      eyebrow: 'Reviews',
      title: 'New review on your product',
      body: this.templates.newReview(name, product, review),
    });
    return this.send(to, 'Your product received a new review', html);
  }

  async sendPriceDrop(
    to: string,
    name: string,
    product: { title: string; slug: string; newPrice: number },
  ) {
    const productUrl = `${webBaseUrl()}/products/${product.slug}`;
    const html = renderEmailLayout({
      preview: `Price drop: ${product.title}`,
      eyebrow: 'Price alert',
      title: `Price drop on ${product.title}`,
      body: this.templates.priceDrop(name, product),
      cta: { label: 'View it before the price changes', url: productUrl },
      marketing: true,
    });
    return this.send(to, `Price drop: ${product.title} is now ₦${product.newPrice.toLocaleString()}`, html, {
      marketing: true,
    });
  }

  async sendCreatorVerified(to: string, name: string, storeName: string) {
    const html = renderEmailLayout({
      preview: 'Your store is now verified',
      eyebrow: 'Store',
      title: 'Your store is verified!',
      body: this.templates.creatorVerified(name, storeName),
      cta: { label: 'Go to your store', url: `${webBaseUrl()}/creator` },
    });
    return this.send(to, 'Your store is now verified', html);
  }

  async sendCreatorRejected(to: string, name: string, storeName: string, reason?: string) {
    const html = renderEmailLayout({
      preview: 'Update needed to verify your store',
      eyebrow: 'Store',
      title: 'A quick update on your store',
      body: this.templates.creatorRejected(name, storeName, reason),
    });
    return this.send(to, 'Update needed to verify your store', html);
  }

  // -------------------------------------------------------------------------
  // Marketing
  // -------------------------------------------------------------------------

  async sendBroadcast(to: string, name: string, title: string, message: string) {
    const html = renderEmailLayout({
      preview: title,
      eyebrow: 'From the CreatorPlus team',
      title,
      body: this.templates.broadcast(name, message),
      cta: { label: 'Visit the marketplace', url: webBaseUrl() },
      marketing: true,
    });
    return this.send(to, title, html, { marketing: true });
  }

  // -------------------------------------------------------------------------
  // Delivery
  // -------------------------------------------------------------------------

  private async send(
    to: string,
    subject: string,
    html: string,
    opts?: { marketing?: boolean; delayMs?: number },
  ) {
    // Offload to the worker queue when enabled (EMAIL_QUEUE=1 + Redis);
    // otherwise deliver inline. The template is fully rendered here, so the
    // worker only performs SMTP delivery — no template logic is duplicated.
    if (await enqueueEmail({ to, subject, html }, opts)) {
      return { success: true, queued: true, delayed: !!opts?.delayMs };
    }

    if (opts?.delayMs) {
      this.logger.log(
        `Email queue disabled; sending "${subject}" to ${to} inline instead of after ${opts.delayMs}ms`,
      );
    }

    try {
      await this.transporter.sendMail({
        from: fromAddress(),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private money(value: number): string {
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private templates = {
    welcome: (name: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Thank you for joining ${SITE_NAME}! We're excited to have you in our community of African digital creators and buyers.</p>
      <p style="margin: 0 0 16px;">Whether you're here to buy amazing digital products or sell your own creations, you've come to the right place.</p>
      <p style="margin: 0;">If you have any questions, just reply to this email — a real human will get back to you.</p>
      <p style="margin: 16px 0 0;">Best regards,<br>The ${SITE_NAME} Team</p>
    `,

    emailVerification: (name: string, url: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Please confirm your email address to activate your ${SITE_NAME} account:</p>
      <p style="margin: 0 0 16px;">If you didn't create an account, you can safely ignore this email.</p>
      <p class="muted" style="margin: 0; font-size: 13px;">This link will expire in 24 hours.</p>
    `,

    passwordReset: (name: string, url: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">You requested a password reset. Click the button below to create a new password:</p>
      <p style="margin: 0 0 16px;">If you didn't request this, you can safely ignore this email — your password stays the same.</p>
      <p class="muted" style="margin: 0; font-size: 13px;">This link will expire in 1 hour.</p>
    `,

    orderConfirmation: (name: string, order: { id: string; total: number; items: { title: string; price: number }[]; viewUrl?: string }) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Thank you for your purchase! Your order is confirmed and your downloads are ready.</p>
      <p style="margin: 0 0 16px;"><strong style="color: ${BRAND.ink900};">Order ID:</strong> ${order.id}</p>
      <table class="products" role="presentation" cellpadding="0" cellspacing="0">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item) => `
            <tr>
              <td>${item.title}</td>
              <td>${this.money(item.price)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total">
            <td>Total</td>
            <td>${this.money(order.total)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin: 0;">This receipt also appears in your ${SITE_NAME} dashboard under Purchases.</p>
    `,

    newSale: (name: string, product: { title: string }, amount: number) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Congratulations! You just made a sale. 🎉</p>
      <p style="margin: 0 0 16px;"><strong style="color: ${BRAND.ink900};">Product:</strong> ${product.title}<br>
      <strong style="color: ${BRAND.ink900};">Amount:</strong> ${this.money(amount)}</p>
      <p style="margin: 0;">Keep an eye on your analytics to see what's resonating with buyers.</p>
    `,

    payoutCompleted: (name: string, amount: number, method: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Your payout of <strong style="color: ${BRAND.ink900};">${this.money(amount)}</strong> has been processed via ${method}.</p>
      <p style="margin: 0;">The funds should arrive in your account within 1–3 business days.</p>
    `,

    reviewRequest: (name: string, product: { title: string }) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">You recently bought "<strong style="color: ${BRAND.ink900};">${product.title}</strong>" on ${SITE_NAME}. How did you find it?</p>
      <p style="margin: 0 0 16px;">A short review takes under a minute and helps other buyers — and it helps the creator know what's working.</p>
    `,

    productApproved: (name: string, product: { title: string }) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Great news! Your product "<strong style="color: ${BRAND.ink900};">${product.title}</strong>" has been approved and is now live on the marketplace.</p>
      <p style="margin: 0;">Buyers can now discover and purchase your product.</p>
    `,

    productRejected: (name: string, product: { title: string; reason?: string }) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Your product "<strong style="color: ${BRAND.ink900};">${product.title}</strong>" wasn't approved for listing at this time.</p>
      ${product.reason ? `<p style="margin: 0 0 16px;"><strong style="color: ${BRAND.ink900};">Reason:</strong> ${product.reason}</p>` : ''}
      <p style="margin: 0;">Please review the submission guidelines, make any changes, and resubmit — we'd love to see it live.</p>
    `,

    newReview: (name: string, product: { title: string }, review: { rating: number; comment: string }) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Your product "<strong style="color: ${BRAND.ink900};">${product.title}</strong>" received a new review:</p>
      <p class="stars" style="margin: 0 0 12px;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</p>
      ${review.comment ? `<blockquote style="margin: 0 0 16px;">${review.comment}</blockquote>` : ''}
    `,

    priceDrop: (name: string, product: { title: string; newPrice: number }) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Good news — an item on your wishlist just got cheaper!</p>
      <p style="margin: 0 0 16px;"><strong style="color: ${BRAND.ink900};">${product.title}</strong> is now <strong style="color: ${BRAND.ink900};">${this.money(product.newPrice)}</strong>.</p>
      <p style="margin: 0;">Add it to your cart before the price changes.</p>
    `,

    creatorVerified: (name: string, storeName: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Congratulations! Your store "<strong style="color: ${BRAND.ink900};">${storeName}</strong>" has been approved and verified.</p>
      <p style="margin: 0;">Your verified badge is now live on your public profile.</p>
    `,

    creatorRejected: (name: string, storeName: string, reason?: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0 0 16px;">Your store "<strong style="color: ${BRAND.ink900};">${storeName}</strong>" wasn't approved at this time.</p>
      ${reason ? `<p style="margin: 0 0 16px;"><strong style="color: ${BRAND.ink900};">Reason:</strong> ${reason}</p>` : ''}
      <p style="margin: 0;">You can update your store profile and resubmit for review.</p>
    `,

    broadcast: (name: string, message: string) => `
      <p style="margin: 0 0 16px;">Hi ${name},</p>
      <p style="margin: 0;">${message.replace(/\n/g, '<br/>')}</p>
    `,
  };
}
