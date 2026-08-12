// Nigeria-first: display all money in Naira (₦).
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

export function formatCompact(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en', {
    notation: num >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(value: number | string | null | undefined, digits = 0): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0%';
  return `${num.toFixed(digits)}%`;
}

export function formatDate(
  value: string | Date | null | undefined,
  options?: { short?: boolean; time?: boolean },
): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  if (options?.time) {
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('en-GB', options?.short
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
