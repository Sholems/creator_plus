'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const OFFERS = ['SINGLE', 'PACK', 'PRO_MONTHLY', 'PRO_YEARLY'] as const;

type QrCoupon = {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: string | number;
  appliesToOffers: string[];
  maxRedemptions: number | null;
  redeemedCount: number;
  isActive: boolean;
  expiresAt: string | null;
};

export default function AdminQrCouponsPage() {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState<QrCoupon[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    appliesToOffers: [] as string[],
    maxRedemptions: '',
    expiresAt: '',
  });

  async function load() {
    if (!token) return;
    try {
      setCoupons(await api.listQrCoupons(token));
    } catch (e: any) {
      setError(e.message || 'Failed to load coupons');
    }
  }

  useEffect(() => {
    if (token) void load();
  }, [token]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.createQrCoupon(token, {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        appliesToOffers: form.appliesToOffers.length ? form.appliesToOffers : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      setMessage(`Coupon ${form.code.toUpperCase()} created.`);
      setForm({ code: '', type: 'PERCENTAGE', value: '', appliesToOffers: [], maxRedemptions: '', expiresAt: '' });
      void load();
    } catch (e: any) {
      setError(e.message || 'Could not create coupon');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string, code: string) {
    if (!token) return;
    if (!window.confirm(`Deactivate coupon ${code}?`)) return;
    try {
      await api.deactivateQrCoupon(token, id);
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)));
    } catch (e: any) {
      setError(e.message || 'Could not deactivate');
    }
  }

  const toggleOffer = (o: string) =>
    setForm((f) => ({
      ...f,
      appliesToOffers: f.appliesToOffers.includes(o) ? f.appliesToOffers.filter((x) => x !== o) : [...f.appliesToOffers, o],
    }));

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">QR Studio coupons</h1>
        <Link href={'/qr-studio' as Route} className="text-sm font-medium text-emerald-700 hover:underline">← QR campaigns</Link>
      </div>

      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      <form onSubmit={create} className="mb-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-500">Code</label>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm uppercase" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed (₦)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">{form.type === 'PERCENTAGE' ? 'Percent off (1–100; 100 = free)' : 'Amount off (₦; ≥ price = free)'}</label>
          <input required type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Max redemptions (optional)</label>
          <input type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="Unlimited" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Expires (optional)</label>
          <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-500">Applies to plans (none = all)</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {OFFERS.map((o) => (
              <button type="button" key={o} onClick={() => toggleOffer(o)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${form.appliesToOffers.includes(o) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-600'}`}>{o}</button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? 'Creating…' : 'Create coupon'}</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-400"><th className="px-4 py-2">Code</th><th>Discount</th><th>Plans</th><th>Uses</th><th>Status</th><th></th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No coupons yet.</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2 font-mono font-semibold text-gray-800">{c.code}</td>
                <td className="text-gray-600">{c.type === 'PERCENTAGE' ? `${c.value}%` : `₦${c.value}`}</td>
                <td className="text-gray-500">{c.appliesToOffers.length ? c.appliesToOffers.join(', ') : 'All'}</td>
                <td className="text-gray-500">{c.redeemedCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}</td>
                <td>{c.isActive ? <span className="text-emerald-700">Active</span> : <span className="text-gray-400">Off</span>}</td>
                <td className="px-4 py-2 text-right">
                  {c.isActive && <button onClick={() => deactivate(c.id, c.code)} className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
