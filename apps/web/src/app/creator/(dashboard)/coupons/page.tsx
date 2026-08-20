'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import { AdinkraMark } from '@/components/brand/adinkra';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

function formatDiscount(coupon: Coupon) {
  return coupon.type === 'PERCENTAGE'
    ? `${coupon.value}% off`
    : `${formatNaira(coupon.value)} off`;
}

function couponState(coupon: Coupon): 'active' | 'upcoming' | 'expired' | 'inactive' {
  if (!coupon.isActive) return 'inactive';
  const now = Date.now();
  if (coupon.startDate && now < new Date(coupon.startDate).getTime()) return 'upcoming';
  if (coupon.endDate && now > new Date(coupon.endDate).getTime()) return 'expired';
  return 'active';
}

const STATE_META: Record<string, { label: string; classes: string }> = {
  active: { label: 'Active', classes: 'bg-forest-100 text-forest-700' },
  upcoming: { label: 'Scheduled', classes: 'bg-gold-100 text-gold-700' },
  expired: { label: 'Expired', classes: 'bg-ink-100 text-ink-500' },
  inactive: { label: 'Paused', classes: 'bg-cream-200 text-ink-500' },
};

export default function CreatorCouponsPage() {
  const { token } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minPurchase: '',
    maxUses: '',
    startDate: '',
    endDate: '',
  });

  const loadCoupons = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await api.getMyCoupons(token);
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [token]);

  const resetForm = () => {
    setForm({ code: '', type: 'PERCENTAGE', value: '', minPurchase: '', maxUses: '', startDate: '', endDate: '' });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setError('');
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value ?? ''),
      minPurchase: coupon.minPurchase != null ? String(coupon.minPurchase) : '',
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : '',
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : '',
      endDate: coupon.endDate ? coupon.endDate.slice(0, 10) : '',
    });
    setShowForm(true);
    setError('');
    setMessage(null);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setMessage(null);
    setError('');
    try {
      if (editingId) {
        // Code and type are immutable once created; update the rest.
        const payload: any = { value: Number(form.value) };
        payload.minPurchase = form.minPurchase ? Number(form.minPurchase) : undefined;
        payload.maxUses = form.maxUses ? Number(form.maxUses) : undefined;
        payload.startDate = form.startDate || undefined;
        payload.endDate = form.endDate || undefined;
        await api.updateCoupon(token, editingId, payload);
        setMessage({ ok: true, text: `Coupon ${form.code.toUpperCase()} updated.` });
      } else {
        const payload: any = {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: Number(form.value),
        };
        if (form.minPurchase) payload.minPurchase = Number(form.minPurchase);
        if (form.maxUses) payload.maxUses = Number(form.maxUses);
        if (form.startDate) payload.startDate = form.startDate;
        if (form.endDate) payload.endDate = form.endDate;
        await api.createCoupon(token, payload);
        setMessage({ ok: true, text: `Coupon ${payload.code} created.` });
      }
      closeForm();
      loadCoupons();
    } catch (err: any) {
      setError(err.message || (editingId ? 'Could not update coupon' : 'Could not create coupon'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    if (!token) return;
    try {
      await api.updateCoupon(token, coupon.id, { isActive: !coupon.isActive });
      loadCoupons();
    } catch (err: any) {
      setError(err.message || 'Could not update coupon');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!token) return;
    if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    try {
      await api.deleteCoupon(token, coupon.id);
      setMessage({ ok: true, text: `Coupon ${coupon.code} deleted.` });
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    } catch (err: any) {
      setError(err.message || 'Could not delete coupon');
    }
  };

  const inputCls =
    'block w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Promotions</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Coupons
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Reward buyers and drive sales with discount codes that apply to your products.
          </p>
        </div>
        <button
          onClick={() => (showForm ? closeForm() : openCreate())}
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-forest-700"
        >
          {showForm ? 'Cancel' : '+ New Coupon'}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>
      )}
      {message && (
        <div
          className={`mt-5 rounded-xl border p-4 text-sm ${
            message.ok ? 'border-forest-200 bg-forest-50 text-forest-800' : 'border-clay-200 bg-clay-50 text-clay-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="surface-card mt-6 grid gap-4 p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {editingId ? `Edit coupon ${form.code.toUpperCase()}` : 'New coupon'}
            </h2>
            {editingId && (
              <p className="mt-0.5 text-xs text-ink-500">
                The code and discount type can’t be changed after a coupon is created.
              </p>
            )}
          </div>

          <div className="sm:col-span-1">
            <label className="eyebrow text-ink-400">Code</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. LAUNCH15"
              disabled={!!editingId}
              className={`mt-1 ${inputCls} font-mono uppercase ${editingId ? 'cursor-not-allowed bg-cream-100 text-ink-500' : ''}`}
            />
          </div>

          <div className="sm:col-span-1">
            <label className="eyebrow text-ink-400">Discount type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              disabled={!!editingId}
              className={`mt-1 ${inputCls} ${editingId ? 'cursor-not-allowed bg-cream-100 text-ink-500' : ''}`}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed amount (₦)</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <label className="eyebrow text-ink-400">
              {form.type === 'PERCENTAGE' ? 'Discount %' : 'Discount (₦)'}
            </label>
            <input
              required
              type="number"
              min={0}
              max={form.type === 'PERCENTAGE' ? 100 : undefined}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 2000'}
              className={`mt-1 ${inputCls}`}
            />
          </div>

          <div className="sm:col-span-1">
            <label className="eyebrow text-ink-400">Minimum purchase (₦)</label>
            <input
              type="number"
              min={0}
              value={form.minPurchase}
              onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
              placeholder="Optional"
              className={`mt-1 ${inputCls}`}
            />
          </div>

          <div className="sm:col-span-1">
            <label className="eyebrow text-ink-400">Max uses</label>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="Optional"
              className={`mt-1 ${inputCls}`}
            />
          </div>

          <div className="sm:col-span-1 grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-ink-400">Starts</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label className="eyebrow text-ink-400">Ends</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-ink-100 px-5 py-2 text-sm font-medium text-ink-600 hover:bg-cream-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.code.trim() || !form.value}
              className="rounded-full bg-forest-800 px-6 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-50"
            >
              {submitting
                ? editingId ? 'Saving…' : 'Creating…'
                : editingId ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      )}

      <div className="surface-card mt-6">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-14 text-center">
              <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">No coupons yet</h3>
              <p className="mt-1 text-sm text-ink-500">
                Create your first discount code to reward buyers and boost sales.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {coupons.map((coupon) => {
                const state = couponState(coupon);
                const meta = STATE_META[state];
                const usage = coupon.maxUses ? `${coupon.usedCount}/${coupon.maxUses}` : String(coupon.usedCount);
                return (
                  <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-cream-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-ink-900">
                          {coupon.code}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.classes}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                        <span className="font-medium text-forest-700">{formatDiscount(coupon)}</span>
                        {coupon.minPurchase ? <span>Min. {formatNaira(coupon.minPurchase)}</span> : null}
                        <span>Used {usage}×</span>
                        {coupon.startDate && (
                          <span>
                            Starts{' '}
                            {new Date(coupon.startDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {coupon.endDate && (
                          <span>
                            Ends{' '}
                            {new Date(coupon.endDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="rounded-full border border-ink-100 px-4 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-cream-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(coupon)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                          coupon.isActive
                            ? 'border border-ink-100 text-ink-600 hover:bg-cream-100'
                            : 'bg-forest-800 text-cream-50 hover:bg-forest-700'
                        }`}
                      >
                        {coupon.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(coupon)}
                        className="rounded-full border border-clay-200 px-4 py-1.5 text-xs font-semibold text-clay-600 transition-colors hover:bg-clay-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
