import { Prisma } from '@creatormarket/database';

/**
 * Money helpers. All marketplace money arithmetic goes through Prisma.Decimal
 * so we never accumulate binary-float rounding error (H4). Convert to a JS
 * number only at the API boundary, never mid-calculation.
 */

export type DecimalInput = Prisma.Decimal | number | string;

export const toDecimal = (v: DecimalInput): Prisma.Decimal =>
  v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);

export interface EarningsLine {
  unitPrice: DecimalInput;
  quantity: number;
}

export interface Earnings {
  gross: Prisma.Decimal;
  fee: Prisma.Decimal;
  net: Prisma.Decimal;
}

/**
 * Given a set of line items and the platform commission rate (as a percentage,
 * e.g. 10 for 10%), compute the gross sale value, the platform fee, and the net
 * amount the creator earns. Fee and net are rounded to 2 decimal places (kobo).
 */
export function computeEarnings(
  lineItems: EarningsLine[],
  commissionRatePercent: DecimalInput,
): Earnings {
  const rate = toDecimal(commissionRatePercent);
  const gross = lineItems.reduce(
    (sum, li) => sum.add(toDecimal(li.unitPrice).mul(li.quantity)),
    new Prisma.Decimal(0),
  );
  const fee = gross.mul(rate).div(100).toDecimalPlaces(2);
  const net = gross.sub(fee).toDecimalPlaces(2);
  return { gross, fee, net };
}

/** Commission owed to the platform for a single line item, rounded to kobo. */
export function lineCommission(
  unitPrice: DecimalInput,
  quantity: number,
  commissionRatePercent: DecimalInput,
): Prisma.Decimal {
  return toDecimal(unitPrice)
    .mul(quantity)
    .mul(toDecimal(commissionRatePercent))
    .div(100)
    .toDecimalPlaces(2);
}
