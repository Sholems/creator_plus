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
});
