import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { enqueueEmail } from '../common/queue';

const SITE_NAME = 'CreatorPlus';
const BRAND = {
  forest: '#052119',
  gold: '#D2A334',
  goldDark: '#7D520C',
  cream: '#FBF8F1',
  ink: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWelcome(to: string, name: string) {
    const html = this.layout(
      'Welcome to CreatorPlus',
      this.templates.welcome(name),
      true,
    );
    return this.send(to, `Welcome to ${SITE_NAME}!`, html);
  }

  async sendEmailVerification(to: string, name: string, token: string) {
    const verificationUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
    const html = this.layout(
      'Verify your email',
      this.templates.emailVerification(name, verificationUrl),
      true,
    );
    return this.send(to, 'Verify your email address', html);
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    const html = this.layout(
      'Reset your password',
      this.templates.passwordReset(name, resetUrl),
      true,
    );
    return this.send(to, 'Reset your password', html);
  }

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
    const html = this.layout(
      'Order confirmed',
      this.templates.orderConfirmation(name, order),
    );
    return this.send(to, `Order ${order.id.slice(0, 8).toUpperCase()} confirmed`, html);
  }

  async sendProductApproved(to: string, name: string, product: { title: string; slug: string }) {
    const productUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/products/${product.slug}`;
    const html = this.layout(
      'Product approved',
      this.templates.productApproved(name, product, productUrl),
      true,
    );
    return this.send(to, 'Your product has been approved!', html);
  }

  async sendProductRejected(to: string, name: string, product: { title: string; reason?: string }) {
    const html = this.layout(
      'Product update',
      this.templates.productRejected(name, product),
      false,
    );
    return this.send(to, 'Update on your product submission', html);
  }

  async sendPayoutCompleted(to: string, name: string, amount: number, method: string) {
    const html = this.layout(
      'Payout processed',
      this.templates.payoutCompleted(name, amount, method),
    );
    return this.send(to, 'Your payout has been processed', html);
  }

  async sendNewSale(to: string, name: string, product: { title: string }, amount: number) {
    const html = this.layout(
      'New sale',
      this.templates.newSale(name, product, amount),
    );
    return this.send(to, 'You have a new sale!', html);
  }

  async sendNewReview(
    to: string,
    name: string,
    product: { title: string },
    review: { rating: number; comment: string },
  ) {
    const html = this.layout(
      'New review',
      this.templates.newReview(name, product, review),
    );
    return this.send(to, 'Your product received a new review', html);
  }

  async sendPriceDrop(
    to: string,
    name: string,
    product: { title: string; slug: string; newPrice: number },
  ) {
    const productUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/products/${product.slug}`;
    const html = this.layout(
      'Price drop',
      this.templates.priceDrop(name, product, productUrl),
      true,
    );
    return this.send(to, `Price drop: ${product.title} is now ₦${product.newPrice.toLocaleString()}`, html);
  }

  async sendCreatorVerified(to: string, name: string, storeName: string) {
    const html = this.layout(
      'Store verified',
      this.templates.creatorVerified(name, storeName),
      true,
    );
    return this.send(to, 'Your store is now verified', html);
  }

  async sendCreatorRejected(to: string, name: string, storeName: string, reason?: string) {
    const html = this.layout(
      'Store update',
      this.templates.creatorRejected(name, storeName, reason),
      false,
    );
    return this.send(to, 'Update needed to verify your store', html);
  }

  async sendBroadcast(to: string, name: string, title: string, message: string) {
    const html = this.layout(
      'Platform update',
      this.templates.broadcast(name, title, message),
      true,
    );
    return this.send(to, title, html);
  }

  private async send(to: string, subject: string, html: string) {
    // Offload to the worker queue when enabled (EMAIL_QUEUE=1 + Redis);
    // otherwise deliver inline. The template is fully rendered here, so the
    // worker only performs SMTP delivery — no template logic is duplicated.
    if (await enqueueEmail({ to, subject, html })) {
      return { success: true, queued: true };
    }

    try {
      await this.transporter.sendMail({
        from: `"${SITE_NAME}" <${process.env.SMTP_FROM || 'noreply@mycreatorplus.com'}>`,
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

  private layout(title: string, bodyHtml: string, cta = false): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: ${BRAND.ink}; margin: 0; padding: 0; background: ${BRAND.cream}; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${BRAND.forest}; color: #ffffff; padding: 24px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.2px; }
    .header .brand { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${BRAND.gold}; margin-bottom: 6px; font-weight: 700; }
    .content { background: #ffffff; padding: 32px 28px; border: 1px solid ${BRAND.border}; border-top: none; }
    .footer { text-align: center; padding: 20px; color: ${BRAND.muted}; font-size: 12px; }
    .btn { display: inline-block; background: ${BRAND.gold}; color: ${BRAND.forest}; font-weight: 700; padding: 12px 26px; text-decoration: none; border-radius: 8px; }
    .btn-plain { display: inline-block; color: ${BRAND.goldDark}; font-weight: 600; text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid ${BRAND.border}; font-size: 14px; }
    th { background: ${BRAND.cream}; color: ${BRAND.forest}; }
    .total-row td { border-top: 2px solid ${BRAND.forest}; border-bottom: none; font-weight: 700; }
    .stars { color: ${BRAND.gold}; font-size: 22px; }
    blockquote { border-left: 4px solid ${BRAND.gold}; padding-left: 16px; margin: 20px 0; color: ${BRAND.muted}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">${SITE_NAME}</div>
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
      <p>You received this email because you have an account on ${SITE_NAME}.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private money(value: number): string {
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private templates = {
    welcome: (name: string) => `
      <p>Hi ${name},</p>
      <p>Thank you for joining ${SITE_NAME}! We're excited to have you as part of our community of African digital creators and buyers.</p>
      <p>Whether you're here to buy amazing digital products or sell your own creations, you've come to the right place.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.WEB_URL || 'http://localhost:3000'}" class="btn">Explore the marketplace</a>
      </p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The ${SITE_NAME} Team</p>
    `,

    emailVerification: (name: string, url: string) => `
      <p>Hi ${name},</p>
      <p>Please click the button below to verify your email address:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${url}" class="btn">Verify Email</a>
      </p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `,

    passwordReset: (name: string, url: string) => `
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the button below to create a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${url}" class="btn">Reset Password</a>
      </p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `,

    orderConfirmation: (name: string, order: { id: string; total: number; items: { title: string; price: number }[]; viewUrl?: string }) => `
      <p>Hi ${name},</p>
      <p>Thank you for your purchase! Your order has been confirmed and your downloads are ready.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <table>
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
          <tr class="total-row">
            <td>Total</td>
            <td>${this.money(order.total)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${order.viewUrl || `${process.env.WEB_URL || 'http://localhost:3000'}/dashboard/downloads`}" class="btn">View your downloads</a>
      </p>
      <p>This receipt also appears on your ${SITE_NAME} dashboard under Purchases.</p>
    `,

    productApproved: (name: string, product: { title: string; slug: string }, url: string) => `
      <p>Hi ${name},</p>
      <p>Great news! Your product "<strong>${product.title}</strong>" has been approved and is now live on the marketplace.</p>
      <p>Buyers can now discover and purchase your product.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${url}" class="btn">View Product</a>
      </p>
    `,

    productRejected: (name: string, product: { title: string; reason?: string }) => `
      <p>Hi ${name},</p>
      <p>Your product "<strong>${product.title}</strong>" was not approved for listing at this time.</p>
      ${product.reason ? `<p><strong>Reason:</strong> ${product.reason}</p>` : ''}
      <p>Please review the submission guidelines and make any necessary changes before resubmitting.</p>
    `,

    payoutCompleted: (name: string, amount: number, method: string) => `
      <p>Hi ${name},</p>
      <p>Your payout of <strong>${this.money(amount)}</strong> has been processed via ${method}.</p>
      <p>The funds should arrive in your account within 1-3 business days.</p>
    `,

    newSale: (name: string, product: { title: string }, amount: number) => `
      <p>Hi ${name},</p>
      <p>Congratulations! You just made a sale!</p>
      <p><strong>Product:</strong> ${product.title}</p>
      <p><strong>Amount:</strong> ${this.money(amount)}</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.WEB_URL || 'http://localhost:3000'}/creator/analytics" class="btn">View Analytics</a>
      </p>
    `,

    newReview: (name: string, product: { title: string }, review: { rating: number; comment: string }) => `
      <p>Hi ${name},</p>
      <p>Your product "<strong>${product.title}</strong>" received a new review:</p>
      <p class="stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</p>
      ${review.comment ? `<blockquote>${review.comment}</blockquote>` : ''}
    `,

    priceDrop: (name: string, product: { title: string; slug: string; newPrice: number }, url: string) => `
      <p>Hi ${name},</p>
      <p>Good news — one of the items on your wishlist just got cheaper!</p>
      <p><strong>${product.title}</strong> is now <strong>${this.money(product.newPrice)}</strong>.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${url}" class="btn">View it before the price changes</a>
      </p>
      <p>Add it to your cart to keep it there, or come back any time.</p>
    `,

    creatorVerified: (name: string, storeName: string) => `
      <p>Hi ${name},</p>
      <p>Congratulations! Your store "<strong>${storeName}</strong>" has been approved and verified.</p>
      <p>Your verified badge is now live on your public profile.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.WEB_URL || 'http://localhost:3000'}/creator" class="btn">Go to your store</a>
      </p>
    `,

    creatorRejected: (name: string, storeName: string, reason?: string) => `
      <p>Hi ${name},</p>
      <p>Your store "<strong>${storeName}</strong>" was not approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>You can update your store profile and resubmit for review.</p>
    `,

    broadcast: (name: string, title: string, message: string) => `
      <p>Hi ${name},</p>
      <h2>${title}</h2>
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.WEB_URL || 'http://localhost:3000'}" class="btn">Visit the marketplace</a>
      </p>
      <p>You can also read this in your notifications on ${SITE_NAME}.</p>
    `,
  };
}
