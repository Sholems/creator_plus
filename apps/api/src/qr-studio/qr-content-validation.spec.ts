import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  assertContentTypeAllowed,
  assertScanModeAllowed,
  normalizeSafePublicUrl,
  validateCampaignDestination,
} from './qr-content-validation';

describe('QR content validation', () => {
  it('blocks Pro launch content types for non-Pro users', () => {
    expect(() => assertContentTypeAllowed('TEXT_NOTE', false)).toThrow(ForbiddenException);
    expect(() => assertContentTypeAllowed('TEXT_NOTE', true)).not.toThrow();
  });

  it('allows basic users to create file and website campaigns', () => {
    expect(() => assertContentTypeAllowed('FILE', false)).not.toThrow();
    expect(() => assertContentTypeAllowed('WEBSITE', false)).not.toThrow();
  });

  it('gates direct-open scan mode to Pro users', () => {
    expect(() => assertScanModeAllowed('DIRECT_OPEN', false)).toThrow(ForbiddenException);
    expect(() => assertScanModeAllowed('LANDING_PAGE', false)).not.toThrow();
  });

  it('rejects unsafe redirect destinations', () => {
    expect(() => normalizeSafePublicUrl('http://example.com')).toThrow(BadRequestException);
    expect(() => normalizeSafePublicUrl('https://user:pass@example.com')).toThrow(BadRequestException);
    expect(() => normalizeSafePublicUrl('https://localhost/test')).toThrow(BadRequestException);
    expect(() => normalizeSafePublicUrl('https://192.168.1.10/test')).toThrow(BadRequestException);
  });

  it('strips fragments from safe URLs', () => {
    expect(normalizeSafePublicUrl('https://example.com/path?q=1#secret')).toBe('https://example.com/path?q=1');
  });

  it('normalizes WhatsApp and social link hub content', () => {
    expect(validateCampaignDestination('WHATSAPP', null, { phone: '+2348012345678' })).toMatchObject({
      destinationUrl: 'https://wa.me/2348012345678',
    });
    expect(
      validateCampaignDestination('SOCIAL_LINK_HUB', null, {
        links: [{ label: 'Site', url: 'https://example.com' }],
      }),
    ).toEqual({
      destinationUrl: null,
      destinationData: { links: [{ label: 'Site', url: 'https://example.com/' }] },
    });
  });

  it('validates a vCard contact card', () => {
    expect(
      validateCampaignDestination('VCARD', null, { fullName: 'Ada Lovelace', email: 'ada@x.com', website: 'https://ada.dev' }),
    ).toMatchObject({ destinationUrl: null, destinationData: { fullName: 'Ada Lovelace', email: 'ada@x.com', website: 'https://ada.dev/' } });
    expect(() => validateCampaignDestination('VCARD', null, { fullName: '' })).toThrow('name is required');
    expect(() => validateCampaignDestination('VCARD', null, { fullName: 'A', email: 'bad' })).toThrow('valid email');
  });

  it('validates a coupon-content type', () => {
    expect(validateCampaignDestination('COUPON', null, { code: 'SALE10', description: '10% off' })).toMatchObject({
      destinationData: { code: 'SALE10', description: '10% off' },
    });
    expect(() => validateCampaignDestination('COUPON', null, {})).toThrow('coupon code is required');
  });

  it('builds a safe maps URL for a location', () => {
    const res = validateCampaignDestination('LOCATION', null, { latitude: 6.5244, longitude: 3.3792, label: 'Lagos' });
    expect(res.destinationUrl).toContain('https://www.google.com/maps');
    expect(res.destinationUrl).toContain('6.5244%2C3.3792');
    expect(() => validateCampaignDestination('LOCATION', null, {})).toThrow('address or coordinates');
  });

  it('validates email and SMS actions', () => {
    expect(validateCampaignDestination('EMAIL', null, { email: 'hi@x.com', subject: 'Yo' })).toMatchObject({
      destinationUrl: null,
      destinationData: { email: 'hi@x.com', subject: 'Yo' },
    });
    expect(() => validateCampaignDestination('EMAIL', null, { email: 'bad' })).toThrow('valid email');
    expect(validateCampaignDestination('SMS', null, { phone: '+2348012345678', message: 'Hi' })).toMatchObject({
      destinationData: { phone: '+2348012345678', message: 'Hi' },
    });
    expect(() => validateCampaignDestination('SMS', null, { phone: '123' })).toThrow('valid phone');
  });

  it('allowlists video and audio hosts (blocks arbitrary embeds)', () => {
    expect(validateCampaignDestination('VIDEO', null, { url: 'https://youtu.be/abc123' })).toMatchObject({
      destinationData: { url: 'https://youtu.be/abc123' },
    });
    expect(() => validateCampaignDestination('VIDEO', null, { url: 'https://evil.example/x' })).toThrow('supported video');
    expect(validateCampaignDestination('AUDIO', null, { url: 'https://open.spotify.com/track/1' })).toMatchObject({
      destinationData: { url: 'https://open.spotify.com/track/1' },
    });
    expect(() => validateCampaignDestination('AUDIO', null, { url: 'https://evil.example/x' })).toThrow('supported audio');
  });

  it('validates app-store links and requires at least one', () => {
    expect(
      validateCampaignDestination('APP_LINK', null, { iosUrl: 'https://apps.apple.com/app/id1', androidUrl: 'https://play.google.com/store/apps/details?id=x' }),
    ).toMatchObject({ destinationData: { iosUrl: 'https://apps.apple.com/app/id1' } });
    expect(() => validateCampaignDestination('APP_LINK', null, { iosUrl: 'https://evil.example/x' })).toThrow('App Store');
    expect(() => validateCampaignDestination('APP_LINK', null, {})).toThrow('at least one');
  });

  it('treats an event as a validated public URL', () => {
    expect(validateCampaignDestination('EVENT', 'https://mycreatorplus.com/products/e', null)).toMatchObject({
      destinationUrl: 'https://mycreatorplus.com/products/e',
    });
  });

  it('validates Wi-Fi content and drops the password for open networks', () => {
    expect(validateCampaignDestination('WIFI', null, { ssid: 'CafeNet', password: 'secret', encryption: 'WPA' })).toMatchObject({
      destinationData: { ssid: 'CafeNet', password: 'secret', encryption: 'WPA', hidden: false },
    });
    expect(validateCampaignDestination('WIFI', null, { ssid: 'Open', encryption: 'nopass', password: 'x' })).toMatchObject({
      destinationData: { ssid: 'Open', encryption: 'nopass', password: undefined },
    });
    expect(() => validateCampaignDestination('WIFI', null, {})).toThrow('SSID');
  });
});
