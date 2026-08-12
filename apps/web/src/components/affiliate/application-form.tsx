'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export interface AffiliateApplicationValues {
  applicationMessage?: string;
  websiteUrl?: string;
  promotionChannels?: string;
  socialMediaLinks?: string;
  country?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  code?: string;
}

export function AffiliateApplicationForm({
  token,
  mode = 'apply',
  initialValues,
  onSuccess,
  ctaLabel,
}: {
  token: string;
  mode?: 'apply' | 'update';
  initialValues?: Partial<AffiliateApplicationValues>;
  onSuccess: () => void;
  ctaLabel?: string;
}) {
  const [form, setForm] = useState<AffiliateApplicationValues>({
    applicationMessage: initialValues?.applicationMessage ?? '',
    websiteUrl: initialValues?.websiteUrl ?? '',
    promotionChannels: initialValues?.promotionChannels ?? '',
    socialMediaLinks: initialValues?.socialMediaLinks ?? '',
    country: initialValues?.country ?? '',
    paymentMethod: initialValues?.paymentMethod ?? 'Bank Transfer',
    paymentDetails: initialValues?.paymentDetails ?? '',
    code: initialValues?.code ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<AffiliateApplicationValues>) => setForm((f) => ({ ...f, ...patch }));

  const splitList = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const payload = {
      applicationMessage: form.applicationMessage?.trim() || undefined,
      websiteUrl: form.websiteUrl?.trim() || undefined,
      promotionChannels: splitList(form.promotionChannels || ''),
      socialMediaLinks: splitList(form.socialMediaLinks || ''),
      country: form.country?.trim() || undefined,
      paymentMethod: form.paymentMethod?.trim() || undefined,
      paymentDetails: form.paymentDetails?.trim() || undefined,
      code: form.code?.trim() || undefined,
    };
    try {
      if (mode === 'update') {
        await api.updateAffiliateMe(token, payload);
      } else {
        await api.applyAffiliate(token, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'block w-full rounded-xl border border-ink-200 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20';

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-clay-50 px-4 py-2.5 text-sm text-clay-700">{error}</p>
      )}

      <div>
        <label htmlFor="aff-app-msg" className="mb-1.5 block text-sm font-medium text-ink-800">
          Application message (optional)
        </label>
        <textarea
          id="aff-app-msg"
          rows={3}
          value={form.applicationMessage}
          onChange={(e) => set({ applicationMessage: e.target.value })}
          placeholder="Tell us how you plan to promote products…"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aff-app-web" className="mb-1.5 block text-sm font-medium text-ink-800">
            Website / blog URL
          </label>
          <input
            id="aff-app-web"
            type="url"
            value={form.websiteUrl}
            onChange={(e) => set({ websiteUrl: e.target.value })}
            placeholder="https://…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="aff-app-country" className="mb-1.5 block text-sm font-medium text-ink-800">
            Country
          </label>
          <input
            id="aff-app-country"
            value={form.country}
            onChange={(e) => set({ country: e.target.value })}
            placeholder="Nigeria"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aff-app-channels" className="mb-1.5 block text-sm font-medium text-ink-800">
            Promotion channels
          </label>
          <input
            id="aff-app-channels"
            value={form.promotionChannels}
            onChange={(e) => set({ promotionChannels: e.target.value })}
            placeholder="Instagram, YouTube, Blog (comma separated)"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="aff-app-social" className="mb-1.5 block text-sm font-medium text-ink-800">
            Social media links
          </label>
          <input
            id="aff-app-social"
            value={form.socialMediaLinks}
            onChange={(e) => set({ socialMediaLinks: e.target.value })}
            placeholder="https://instagram.com/…, https://tiktok.com/…"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aff-app-paymethod" className="mb-1.5 block text-sm font-medium text-ink-800">
            Payout method
          </label>
          <select
            id="aff-app-paymethod"
            value={form.paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value })}
            className={inputClass}
          >
            <option>Bank Transfer</option>
            <option>PayPal</option>
            <option>Payoneer</option>
            <option>Flutterwave</option>
          </select>
        </div>
        <div>
          <label htmlFor="aff-app-paydetails" className="mb-1.5 block text-sm font-medium text-ink-800">
            Payout details
          </label>
          <input
            id="aff-app-paydetails"
            value={form.paymentDetails}
            onChange={(e) => set({ paymentDetails: e.target.value })}
            placeholder="Account number / bank / email"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="aff-app-code" className="mb-1.5 block text-sm font-medium text-ink-800">
          Referral code (optional)
        </label>
        <input
          id="aff-app-code"
          value={form.code}
          onChange={(e) => set({ code: e.target.value })}
          placeholder="3–30 lowercase letters, numbers or hyphens"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink-400">
          You&apos;ll get a short, shareable code appended to every link you generate.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-700 disabled:opacity-50 sm:w-auto"
      >
        {submitting
          ? mode === 'update'
            ? 'Saving…'
            : 'Submitting…'
          : (ctaLabel ?? (mode === 'update' ? 'Save changes' : 'Submit application'))}
      </button>
    </form>
  );
}
