'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Price = { id: string; provider: string; currency: string; interval: 'MONTHLY' | 'ANNUAL'; amount: number };
type Plan = { id: string; name: string; description?: string };

const SYMBOL: Record<string, string> = { NGN: '₦', USD: '$' };

const INCLUDED = [
  'Full Growth Club classroom access',
  'Member-only discussions and Q&A',
  'Downloadable resources attached to lessons',
  'New CreatorPlus content as it is published',
  'Progress tracking, levels, and leaderboard',
  'Cancel anytime from your account',
];

const BEST_FOR = [
  { title: 'Creators', text: 'Package your ideas, grow your audience, and sell with more clarity.' },
  { title: 'Digital sellers', text: 'Improve offers, content, product positioning, and customer education.' },
  { title: 'Builders', text: 'Use the room for questions, feedback, and practical execution support.' },
];

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
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:py-14">
      <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_430px] lg:items-start">
        <div className="rounded-[2rem] border border-ink-100 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <Link href="/community" className="text-sm font-semibold text-forest-700 hover:text-forest-600">← Back to Growth Club</Link>
          <div className="mt-8 max-w-3xl">
            <p className="eyebrow text-gold-600">Bold Ideas Growth Club</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[0.98] tracking-tight text-ink-900 sm:text-6xl">
              Pick the plan. Start learning today.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-600">
              {plan?.description || 'One paid membership unlocks CreatorPlus courses, practical growth content, member discussions, and Q&A support.'}
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {BEST_FOR.map((item) => (
              <div key={item.title} className="rounded-2xl border border-ink-100 bg-cream-50 p-4">
                <h2 className="font-display text-lg font-semibold text-ink-900">{item.title}</h2>
                <p className="mt-2 text-xs leading-5 text-ink-600">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-forest-900 p-5 text-cream-50">
            <p className="eyebrow text-gold-300">Included in every paid plan</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {INCLUDED.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-2xl bg-white/[0.08] p-3 text-sm leading-6 text-cream-100">
                  <span className="text-gold-300">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-ink-100 bg-cream-50 p-5">
              <p className="text-sm font-semibold text-ink-900">What happens after payment?</p>
              <p className="mt-2 text-sm leading-6 text-ink-600">You return to the Growth Club automatically with access to the classroom, discussion room, resources, and member dashboard.</p>
            </div>
            <div className="rounded-3xl border border-ink-100 bg-cream-50 p-5">
              <p className="text-sm font-semibold text-ink-900">Can I cancel?</p>
              <p className="mt-2 text-sm leading-6 text-ink-600">Yes. If you cancel, your access remains until the end of the paid billing period.</p>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-forest-200 bg-white p-5 shadow-xl shadow-forest-900/10 sm:p-6">
          {alreadyMember ? (
            <div className="rounded-3xl border border-forest-200 bg-forest-50 p-7 text-center">
              <p className="text-lg font-semibold text-ink-900">You're already a member 🎉</p>
              <p className="mt-2 text-sm leading-6 text-ink-600">Jump back into the classroom and discussion room.</p>
              <Link href="/community" className="mt-5 inline-flex rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700">
                Enter the Growth Club
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-cream-50 p-4">
                <p className="text-sm font-semibold text-ink-900">{plan?.name || 'Growth Club Membership'}</p>
                <p className="mt-1 text-xs text-ink-500">Choose currency and billing interval.</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {(['NGN', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${currency === c ? 'bg-forest-800 text-cream-50' : 'border border-ink-200 bg-white text-ink-600 hover:bg-cream-100'}`}
                    >
                      {SYMBOL[c]} {c}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['MONTHLY', 'ANNUAL'] as const).map((i) => (
                    <button
                      key={i}
                      onClick={() => setInterval(i)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${interval === i ? 'bg-gold-500 text-ink-900' : 'border border-ink-200 bg-white text-ink-600 hover:bg-cream-100'}`}
                    >
                      {i === 'MONTHLY' ? 'Monthly' : 'Annual'}
                      {i === 'ANNUAL' && savingsPct > 0 ? ` · save ${savingsPct}%` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-center">
                {price ? (
                  <p className="font-display text-6xl font-bold tracking-tight text-ink-900">
                    {formatPrice(price.currency, price.amount)}
                    <span className="block text-base font-medium text-ink-500">per {interval === 'MONTHLY' ? 'month' : 'year'}</span>
                  </p>
                ) : (
                  <p className="text-sm text-ink-500">Select an option…</p>
                )}
              </div>

              <button
                onClick={subscribe}
                disabled={busy || !price}
                className="mt-6 w-full rounded-full bg-forest-800 px-6 py-4 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700 disabled:opacity-50"
              >
                {busy ? 'Starting checkout…' : isAuthenticated ? 'Subscribe to Growth Club' : 'Sign in to subscribe'}
              </button>
              {error && <p className="mt-3 text-center text-sm text-clay-600">{error}</p>}
              <p className="mt-4 text-center text-xs leading-5 text-ink-400">
                Secured by {currency === 'NGN' ? 'Paystack' : 'Stripe'}. Renews each {interval === 'MONTHLY' ? 'month' : 'year'} until cancelled.
              </p>

              <div className="mt-6 rounded-2xl border border-gold-200 bg-gold-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">No free version</p>
                <p className="mt-1 text-sm leading-6 text-ink-700">Every member is paid, so the room stays focused and valuable.</p>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
