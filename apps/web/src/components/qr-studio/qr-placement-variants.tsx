'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { QrCampaign, QrPlacementVariant } from './qr-campaign-types';

type Props = {
  token: string;
  campaign: QrCampaign;
  onChanged: () => Promise<void>;
  onUseInDesigner: (variant: QrPlacementVariant) => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
};

const fieldClass =
  'mt-1 h-10 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

function suggestedCampaign(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function QrPlacementVariants({
  token,
  campaign,
  onChanged,
  onUseInDesigner,
  onMessage,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    utmSource: '',
    utmMedium: 'qr-code',
    utmCampaign: suggestedCampaign(campaign.title),
    utmContent: '',
    utmTerm: '',
  });
  const variants = campaign.placementVariants ?? [];
  const preview = useMemo(() => {
    if (campaign.contentType !== 'WEBSITE' || !campaign.destinationUrl) return '';
    try {
      const url = new URL(campaign.destinationUrl);
      const values: Record<string, string> = {
        utm_source: form.utmSource,
        utm_medium: form.utmMedium,
        utm_campaign: form.utmCampaign,
        utm_content: form.utmContent,
        utm_term: form.utmTerm,
      };
      Object.entries(values).forEach(([key, value]) => {
        if (value.trim()) url.searchParams.set(key, value.trim());
      });
      return url.toString();
    } catch {
      return '';
    }
  }, [campaign.contentType, campaign.destinationUrl, form]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    onError('');
    try {
      await api.createQrPlacementVariant(token, campaign.id, {
        name: form.name,
        ...(campaign.contentType === 'WEBSITE'
          ? {
              utmSource: form.utmSource || undefined,
              utmMedium: form.utmMedium || undefined,
              utmCampaign: form.utmCampaign || undefined,
              utmContent: form.utmContent || undefined,
              utmTerm: form.utmTerm || undefined,
            }
          : {}),
      });
      await onChanged();
      setForm({
        name: '',
        utmSource: '',
        utmMedium: 'qr-code',
        utmCampaign: suggestedCampaign(campaign.title),
        utmContent: '',
        utmTerm: '',
      });
      setShowForm(false);
      onMessage('Placement QR created. It now has its own stable code and analytics.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not create placement QR');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(variant: QrPlacementVariant, active: boolean) {
    if (
      !active &&
      !window.confirm(
        `Disable ${variant.name}? Its printed QR code will stop working until you enable it again.`,
      )
    )
      return;
    setBusy(true);
    onError('');
    try {
      await api.updateQrPlacementVariant(token, campaign.id, variant.id, { active });
      await onChanged();
      onMessage(`${variant.name} ${active ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not update placement QR');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(variant: QrPlacementVariant) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/qr/${variant.publicCode}`);
      onMessage('Placement link copied.');
    } catch {
      onError('Could not copy the placement link. Copy it from the code shown instead.');
    }
  }

  return (
    <section className="mt-6 border-t border-ink-200 pt-5" aria-labelledby="placement-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest-700">
            Offline attribution
          </p>
          <h3
            id="placement-heading"
            className="mt-1 font-display text-xl font-semibold text-ink-900"
          >
            Placement QR codes
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">
            Create a separate code for every flyer, banner, counter, or event. They keep this
            campaign’s destination while reporting their scans independently.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="min-h-11 rounded-md border border-forest-700 px-4 text-sm font-semibold text-forest-800 hover:bg-forest-50"
        >
          {showForm ? 'Close form' : 'Add placement'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={create}
          className="mt-5 border-y border-ink-200 bg-cream-50/40 px-4 py-5 sm:px-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2 lg:col-span-1">
              <span className="text-sm font-medium text-ink-700">Placement name</span>
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={fieldClass}
                placeholder="Conference entrance banner"
              />
            </label>
            {campaign.contentType === 'WEBSITE' && (
              <>
                <label>
                  <span className="text-sm font-medium text-ink-700">UTM source</span>
                  <input
                    required
                    value={form.utmSource}
                    onChange={(event) => setForm({ ...form, utmSource: event.target.value })}
                    className={fieldClass}
                    placeholder="lagos-conference"
                  />
                </label>
                <label>
                  <span className="text-sm font-medium text-ink-700">UTM medium</span>
                  <input
                    required
                    value={form.utmMedium}
                    onChange={(event) => setForm({ ...form, utmMedium: event.target.value })}
                    className={fieldClass}
                    placeholder="qr-code"
                  />
                </label>
                <label>
                  <span className="text-sm font-medium text-ink-700">UTM campaign</span>
                  <input
                    required
                    value={form.utmCampaign}
                    onChange={(event) => setForm({ ...form, utmCampaign: event.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className="text-sm font-medium text-ink-700">
                    UTM content <span className="font-normal text-ink-400">optional</span>
                  </span>
                  <input
                    value={form.utmContent}
                    onChange={(event) => setForm({ ...form, utmContent: event.target.value })}
                    className={fieldClass}
                    placeholder="entrance-banner"
                  />
                </label>
                <label>
                  <span className="text-sm font-medium text-ink-700">
                    UTM term <span className="font-normal text-ink-400">optional</span>
                  </span>
                  <input
                    value={form.utmTerm}
                    onChange={(event) => setForm({ ...form, utmTerm: event.target.value })}
                    className={fieldClass}
                  />
                </label>
              </>
            )}
          </div>
          {preview && (
            <div className="mt-4 border-l-2 border-forest-500 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-ink-600">Destination preview</p>
              <p className="mt-1 break-all text-xs text-forest-700">{preview}</p>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-md bg-forest-800 px-5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create placement QR'}
            </button>
          </div>
        </form>
      )}

      {variants.length === 0 ? (
        <div className="mt-5 border border-dashed border-ink-300 px-4 py-7 text-center">
          <p className="text-sm font-semibold text-ink-800">No placement codes yet</p>
          <p className="mt-1 text-xs text-ink-500">
            Your main campaign QR remains active and unchanged.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-ink-100 border-y border-ink-200">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="grid gap-3 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{variant.name}</p>
                  <span
                    className={`text-[0.625rem] font-bold uppercase tracking-wide ${variant.active ? 'text-forest-700' : 'text-ink-400'}`}
                  >
                    {variant.active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs text-ink-500">/qr/{variant.publicCode}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {variant.scanCount.toLocaleString()} scans · Last scan{' '}
                  {variant.lastScannedAt
                    ? new Date(variant.lastScannedAt).toLocaleDateString('en-NG')
                    : 'never'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => void copyLink(variant)}
                  className="min-h-10 rounded-md border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:border-ink-400"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => onUseInDesigner(variant)}
                  className="min-h-10 rounded-md border border-forest-300 px-3 text-xs font-semibold text-forest-800 hover:bg-forest-50"
                >
                  Design code
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setActive(variant, !variant.active)}
                  className="min-h-10 rounded-md border border-ink-200 px-3 text-xs font-semibold text-ink-600 hover:border-ink-400 disabled:opacity-50"
                >
                  {variant.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
