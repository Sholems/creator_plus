import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QrContentType, QrScanMode } from '@creatorplus/database';
import { BASIC_QR_CONTENT_TYPES, PRO_QR_CONTENT_TYPES } from './qr-offer-definitions';

const SAFE_HOST_SUFFIXES = ['mycreatorplus.com', 'creatorplus.local'];

export function assertContentTypeAllowed(contentType: QrContentType, hasPro: boolean) {
  if (hasPro) {
    if (!PRO_QR_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException('This QR content type is not available yet');
    }
    return;
  }

  if (!BASIC_QR_CONTENT_TYPES.has(contentType)) {
    throw new ForbiddenException('This QR content type requires Pro QR Studio');
  }
}

export function assertScanModeAllowed(scanMode: QrScanMode, hasPro: boolean) {
  if (scanMode === 'DIRECT_OPEN' && !hasPro) {
    throw new ForbiddenException('Direct-open QR campaigns require Pro QR Studio');
  }
}

export function normalizeSafePublicUrl(value?: string | null): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new BadRequestException('Enter a valid URL');
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestException('QR destination URLs must use HTTPS');
  }
  if (url.username || url.password) {
    throw new BadRequestException('QR destination URLs cannot include credentials');
  }
  if (isUnsafeHost(url.hostname)) {
    throw new BadRequestException('QR destination cannot use localhost or private network hosts');
  }

  url.hash = '';
  return url.toString();
}

export function isCreatorPlusHost(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return SAFE_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export function destinationDomain(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function validateCampaignDestination(
  contentType: QrContentType,
  destinationUrl?: string | null,
  destinationData?: Record<string, any> | null,
) {
  switch (contentType) {
    case 'FILE':
    case 'IMAGE_GALLERY':
      return { destinationUrl: null, destinationData: destinationData ?? null };
    case 'TEXT_NOTE': {
      const text = String(destinationData?.text ?? '').trim();
      if (!text) throw new BadRequestException('Text note content is required');
      if (text.length > 5000) throw new BadRequestException('Text note is too long');
      return { destinationUrl: null, destinationData: { text } };
    }
    case 'WHATSAPP': {
      const raw = String(destinationData?.phone ?? '').replace(/[^\d+]/g, '');
      if (!/^\+?[1-9]\d{7,14}$/.test(raw)) {
        throw new BadRequestException('Enter a valid WhatsApp phone number');
      }
      const message = String(destinationData?.message ?? '').trim().slice(0, 500);
      return { destinationUrl: `https://wa.me/${raw.replace(/^\+/, '')}`, destinationData: { phone: raw, message } };
    }
    case 'SOCIAL_LINK_HUB': {
      const links = Array.isArray(destinationData?.links) ? destinationData.links : [];
      const safeLinks = links.slice(0, 10).map((link: any) => ({
        label: String(link?.label ?? '').trim().slice(0, 60),
        url: normalizeSafePublicUrl(String(link?.url ?? '')),
      }));
      if (safeLinks.length === 0) throw new BadRequestException('Add at least one social link');
      return { destinationUrl: null, destinationData: { links: safeLinks } };
    }
    case 'WEBSITE':
    case 'PRODUCT_PAGE':
    case 'CREATOR_PROFILE':
      return { destinationUrl: normalizeSafePublicUrl(destinationUrl), destinationData: destinationData ?? null };
    case 'VCARD': {
      const fullName = String(destinationData?.fullName ?? '').trim();
      if (!fullName) throw new BadRequestException('A name is required for a contact card');
      const email = String(destinationData?.email ?? '').trim();
      if (email && !isValidEmail(email)) throw new BadRequestException('Enter a valid email address');
      const phone = String(destinationData?.phone ?? '').replace(/[^\d+]/g, '');
      const website = destinationData?.website ? normalizeSafePublicUrl(String(destinationData.website)) : null;
      return {
        destinationUrl: null,
        destinationData: {
          fullName: fullName.slice(0, 120),
          org: String(destinationData?.org ?? '').trim().slice(0, 120) || undefined,
          title: String(destinationData?.title ?? '').trim().slice(0, 120) || undefined,
          phone: phone || undefined,
          email: email || undefined,
          website: website || undefined,
        },
      };
    }
    case 'COUPON': {
      const code = String(destinationData?.code ?? '').trim();
      if (!code) throw new BadRequestException('A coupon code is required');
      const ctaUrl = destinationData?.ctaUrl ? normalizeSafePublicUrl(String(destinationData.ctaUrl)) : null;
      return {
        destinationUrl: null,
        destinationData: {
          code: code.slice(0, 64),
          description: String(destinationData?.description ?? '').trim().slice(0, 500) || undefined,
          expiresAt: destinationData?.expiresAt ? String(destinationData.expiresAt).slice(0, 40) : undefined,
          ctaUrl: ctaUrl || undefined,
        },
      };
    }
    case 'LOCATION': {
      const lat = destinationData?.latitude;
      const lng = destinationData?.longitude;
      const address = String(destinationData?.address ?? '').trim();
      const hasCoords = typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      if (!hasCoords && !address) throw new BadRequestException('Provide an address or coordinates');
      const query = hasCoords ? `${lat},${lng}` : address;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      return {
        destinationUrl: mapUrl,
        destinationData: {
          label: String(destinationData?.label ?? '').trim().slice(0, 120) || undefined,
          latitude: hasCoords ? lat : undefined,
          longitude: hasCoords ? lng : undefined,
          address: address.slice(0, 300) || undefined,
        },
      };
    }
    case 'EMAIL': {
      const email = String(destinationData?.email ?? '').trim();
      if (!isValidEmail(email)) throw new BadRequestException('Enter a valid email address');
      return {
        destinationUrl: null,
        destinationData: {
          email,
          subject: String(destinationData?.subject ?? '').trim().slice(0, 200) || undefined,
          body: String(destinationData?.body ?? '').trim().slice(0, 2000) || undefined,
        },
      };
    }
    case 'SMS': {
      const phone = String(destinationData?.phone ?? '').replace(/[^\d+]/g, '');
      if (!/^\+?[1-9]\d{7,14}$/.test(phone)) throw new BadRequestException('Enter a valid phone number');
      return {
        destinationUrl: null,
        destinationData: { phone, message: String(destinationData?.message ?? '').trim().slice(0, 500) || undefined },
      };
    }
    case 'VIDEO': {
      const url = assertHostAllowed(String(destinationData?.url ?? destinationUrl ?? ''), VIDEO_HOSTS, 'video');
      return { destinationUrl: null, destinationData: { url } };
    }
    case 'AUDIO': {
      const url = assertHostAllowed(String(destinationData?.url ?? destinationUrl ?? ''), AUDIO_HOSTS, 'audio');
      return { destinationUrl: null, destinationData: { url } };
    }
    case 'APP_LINK': {
      const iosUrl = destinationData?.iosUrl ? assertHostAllowed(String(destinationData.iosUrl), APP_STORE_HOSTS, 'App Store') : undefined;
      const androidUrl = destinationData?.androidUrl ? assertHostAllowed(String(destinationData.androidUrl), PLAY_STORE_HOSTS, 'Play Store') : undefined;
      const webUrl = destinationData?.webUrl ? normalizeSafePublicUrl(String(destinationData.webUrl)) : undefined;
      if (!iosUrl && !androidUrl && !webUrl) throw new BadRequestException('Add at least one app or web link');
      return { destinationUrl: null, destinationData: { iosUrl, androidUrl, webUrl } };
    }
    case 'EVENT': {
      // Deep-link a CreatorPlus event/product page or a validated public event URL.
      return { destinationUrl: normalizeSafePublicUrl(destinationUrl), destinationData: destinationData ?? null };
    }
    default:
      throw new BadRequestException('Unsupported QR content type');
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com'];
const AUDIO_HOSTS = ['open.spotify.com', 'spotify.com', 'soundcloud.com'];
const APP_STORE_HOSTS = ['apps.apple.com', 'itunes.apple.com'];
const PLAY_STORE_HOSTS = ['play.google.com'];

/** A safe public URL that must also be hosted on one of the allowed embed/store
 *  hosts — prevents arbitrary iframes/redirects on public scan pages. */
export function assertHostAllowed(value: string, hosts: string[], label: string): string {
  const url = normalizeSafePublicUrl(value);
  if (!url) throw new BadRequestException(`A ${label} URL is required`);
  const host = new URL(url).hostname.toLowerCase();
  const ok = hosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (!ok) throw new BadRequestException(`That does not look like a supported ${label} link`);
  return url;
}

function isUnsafeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }
  return false;
}
