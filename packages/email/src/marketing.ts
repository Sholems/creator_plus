import { BRAND, SITE_NAME } from './brand';
import { renderEmailLayout } from './layout';

export interface AbandonedCartLine {
  title: string;
  price: number;
}

export interface PaymentReminderLine {
  title: string;
  price: number;
}

function money(value: number): string {
  return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Branded abandoned-cart recovery email. Shared by the API's sendAbandonedCart
 * and the workers' recovery job so the template lives in exactly one place.
 */
export function renderAbandonedCartEmail(opts: {
  name: string;
  items: AbandonedCartLine[];
  cartUrl: string;
}): string {
  const rows = opts.items
    .map(
      (item) => `
        <tr>
          <td>${item.title}</td>
          <td>${money(item.price)}</td>
        </tr>`,
    )
    .join('');

  const body = `
    <p style="margin: 0 0 16px;">Hi ${opts.name},</p>
    <p style="margin: 0 0 16px;">You left something in your cart:</p>
    <table class="products" role="presentation" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th>Product</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p style="margin: 16px 0 0;">Prices can change — come back and finish your order whenever you're ready.</p>
  `;

  return renderEmailLayout({
    preview: 'Your cart is still waiting',
    eyebrow: 'Almost yours',
    title: 'Your cart is still waiting',
    body,
    cta: { label: 'Complete your order', url: opts.cartUrl },
    marketing: true,
  });
}

/**
 * Payment reminder email — sent by an admin to a buyer whose order was never
 * paid. Links them directly back to the checkout page for that order.
 */
export function renderPaymentReminderEmail(opts: {
  name: string;
  orderId: string;
  items: PaymentReminderLine[];
  checkoutUrl: string;
}): string {
  const rows = opts.items
    .map(
      (item) => `
        <tr>
          <td>${item.title}</td>
          <td>${money(item.price)}</td>
        </tr>`,
    )
    .join('');

  const body = `
    <p style="margin: 0 0 16px;">Hi ${opts.name},</p>
    <p style="margin: 0 0 16px;">You recently started an order on ${SITE_NAME} but didn't finish paying. Your items are still waiting:</p>
    <table class="products" role="presentation" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th>Product</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p style="margin: 16px 0 0;">Click the button below to complete your purchase. If you've already paid, you can safely ignore this email.</p>
  `;

  return renderEmailLayout({
    preview: 'Complete your order',
    eyebrow: 'Order reminder',
    title: 'Your order is still waiting',
    body,
    cta: { label: 'Complete your order', url: opts.checkoutUrl },
  });
}
