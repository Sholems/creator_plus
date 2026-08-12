'use client';

import { useState } from 'react';

const RATES = [20, 25, 30, 35, 40, 50] as const;
const PLATFORM_RATE = 10;

interface AffiliateProgramFormProps {
  enabled: boolean;
  rate: number;
  /** Current product price (₦) — drives the live split preview. */
  price: number;
  /** Current admin moderation status, if the product already exists. */
  status?: string;
  onChange: (data: { affiliateEnabled: boolean; affiliateCommissionRate: number }) => void;
}

export function AffiliateProgramForm({
  enabled,
  rate,
  price,
  status,
  onChange,
}: AffiliateProgramFormProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [selectedRate, setSelectedRate] = useState(
    RATES.includes(rate as (typeof RATES)[number]) ? rate : 20,
  );
  const [showPreview, setShowPreview] = useState(enabled || false);

  const suspended = status === 'SUSPENDED';
  const statusBadge =
    status === 'APPROVED'
      ? { label: 'Approved — affiliates are actively promoting this product', tone: 'bg-forest-50 text-forest-700 border-forest-200' }
      : status === 'PENDING_REVIEW'
        ? { label: 'Pending review — we will notify you once it is approved', tone: 'bg-gold-50 text-gold-700 border-gold-200' }
        : status === 'REJECTED'
          ? { label: 'Not approved — editing and re-enabling submits it for review again', tone: 'bg-clay-50 text-clay-700 border-clay-200' }
          : null;

  const setEnabled = (value: boolean) => {
    if (suspended) return;
    setIsEnabled(value);
    setShowPreview(value);
    onChange({ affiliateEnabled: value, affiliateCommissionRate: selectedRate });
  };

  const setRate = (value: number) => {
    setSelectedRate(value);
    onChange({ affiliateEnabled: isEnabled, affiliateCommissionRate: value });
  };

  const examplePrice = Number.isFinite(price) && price > 0 ? price : 1000;
  const affiliateCut = Math.round(examplePrice * (selectedRate / 100) * 100) / 100;
  const creatorCut = Math.round(examplePrice * ((100 - PLATFORM_RATE - selectedRate) / 100) * 100) / 100;
  const platformCut = Math.round(examplePrice * (PLATFORM_RATE / 100) * 100) / 100;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">Affiliate Program</h2>
          <p className="mt-1 text-sm text-ink-500">
            Let affiliates promote this product in exchange for a commission. You set the reward; the
            platform always takes a flat {PLATFORM_RATE}% of each sale.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          disabled={suspended}
          onClick={() => setEnabled(!isEnabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-forest-700' : 'bg-ink-200'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {suspended && (
        <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-700">
          This product&apos;s affiliate program was suspended by an admin and can&apos;t be re-enabled here.
        </p>
      )}

      {statusBadge && isEnabled && (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${statusBadge.tone}`}>
          {statusBadge.label}
        </p>
      )}

      {isEnabled && (
        <div className="mt-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-700">Commission reward</label>
            <p className="mt-0.5 text-xs text-ink-400">
              The percent of each referred sale the affiliate earns — deducted from your share.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {RATES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRate(value)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedRate === value
                      ? 'border-forest-700 bg-forest-800 text-cream-50'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-forest-400'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-cream-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-700">How a ₦{examplePrice.toLocaleString()} sale splits</p>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-medium text-forest-700 hover:text-forest-600"
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Affiliate (at {selectedRate}%)</span>
                  <span className="font-semibold text-gold-700">₦{affiliateCut.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-600">Platform (flat {PLATFORM_RATE}%)</span>
                  <span className="font-semibold text-ink-500">₦{platformCut.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-t border-ink-200 pt-2">
                  <span className="font-medium text-ink-900">You keep</span>
                  <span className="font-bold text-forest-700">₦{creatorCut.toLocaleString()} ({100 - PLATFORM_RATE - selectedRate}%)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
