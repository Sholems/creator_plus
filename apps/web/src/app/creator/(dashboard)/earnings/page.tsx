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
    if (token) {
      loadEarnings();
    }
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

  const canPayout = (earnings?.availableForPayout || 0) >= MIN_PAYOUT;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings</h1>
        <CreatorEmptyState />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings</h1>

      {message && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Earnings</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatNaira(earnings?.totalEarnings || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Platform Fee (10%)</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">
            -{formatNaira(earnings?.platformFee || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Net Earnings</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {formatNaira(earnings?.netEarnings || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Available for Payout</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {formatNaira(earnings?.availableForPayout || 0)}
          </p>
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
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bankAccounts.length === 0
              ? 'Add a payout account first'
              : canPayout
                ? 'Request Payout'
                : `Min. ${formatNaira(MIN_PAYOUT)}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-500">No payout requests yet.</p>
          ) : (
            <div className="space-y-4">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatNaira(p.amount)}</p>
                    <p className="text-xs text-gray-500">
                      {p.method || 'Payout'} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.status === 'COMPLETED' ? 'bg-green-100 text-green-800'
                    : p.status === 'REJECTED' || p.status === 'FAILED' ? 'bg-red-100 text-red-800'
                    : p.status === 'APPROVED' || p.status === 'PROCESSING' ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Payout Account</h2>
            {bankAccounts.length > 0 && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {bankAccounts.length} saved
              </span>
            )}
          </div>

          {bankMessage && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${bankMessage.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {bankMessage.text}
            </div>
          )}

          {bankAccounts.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Add a bank account to receive payouts. Payouts are disabled until you save one.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bankAccounts.map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{acc.accountName}</p>
                      {acc.isDefault && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {acc.bankName} · {acc.accountNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBank(acc.id)}
                    disabled={deletingId === acc.id}
                    className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === acc.id ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddBank} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bank name</label>
              <input
                required
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="e.g. Access Bank"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account number</label>
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account name</label>
              <input
                required
                value={bankForm.accountName}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                placeholder="Name on the account"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={savingBank}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingBank ? 'Saving…' : bankAccounts.length === 0 ? 'Save payout account' : 'Add another account'}
            </button>
          </form>

          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payout Schedule</label>
              <p className="mt-1 text-sm text-gray-600">Requests reviewed within 48 hours, paid monthly</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Holding Period</label>
              <p className="mt-1 text-sm text-gray-600">14-day holding period applies to new sales</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">Request a payout</h2>
            <p className="mt-1 text-sm text-gray-500">
              Available balance: <span className="font-semibold text-gray-900">{formatNaira(earnings?.availableForPayout || 0)}</span>
            </p>
            <form onSubmit={submitPayout} className="mt-4 space-y-4">
              <div>
                <label htmlFor="payout-method" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payout Method
                </label>
                <select
                  id="payout-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option>Paystack (Bank account)</option>
                  <option>Flutterwave (Bank account)</option>
                  <option>Bank Transfer (NGN)</option>
                </select>
              </div>
              <div>
                <label htmlFor="payout-notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Account details
                </label>
                <textarea
                  id="payout-notes"
                  required
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bank name, account name and account number (or payment email for Flutterwave)…"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !notes.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
