import { Prisma } from '@creatorplus/database';
import { computeEarnings, lineCommission, toDecimal } from './money';

describe('money helpers', () => {
  describe('computeEarnings', () => {
    it('splits a single line item into gross / fee / net at a 10% rate', () => {
      const { gross, fee, net } = computeEarnings(
        [{ unitPrice: 1000, quantity: 1 }],
        10,
      );
      expect(gross.toString()).toBe('1000');
      expect(fee.toString()).toBe('100');
      expect(net.toString()).toBe('900');
    });

    it('sums multiple line items and quantities', () => {
      const { gross, fee, net } = computeEarnings(
        [
          { unitPrice: 1500, quantity: 2 }, // 3000
          { unitPrice: 500, quantity: 3 }, //  1500
        ],
        10,
      );
      expect(gross.toString()).toBe('4500');
      expect(fee.toString()).toBe('450');
      expect(net.toString()).toBe('4050');
    });

    it('does not accumulate binary-float error on repeating decimals', () => {
      // 33.33 * 3 = 99.99 exactly in Decimal; 9.999 fee; 89.991 -> 89.99 net.
      const { gross, fee, net } = computeEarnings(
        [{ unitPrice: '33.33', quantity: 3 }],
        10,
      );
      expect(gross.toString()).toBe('99.99');
      expect(fee.toString()).toBe('10'); // 9.999 rounded to 2dp = 10.00
      expect(net.toString()).toBe('89.99');
      // The classic float bug (0.1 + 0.2 !== 0.3) must not appear.
      expect(net.plus(fee).equals(gross)).toBe(true);
    });

    it('accepts a Decimal rate as well as a number', () => {
      const { net } = computeEarnings(
        [{ unitPrice: 2000, quantity: 1 }],
        new Prisma.Decimal('15'),
      );
      expect(net.toString()).toBe('1700');
    });

    it('handles an empty basket', () => {
      const { gross, fee, net } = computeEarnings([], 10);
      expect(gross.toString()).toBe('0');
      expect(fee.toString()).toBe('0');
      expect(net.toString()).toBe('0');
    });
  });

  describe('lineCommission', () => {
    it('computes per-line commission rounded to kobo', () => {
      expect(lineCommission(1999, 2, 10).toString()).toBe('399.8');
      expect(lineCommission('19.99', 1, 7.5).toString()).toBe('1.5');
    });
  });

  describe('toDecimal', () => {
    it('passes through an existing Decimal without re-wrapping', () => {
      const d = new Prisma.Decimal('12.34');
      expect(toDecimal(d)).toBe(d);
    });
  });
});
