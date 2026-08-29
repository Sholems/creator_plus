import { Prisma } from '@creatorplus/database';
import {
  computeItemSplit,
  allocateDiscount,
  classifyAcquisition,
  round2,
} from './commission-math';

describe('computeItemSplit', () => {
  it('direct sale: platform takes platformRate% of the basis, creator is the residual', () => {
    const split = computeItemSplit({
      gross: new Prisma.Decimal(1000),
      discount: new Prisma.Decimal(0),
      platformRate: new Prisma.Decimal(10),
      affiliateRate: new Prisma.Decimal(0),
    });
    expect(split.paid.toString()).toBe('1000');
    expect(split.platformAmount.toString()).toBe('100');
    expect(split.affiliateAmount.toString()).toBe('0');
    expect(split.creatorAmount.toString()).toBe('900');
    expect(split.attributed).toBe(false);
  });

  it('affiliate sale: reward is deducted from the creator side, platform stays whole', () => {
    const split = computeItemSplit({
      gross: new Prisma.Decimal(1000),
      discount: new Prisma.Decimal(0),
      platformRate: new Prisma.Decimal(10),
      affiliateRate: new Prisma.Decimal(20),
    });
    expect(split.platformAmount.toString()).toBe('100');
    expect(split.affiliateAmount.toString()).toBe('200');
    expect(split.creatorAmount.toString()).toBe('700');
    expect(split.creatorRate.toString()).toBe('70');
  });

  it('split always sums exactly to the paid basis (no rounding drift)', () => {
    const cases = [
      { gross: '1000', discount: '0', p: '10', a: '20' },
      { gross: '999.99', discount: '0', p: '10', a: '25' },
      { gross: '3333.33', discount: '33.33', p: '10', a: '35' },
      { gross: '0.01', discount: '0', p: '10', a: '50' },
      { gross: '75000', discount: '15000', p: '10', a: '40' },
    ];
    for (const c of cases) {
      const split = computeItemSplit({
        gross: new Prisma.Decimal(c.gross),
        discount: new Prisma.Decimal(c.discount),
        platformRate: new Prisma.Decimal(c.p),
        affiliateRate: new Prisma.Decimal(c.a),
      });
      const total = split.platformAmount
        .add(split.affiliateAmount)
        .add(split.creatorAmount);
      expect(total.toString()).toBe(split.paid.toString());
    }
  });

  it('affiliate rate clamps at the creator cap so the platform fee is never reduced', () => {
    const split = computeItemSplit({
      gross: new Prisma.Decimal(1000),
      discount: new Prisma.Decimal(0),
      platformRate: new Prisma.Decimal(10),
      affiliateRate: new Prisma.Decimal(95),
    });
    expect(split.platformAmount.toString()).toBe('100');
    expect(split.affiliateAmount.toString()).toBe('900');
    expect(split.creatorAmount.toString()).toBe('0');
  });

  it('discount shrinks the basis and every share proportionally', () => {
    const split = computeItemSplit({
      gross: new Prisma.Decimal(1000),
      discount: new Prisma.Decimal(100),
      platformRate: new Prisma.Decimal(10),
      affiliateRate: new Prisma.Decimal(20),
    });
    expect(split.paid.toString()).toBe('900');
    expect(split.platformAmount.toString()).toBe('90');
    expect(split.affiliateAmount.toString()).toBe('180');
    expect(split.creatorAmount.toString()).toBe('630');
  });

  it('a discount exceeding the line total clamps paid to zero', () => {
    const split = computeItemSplit({
      gross: new Prisma.Decimal(100),
      discount: new Prisma.Decimal(250),
      platformRate: new Prisma.Decimal(10),
      affiliateRate: new Prisma.Decimal(20),
    });
    expect(split.paid.toString()).toBe('0');
    expect(split.platformAmount.toString()).toBe('0');
    expect(split.creatorAmount.toString()).toBe('0');
  });
});

describe('allocateDiscount', () => {
  it('apportions pro-rata and folds the rounding remainder into the last item', () => {
    const shares = allocateDiscount(
      [
        { total: new Prisma.Decimal(300) },
        { total: new Prisma.Decimal(200) },
      ],
      new Prisma.Decimal(100),
    );
    expect(shares[0].toString()).toBe('60');
    expect(shares[1].toString()).toBe('40');
  });

  it('returns a zero share for every item when there is no discount', () => {
    const shares = allocateDiscount(
      [{ total: new Prisma.Decimal(10) }, { total: new Prisma.Decimal(20) }],
      new Prisma.Decimal(0),
    );
    expect(shares.every((s) => s.isZero())).toBe(true);
  });
});

describe('classifyAcquisition', () => {
  it('an explicit source wins over everything else', () => {
    expect(
      classifyAcquisition({
        attributed: true,
        utmCampaign: 'spring',
        explicit: 'MARKETPLACE_ORGANIC',
      }),
    ).toBe('MARKETPLACE_ORGANIC');
  });

  it('an attributed affiliate click is AFFILIATE', () => {
    expect(classifyAcquisition({ attributed: true })).toBe('AFFILIATE');
  });

  it('utm parameters mark a PLATFORM_CAMPAIGN', () => {
    expect(
      classifyAcquisition({ attributed: false, utmSource: 'newsletter' }),
    ).toBe('PLATFORM_CAMPAIGN');
    expect(
      classifyAcquisition({ attributed: false, utmCampaign: 'winter-sale' }),
    ).toBe('PLATFORM_CAMPAIGN');
  });

  it('otherwise the source is UNKNOWN', () => {
    expect(classifyAcquisition({ attributed: false })).toBe('UNKNOWN');
  });
});

describe('round2', () => {
  it('rounds half away from zero to two decimal places', () => {
    expect(round2(new Prisma.Decimal('1.005')).toString()).toBe('1.01');
    expect(round2(new Prisma.Decimal('1.004')).toString()).toBe('1');
  });
});
