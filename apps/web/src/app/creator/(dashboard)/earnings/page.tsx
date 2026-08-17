'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { CreatorEmptyState } from '@/components/market/creator-empty-state';

const MIN_PAYOUT = 10000;

export default function CreatorEarningsPage() {
  const { token } = useAuth();
  const [earnings, setEarnings] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [method, setMethod] = useState('Bank Transfer (NGN)');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [savingBank, setSavingBank] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bankMessage, setBankMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (token) loadEarnings();
  }, [token]);

  const loadEarnings = async () => {
    if (!token) return;
    try {
      const [earningsData, payoutsData, bankAccountsData] = await Promise.all([
        api.getCreatorEarnings(token).catch(() => null),
        api.getMyPayouts(token).catch(() => null),
        api.getMyBankAccounts(token).catch(() => []),
      ]);
      if (!earningsData) {
        setNoProfile(true);
      } else {
        setEarnings(earningsData);
      }
      if (payoutsData) {
        setPayouts(payoutsData.data || []);
      }
      setBankAccounts(bankAccountsData || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingBank(true);
    setBankMessage(null);
    try {
      await api.createBankAccount(token, bankForm);
      setBankMessage({ ok: true, text: 'Payout bank account saved.' });
      setBankForm({ bankName: '', accountNumber: '', accountName: '' });
      setBankAccounts(await api.getMyBankAccounts(token));
    } catch (err: any) {
      setBankMessage({ ok: false, text: err.message || 'Could not save bank account' });
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Remove this payout account?')) return;
    setDeletingId(id);
    setBankMessage(null);
    try {
      await api.deleteBankAccount(token, id);
      setBankAccounts(await api.getMyBankAccounts(token));
    } catch (err: any) {
      setBankMessage({ ok: false, text: err.message || 'Could not remove bank account' });
    } finally {
      setDeletingId(null);
    }
  };

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!notes.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await api.requestPayout(token, { method, notes: notes.trim() });
      setMessage({ ok: true, text: 'Payout request submitted. Our team will review and process it.' });
      setShowModal(false);
      setNotes('');
      await loadEarnings();
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || 'Failed to request payout' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalEarnings = earnings?.totalEarnings || 0;
  const platformFee = earnings?.platformFee || 0;
  const netEarnings = earnings?.netEarnings || totalEarnings - platformFee;
  const pendingPayout = earnings?.pendingPayout || 0;
  const completedPayout = earnings?.completedPayout || 0;
  const availableForPayout = earnings?.availableForPayout || 0;
  const canPayout = availableForPayout >= MIN_PAYOUT;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="eyebrow text-gold-600">Creator studio</p>
        <h1 className="font-display text-2xl font-bold text-ink-900">Earnings</h1>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div>
        <p className="eyebrow text-gold-600">Creator studio</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">Earnings</h1>
        <CreatorEmptyState />
      </div>
    );
  }

  return (
    <div>
      <div>
        <p className="eyebrow text-gold-600">Creator studio</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900">Earnings</h1>
      </div>

      {message && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.ok ? 'border border-forest-200 bg-forest-50 text-forest-800' : 'border border-clay-200 bg-clay-50 text-clay-700'}`}>
          {message.text}
        </div>
      )}

      {/* Earnings pipeline */}
      <div className="mt-6 surface-card p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900">Earnings pipeline</h2>
        <p className="mt-1 text-sm text-ink-500">How your revenue flows from sales to your bank account</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Gross revenue */}
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <p className="text-xs text-ink-400">Gross revenue</p>
            <p className="mt-1 font-display text-xl font-bold text-ink-900">{formatNaira(totalEarnings)}</p>
            <p className="mt-1 text-[0.6875rem] text-ink-400">All sales before fees</p>
          </div>

          {/* Platform fee */}
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <p className="text-xs text-ink-400">Platform fee (10%)</p>
            <p className="mt-1 font-display text-xl font-bold text-clay-600">−{formatNaira(platformFee)}</p>
            <p className="mt-1 text-[0.6875rem] text-ink-400">CreatorPlus commission</p>
          </div>

          {/* Net earnings */}
          <div className="rounded-xl border border-forest-200 bg-forest-50 p-4">
            <p className="text-xs text-forest-600">Net earnings</p>
            <p className="mt-1 font-display text-xl font-bold text-forest-800">{formatNaira(netEarnings)}</p>
            <p className="mt-1 text-[0.6875rem] text-forest-600">What you&apos;ve earned</p>
          </div>

          {/* Pending payout */}
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <p className="text-xs text-ink-400">In holding (14 days)</p>
            <p className="mt-1 font-display text-xl font-bold text-amber-600">{formatNaira(pendingPayout)}</p>
            <p className="mt-1 text-[0.6875rem] text-ink-400">Awaiting clearing</p>
          </div>

          {/* Available */}
          <div className="rounded-xl border border-forest-200 bg-forest-50 p-4">
            <p className="text-xs text-forest-600">Available for payout</p>
            <p className="mt-1 font-display text-xl font-bold text-forest-800">{formatNaira(availableForPayout)}</p>
            <p className="mt-1 text-[0.6875rem] text-forest-600">Ready to withdraw</p>
          </div>
        </div>

        {/* Visual pipeline bar */}
        {totalEarnings > 0 && (
          <div className="mt-6">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-cream-100">
              {completedPayout > 0 && (
                <div
                  className="h-full bg-forest-500 transition-all duration-500"
                  style={{ width: `${(completedPayout / totalEarnings) * 100}%` }}
                  title={`Paid out: ${formatNaira(completedPayout)}`}
                />
              )}
              {availableForPayout > 0 && (
                <div
                  className="h-full bg-forest-300 transition-all duration-500"
                  style={{ width: `${(availableForPayout / totalEarnings) * 100}%` }}
                  title={`Available: ${formatNaira(availableForPayout)}`}
                />
              )}
              {pendingPayout > 0 && (
                <div
                  className="h-full bg-amber-300 transition-all duration-500"
                  style={{ width: `${(pendingPayout / totalEarnings) * 100}%` }}
                  title={`In holding: ${formatNaira(pendingPayout)}`}
                />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-forest-500" /> Paid out
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-forest-300" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> In holding
              </span>
            </div>
          </div>
        )}

        {/* Payout CTA */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => {
              const def = bankAccounts.find((b) => b.isDefault) || bankAccounts[0];
              if (def) {
                setNotes(`${def.bankName} · ${def.accountName} · ${def.accountNumber}`);
                setMethod('Bank Transfer (NGN)');
              } else {
                setNotes('');
              }
              setShowModal(true);
            }}
            disabled={!canPayout || bankAccounts.length === 0}
            className="rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bankAccounts.length === 0
              ? 'Add a payout account first'
              : canPayout
                ? `Request payout of ${formatNaira(availableForPayout)}`
                : `Min. ${formatNaira(MIN_PAYOUT)} to request`}
          </button>
          <p className="text-xs text-ink-400">
            Payouts are reviewed within 48 hours and paid monthly
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payout History */}
        <div className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Payout history</h2>
          {payouts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-ink-200 p-8 text-center">
              <p className="text-sm text-ink-500">No payout requests yet.</p>
              <p className="mt-1 text-xs text-ink-400">When you request a payout, it will appear here.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-ink-100">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{formatNaira(p.amount)}</p>
                    <p className="text-xs text-ink-500">
                      {p.method || 'Payout'} · {new Date(p.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.status === 'COMPLETED' ? 'bg-forest-100 text-forest-700'
                    : p.status === 'REJECTED' || p.status === 'FAILED' ? 'bg-clay-100 text-clay-700'
                    : p.status === 'APPROVED' || p.status === 'PROCESSING' ? 'bg-forest-50 text-forest-600'
                    : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout Account */}
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Payout account</h2>
            {bankAccounts.length > 0 && (
              <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-700">
                {bankAccounts.length} saved
              </span>
            )}
          </div>

          {bankMessage && (
            <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${bankMessage.ok ? 'border border-forest-200 bg-forest-50 text-forest-800' : 'border border-clay-200 bg-clay-50 text-clay-700'}`}>
              {bankMessage.text}
            </div>
          )}

          {bankAccounts.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              Add a bank account to receive payouts. Payouts are disabled until you save one.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bankAccounts.map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-900">{acc.accountName}</p>
                      {acc.isDefault && (
                        <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[0.625rem] font-bold text-forest-700">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-500">
                      {acc.bankName} · {acc.accountNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBank(acc.id)}
                    disabled={deletingId === acc.id}
                    className="shrink-0 rounded-lg border border-clay-200 px-3 py-1.5 text-xs font-medium text-clay-600 hover:bg-clay-50 disabled:opacity-50"
                  >
                    {deletingId === acc.id ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddBank} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink-700">Bank name</label>
              <input
                required
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="e.g. Access Bank"
                className="mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Account number</label>
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={bankForm.accountNumber}
                onChange={(e) =>
                  setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
                placeholder="10-digit account number"
                className="mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Account name</label>
              <input
                required
                value={bankForm.accountName}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                placeholder="Name on the account"
                className="mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingBank}
              className="w-full rounded-full bg-forest-800 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-50"
            >
              {savingBank ? 'Saving…' : bankAccounts.length === 0 ? 'Save payout account' : 'Add another account'}
            </button>
          </form>
        </div>
      </div>

      {/* Payout Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-semibold text-ink-900">Request a payout</h2>
            <p className="mt-1 text-sm text-ink-500">
              Available balance: <span className="font-semibold text-forest-800">{formatNaira(availableForPayout)}</span>
            </p>
            <form onSubmit={submitPayout} className="mt-4 space-y-4">
              <div>
                <label htmlFor="payout-method" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Payout method
                </label>
                <select
                  id="payout-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                >
                  <option>Paystack (Bank account)</option>
                  <option>Flutterwave (Bank account)</option>
                  <option>Bank Transfer (NGN)</option>
                </select>
              </div>
              <div>
                <label htmlFor="payout-notes" className="mb-1.5 block text-sm font-medium text-ink-700">
                  Account details
                </label>
                <textarea
                  id="payout-notes"
                  required
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bank name, account name and account number…"
                  className="block w-full rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full border border-ink-100 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !notes.trim()}
                  className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Request payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
