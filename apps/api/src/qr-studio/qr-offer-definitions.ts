import { QrContentType, QrOfferCode } from '@creatorplus/database';

export type QrOfferDefinition = {
  code: QrOfferCode;
  name: string;
  amount: number;
  currency: 'NGN';
  kind: 'CAMPAIGN_CREDIT' | 'PRO_PASS';
  campaignCredits: number;
  maxActiveCampaigns: number;
  durationDays: number;
  pro: boolean;
};

export const QR_FEATURE_FLAG = 'qr_studio';
export const QR_PAYMENT_REFERENCE_PREFIX = 'QR';

export const QR_OFFERS: Record<QrOfferCode, QrOfferDefinition> = {
  SINGLE: {
    code: 'SINGLE',
    name: 'Single QR Campaign',
    amount: 1500,
    currency: 'NGN',
    kind: 'CAMPAIGN_CREDIT',
    campaignCredits: 1,
    maxActiveCampaigns: 1,
    durationDays: 365,
    pro: false,
  },
  PACK: {
    code: 'PACK',
    name: 'Creator QR Pack',
    amount: 5000,
    currency: 'NGN',
    kind: 'CAMPAIGN_CREDIT',
    campaignCredits: 5,
    maxActiveCampaigns: 5,
    durationDays: 365,
    pro: false,
  },
  PRO_MONTHLY: {
    code: 'PRO_MONTHLY',
    name: 'Pro QR Studio Monthly',
    amount: 2000,
    currency: 'NGN',
    kind: 'PRO_PASS',
    campaignCredits: 0,
    maxActiveCampaigns: 20,
    durationDays: 30,
    pro: true,
  },
  PRO_YEARLY: {
    code: 'PRO_YEARLY',
    name: 'Pro QR Studio Yearly',
    amount: 20000,
    currency: 'NGN',
    kind: 'PRO_PASS',
    campaignCredits: 0,
    maxActiveCampaigns: 20,
    durationDays: 365,
    pro: true,
  },
};

export const BASIC_QR_CONTENT_TYPES = new Set<QrContentType>([
  'FILE',
  'WEBSITE',
]);

export const PRO_QR_CONTENT_TYPES = new Set<QrContentType>([
  'FILE',
  'IMAGE_GALLERY',
  'WEBSITE',
  'PRODUCT_PAGE',
  'CREATOR_PROFILE',
  'WHATSAPP',
  'SOCIAL_LINK_HUB',
  'TEXT_NOTE',
  'VCARD',
  'COUPON',
  'LOCATION',
  'EMAIL',
  'SMS',
]);

export function getQrOffer(code: QrOfferCode): QrOfferDefinition {
  return QR_OFFERS[code];
}

export function isQrStudioEnabled(): boolean {
  return process.env.QR_STUDIO_ENABLED !== 'false';
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
