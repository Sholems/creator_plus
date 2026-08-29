import { BASIC_QR_CONTENT_TYPES, getQrOffer, PRO_QR_CONTENT_TYPES, QR_PAYMENT_REFERENCE_PREFIX } from './qr-offer-definitions';

describe('QR Studio offer definitions', () => {
  it('uses the agreed paid prices and Paystack reference prefix', () => {
    expect(QR_PAYMENT_REFERENCE_PREFIX).toBe('QR');
    expect(getQrOffer('SINGLE').amount).toBe(1500);
    expect(getQrOffer('PACK').amount).toBe(5000);
    expect(getQrOffer('PRO_MONTHLY').amount).toBe(2000);
    expect(getQrOffer('PRO_YEARLY').amount).toBe(20000);
  });

  it('keeps basic content narrow and gives Pro the launch content set', () => {
    expect([...BASIC_QR_CONTENT_TYPES].sort()).toEqual(['FILE', 'WEBSITE']);
    expect(PRO_QR_CONTENT_TYPES.has('TEXT_NOTE')).toBe(true);
    expect(PRO_QR_CONTENT_TYPES.has('WHATSAPP')).toBe(true);
    expect(PRO_QR_CONTENT_TYPES.has('IMAGE_GALLERY')).toBe(true);
  });

  it('models Pro as prepaid access, not unlimited campaigns', () => {
    expect(getQrOffer('PRO_MONTHLY')).toMatchObject({
      kind: 'PRO_PASS',
      maxActiveCampaigns: 20,
      durationDays: 30,
    });
    expect(getQrOffer('PRO_YEARLY')).toMatchObject({
      kind: 'PRO_PASS',
      maxActiveCampaigns: 20,
      durationDays: 365,
    });
  });
});
