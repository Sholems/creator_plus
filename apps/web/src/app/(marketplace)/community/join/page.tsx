'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Price = { id: string; provider: string; currency: string; interval: 'MONTHLY' | 'ANNUAL'; amount: number };
type Plan = { id: string; name: string; description?: string };

const SYMBOL: Record<string, string> = { NGN: '₦', USD: '$' };

function guessCurrency(): 'NGN' | 'USD' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/Africa\//.test(tz)) return 'NGN';
  } catch { /* ignore */ }
  return 'USD';
}

function formatPrice(currency: string, amount: number): string {
  return `${SYMBOL[currency] ?? currency + ' '}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function CommunityJoinPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('USD');
  const [interval, setInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCurrency(guessCurrency());
    api.getMembershipPlans()
      .then((res) => { setPlan(res.plan); setPrices(res.prices ?? []); })
      .catch(() => setError('Could not load Growth Club plans.'));
  }, []);

  useEffect(() => {
    if (!token) return;
    api.getMyMembership(token).then((m) => setAlreadyMember(!!m.active)).catch(() => {});
  }, [token]);

  const price = useMemo(
    () => prices.find((p) => p.currency === currency && p.interval === interval),
    [prices, currency, interval],
  );

  const monthlyOf = (cur: string) => prices.find((p) => p.currency === cur && p.interval === 'MONTHLY');
  const annualOf = (cur: string) => prices.find((p) => p.currency === cur && p.interval === 'ANNUAL');
  const savingsPct = useMemo(() => {
    const m = monthlyOf(currency)?.amount;
    const a = annualOf(currency)?.amount;
    if (!m || !a) return 0;
    return Math.round((1 - a / (m * 12)) * 100);
  }, [prices, currency]);

  async function subscribe() {
    if (!price) return;
    if (!isAuthenticated || !token) {
      router.push('/auth/login?redirect=/community/join');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const origin = window.location.origin;
      const res = await api.startMembershipCheckout(token, price.id, `${origin}/community?welcome=1`, `${origin}/community/join`);
      window.location.href = res.redirectUrl;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-12">
      <section className="mx-auto w-full max-w-lg">
        <div className="text-center">
          <p className="eyebrow text-gold-600">Bold Ideas Growth Club</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-900">{plan?.name || 'Join the Growth Club'}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-600">
            {plan?.description || 'One paid membership unlocks CreatorPlus courses, practical growth content, member discussions, and Q&A support.'}
          </p>
        </div>

        {alreadyMember ? (
          <div className="mt-8 rounded-3xl border border-forest-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-ink-900">You're already a member 🎉</p>
            <Link href="/community" className="mt-4 inline-block rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700">
              Enter the Growth Club
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
            {/* Currency toggle (auto-detected by region) */}
            <div className="flex items-center justify-center gap-2">
              {(['NGN', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${currency === c ? 'bg-forest-800 text-cream-50' : 'border border-ink-200 text-ink-600 hover:bg-cream-100'}`}
                >
                  Pay in {SYMBOL[c]} {c}
                </button>
              ))}
            </div>

            {/* Interval toggle */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {(['MONTHLY', 'ANNUAL'] as const).map((i) => (
                <button
                  key={i}
                  onClick={() => setInterval(i)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${interval === i ? 'bg-gold-500 text-ink-900' : 'border border-ink-200 text-ink-600 hover:bg-cream-100'}`}
                >
                  {i === 'MONTHLY' ? 'Monthly' : 'Annual'}
                  {i === 'ANNUAL' && savingsPct > 0 ? ` · save ${savingsPct}%` : ''}
                </button>
              ))}
            </div>

            <div className="mt-6 text-center">
              {price ? (
                <p className="font-display text-5xl font-bold text-ink-900">
                  {formatPrice(price.currency, price.amount)}
                  <span className="text-base font-medium text-ink-500">/{interval === 'MONTHLY' ? 'mo' : 'yr'}</span>
                </p>
              ) : (
                <p className="text-sm text-ink-500">Select an option…</p>
              )}
            </div>

            <ul className="mx-auto mt-6 max-w-xs space-y-2 text-sm text-ink-700">
              {['CreatorPlus courses and lessons', 'Member discussion and Q&A', 'Exclusive resources and sessions', 'Cancel anytime'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-forest-600">✓</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={subscribe}
              disabled={busy || !price}
              className="mt-6 w-full rounded-full bg-forest-800 px-6 py-3.5 text-sm font-semibold text-cream-50 transition hover:bg-forest-700 disabled:opacity-50"
            >
              {busy ? 'Starting checkout…' : isAuthenticated ? 'Subscribe to Growth Club' : 'Sign in to subscribe'}
            </button>
            {error && <p className="mt-3 text-center text-sm text-clay-600">{error}</p>}
            <p className="mt-3 text-center text-xs text-ink-400">
              Secured by {currency === 'NGN' ? 'Paystack' : 'Stripe'}. Renews each {interval === 'MONTHLY' ? 'month' : 'year'} until cancelled.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
