import { Prisma } from '@creatorplus/database';
import {
  AFFILIATE_COMMISSION_RATES,
  DEFAULT_AFFILIATE_COMMISSION_RATE,
  isAllowedAffiliateRate,
  effectiveAffiliateRate,
  calculateItemCommission,
} from './commission-calculator';

describe('isAllowedAffiliateRate', () => {
  it('accepts exactly the discrete creator-selectable set', () => {
    for (const rate of AFFILIATE_COMMISSION_RATES) {
      expect(isAllowedAffiliateRate(rate)).toBe(true);
    }
  });

  it('rejects anything outside the set', () => {
    expect(isAllowedAffiliateRate(45)).toBe(false);
    expect(isAllowedAffiliateRate(0)).toBe(false);
    expect(isAllowedAffiliateRate(15)).toBe(false);
  });
});

describe('effectiveAffiliateRate', () => {
  it('is 0 when no affiliate is attributed, regardless of the stored rate', () => {
    expect(effectiveAffiliateRate(30, false)).toBe(0);
    expect(effectiveAffiliateRate(null, false)).toBe(0);
  });

  it('uses the stored rate for an attributed sale', () => {
    expect(effectiveAffiliateRate(25, true)).toBe(25);
    expect(effectiveAffiliateRate(50, true)).toBe(50);
  });

  it('falls back to the default for a legacy product without a stored rate', () => {
    expect(effectiveAffiliateRate(null, true)).toBe(DEFAULT_AFFILIATE_COMMISSION_RATE);
  });

  it('falls back to the default when an attributed product holds an unvalidated rate', () => {
    expect(effectiveAffiliateRate(13, true)).toBe(DEFAULT_AFFILIATE_COMMISSION_RATE);
  });
});

describe('calculateItemCommission', () => {
  const base = {
    gross: new Prisma.Decimal(1000),
    discount: new Prisma.Decimal(0),
    platformRate: new Prisma.Decimal(10),
    productAffiliateRate: 20,
  };

  it('computes the split, effective rate and UNKNOWN source for a direct sale', () => {
    const r = calculateItemCommission({ ...base, attributed: false });
    expect(r.split.creatorAmount.toString()).toBe('900');
    expect(r.split.affiliateAmount.toString()).toBe('0');
    expect(r.effectiveAffiliateRate).toBe(0);
    expect(r.acquisitionSource).toBe('UNKNOWN');
  });

  it('an attributed sale carries the product rate and AFFILIATE source', () => {
    const r = calculateItemCommission({ ...base, attributed: true });
    expect(r.effectiveAffiliateRate).toBe(20);
    expect(r.split.affiliateAmount.toString()).toBe('200');
    expect(r.split.creatorAmount.toString()).toBe('700');
    expect(r.acquisitionSource).toBe('AFFILIATE');
  });

  it('utm campaign on a direct sale is PLATFORM_CAMPAIGN', () => {
    const r = calculateItemCommission({
      ...base,
      attributed: false,
      acquisition: { utmCampaign: 'launch' },
    });
    expect(r.acquisitionSource).toBe('PLATFORM_CAMPAIGN');
  });

  it('an explicit source hint is preserved on the result', () => {
    const r = calculateItemCommission({
      ...base,
      attributed: false,
      acquisition: { explicit: 'CREATOR_DIRECT' },
    });
    expect(r.acquisitionSource).toBe('CREATOR_DIRECT');
  });
});
