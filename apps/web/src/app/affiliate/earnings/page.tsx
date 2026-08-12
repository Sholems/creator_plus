'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatNaira } from '@/lib/format';

interface DashboardData {
  totals: {
    totalEarnings: number;
    byStatus: Record<string, { count: number; amount: number }>;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PAYABLE: 'Payable',
  PAID: 'Paid',
  REVERSED: 'Reversed',
};

export default function AffiliateEarningsPage() {
  const { token } = useAuth();
  const [totals, setTotals] = useState<DashboardData['totals'] | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [minPayout, setMinPayout] = useState(1000);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [dash, payoutData] = await Promise.all([
        api.getAffiliateDashboard(token),
        api.getAffiliatePayouts(token),
      ]);
      setTotals(dash.totals);
      setPayouts(payoutData ?? []);
      const marketplace = await api.getAffiliateMarketplace({ perPage: 1 }).catch(() => null);
      if (marketplace) setMinPayout(marketplace.settings.minPayout);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to load earnings' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const payable =
    (totals?.byStatus?.APPROVED?.amount ?? 0) +
    (totals?.byStatus?.PAYABLE?.amount ?? 0) +
    (totals?.byStatus?.PAID?.amount ?? 0);
  const pending = totals?.byStatus?.PENDING?.amount ?? 0;

  const requestPayout = async () => {
    if (!token || requesting) return;
    setRequesting(true);
    setMessage(null);
    try {
      const payout = await api.requestAffiliatePayout(token, {});
      setPayouts((prev) => [payout, ...prev]);
      setMessage({
        ok: true,
        text: `Payout of ${formatNaira(payout.amount)} requested — pending approval.`,
      });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Failed to request payout' });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-cream-100" />
      </div>
    );
  }

  const balances = [
    { label: 'Available to withdraw', value: formatNaira(payable), highlight: true },
    { label: 'Pending (holding period)', value: formatNaira(pending) },
    { label: 'Total earnings', value: formatNaira(totals?.totalEarnings ?? 0) },
  ];

  return (
    <div>
      <p className="eyebrow text-gold-600">Earnings</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
        Your earnings
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {balances.map((b) => (
          <div
            key={b.label}
            className={
              b.highlight
                ? 'rounded-2xl bg-forest-800 p-6 text-cream-50'
                : 'rounded-2xl border border-ink-100 bg-white p-6'
            }
          >
            <p className={b.highlight ? 'eyebrow text-gold-300' : 'eyebrow text-ink-400'}>
              {b.label}
            </p>
            <p
              className={
                b.highlight
                  ? 'mt-2 font-display text-3xl font-bold text-white'
                  : 'mt-2 font-display text-3xl font-bold text-ink-900'
              }
            >
              {b.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Withdraw earnings</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-500">
          Request a payout of your available balance (minimum {formatNaira(minPayout)}). Payouts
          are reviewed by our team and paid to your selected method.
        </p>
        {message && (
          <p
            className={
              message.ok
                ? 'mt-3 rounded-xl bg-forest-50 px-4 py-2.5 text-sm text-forest-800'
                : 'mt-3 rounded-xl bg-clay-50 px-4 py-2.5 text-sm text-clay-700'
            }
          >
            {message.text}
          </p>
        )}
        <button
          onClick={requestPayout}
          disabled={requesting || payable <= 0}
          className="mt-4 rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {requesting
            ? 'Requesting…'
            : payable <= 0
              ? 'Nothing to withdraw yet'
              : `Request payout (${formatNaira(payable)})`}
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <h2 className="px-6 pt-6 font-display text-lg font-semibold text-ink-900">
          Payout history
        </h2>
        {payouts.length === 0 ? (
          <p className="p-6 text-sm text-ink-400">
            No payouts yet. Your requested payouts will appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-cream-50 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-6 py-3 font-medium">Requested</th>
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-6 py-3 text-right font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-ink-50">
                    <td className="px-6 py-3 text-ink-700">
                      {new Date(p.requestedAt).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3 text-ink-700">{p.method ?? 'Bank Transfer'}</td>
                    <td className="px-6 py-3 text-right font-semibold text-ink-900">
                      {formatNaira(p.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totals && Object.keys(totals.byStatus ?? {}).length > 0 && (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Breakdown by status</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(totals.byStatus ?? {}).map(([status, row]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-ink-500">
                  {STATUS_LABELS[status] ?? status}
                  <span className="ml-2 text-ink-400">({row.count})</span>
                </span>
                <span className="font-medium text-ink-900">{formatNaira(row.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
