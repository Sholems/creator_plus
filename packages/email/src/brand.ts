/**
 * CreatorPlus email brand — single source of truth for the name, sender
 * address, logo and design tokens used in every outgoing message. Shared by
 * the API (rendering + sending) and the workers (SMTP delivery).
 *
 * Colors mirror the design tokens in apps/web/src/styles/globals.css
 * (deep forest green + savanna gold + palm-cream).
 */

export const SITE_NAME = 'CreatorPlus';
export const SITE_DOMAIN = 'mycreatorplus.com';
export const SITE_URL = 'https://mycreatorplus.com';

/** Publicly hosted brand mark (served from the web app's /public). */
export const LOGO_URL = `${SITE_URL}/logo-icon.png`;

/** Default no-reply sender — override with SMTP_FROM for a real address. */
export const DEFAULT_FROM_ADDRESS = `noreply@${SITE_DOMAIN}`;

export const BRAND = {
  forest950: '#052119',
  forest900: '#0a2e22',
  forest800: '#103d2e',
  forest700: '#174f3b',
  forest600: '#206349',
  gold600: '#b98213',
  gold500: '#d79b1a',
  gold300: '#f0c860',
  cream50: '#fbf8f1',
  cream100: '#f6f0e2',
  ink900: '#16211b',
  ink700: '#35443b',
  ink600: '#4c5c52',
  ink500: '#66776c',
  ink400: '#87968b',
  ink200: '#ccd3cd',
  ink100: '#e7eae7',
} as const;

/** Full display name + address for the `From:` header. */
export function fromAddress(): string {
  return `"${SITE_NAME}" <${process.env.SMTP_FROM || DEFAULT_FROM_ADDRESS}>`;
}
