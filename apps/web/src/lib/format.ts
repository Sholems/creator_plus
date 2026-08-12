// Currency & number formatting helpers.
// CreatorPlus is Nigeria-first, so prices are displayed in Naira (₦).

/**
 * Format an amount as Nigerian Naira, e.g. 15000 -> "₦15,000".
 * Accepts numbers or numeric strings (Prisma Decimals may arrive as strings)
 * and defaults to 0 decimal places, which suits NGN-scale pricing.
 */
export function formatNaira(
  amount: number | string | null | undefined,
  options?: { decimals?: number },
): string {
  const parsed = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  const value = Number.isFinite(parsed as number) ? (parsed as number) : 0;
  const decimals = options?.decimals ?? 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
