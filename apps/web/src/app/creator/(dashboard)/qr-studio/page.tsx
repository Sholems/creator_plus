'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@creatorplus/ui';

const inputClass =
  'mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

const SAFE_QR_DARK = '#143c2b';

// Contrast ratio of a hex color against white — QR modules need a very dark
// foreground (>= 7:1) to stay reliably scannable, especially with a logo.
function contrastWithWhite(hex?: string | null): number {
  if (!hex) return 0;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return 1.05 / (lum + 0.05);
}

type Campaign = {
  id: string;
  publicCode: string;
  publicUrl: string;
  title: string;
  description?: string | null;
  contentType: string;
  status: string;
  scanMode: string;
  brandPrimaryColor?: string | null;
  assets?: { id: string; fileName: string; safetyStatus: string }[];
};

export default function QrStudioPage() {
  const { token } = useAuth();
  const [offers, setOffers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [qrPreview, setQrPreview] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    contentType: 'FILE',
    destinationUrl: '',
    brandName: '',
    brandPrimaryColor: '#166534',
    brandAccentColor: '#f59e0b',
  });

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token]);

  useEffect(() => {
    if (!selectedCampaign) {
      setQrPreview('');
      setQrSvg('');
      setScanWarning('');
      return;
    }
    const base = typeof window === 'undefined' ? '' : window.location.origin;
    const url = `${base}/qr/${selectedCampaign.publicCode}`;

    // Brand color is used for the modules only when it stays dark enough to
    // scan; otherwise fall back to a safe dark and warn (R19, R21).
    const brand = selectedCampaign.brandPrimaryColor;
    const brandOk = contrastWithWhite(brand) >= 7;
    const dark = brandOk && brand ? brand : SAFE_QR_DARK;
    setScanWarning(
      brand && !brandOk
        ? 'Your brand colour is too light to scan reliably, so a darker shade was used for the code. Pick a darker brand colour to use it directly.'
        : '',
    );

    // High error correction + a generous quiet zone keep logo-branded codes
    // reliable (R19). Export both a digital PNG and a print-ready vector SVG (R20).
    const opts = { errorCorrectionLevel: 'H' as const, margin: 4, color: { dark, light: '#ffffff' } };
    QRCode.toDataURL(url, { ...opts, width: 720 }).then(setQrPreview).catch(() => setQrPreview(''));
    QRCode.toString(url, { ...opts, type: 'svg', width: 1024 })
      .then((svg) => setQrSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`))
      .catch(() => setQrSvg(''));
  }, [selectedCampaign]);

  const hasCampaigns = campaigns.length > 0;
  const activeCount = useMemo(
    () => campaigns.filter((campaign) => campaign.status === 'ACTIVE').length,
    [campaigns],
  );

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [offerData, campaignData] = await Promise.all([
        api.getQrOffers(token),
        api.getQrCampaigns(token),
      ]);
      setOffers(offerData);
      setCampaigns(campaignData);
      setSelectedCampaign(campaignData[0] ?? null);
    } catch (err: any) {
      setError(err.message || 'Could not load QR Studio');
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(offerCode: string) {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const checkout = await api.createQrCheckout(token, offerCode);
      window.location.href = checkout.url;
    } catch (err: any) {
      setError(err.message || 'Could not start Paystack checkout');
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const campaign = await api.createQrCampaign(token, {
        title: form.title,
        description: form.description,
        contentType: form.contentType,
        destinationUrl: form.contentType === 'WEBSITE' ? form.destinationUrl : undefined,
        brandName: form.brandName,
        brandPrimaryColor: form.brandPrimaryColor,
        brandAccentColor: form.brandAccentColor,
      });

      if (file && form.contentType === 'FILE') {
        await api.uploadQrCampaignFile(token, campaign.id, file);
      }

      const refreshed = await api.getQrCampaigns(token);
      setCampaigns(refreshed);
      setSelectedCampaign(refreshed.find((item: Campaign) => item.id === campaign.id) ?? refreshed[0] ?? null);
      setMessage('QR campaign draft created. Activate it when the content is ready.');
      setForm({ ...form, title: '', description: '', destinationUrl: '' });
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Could not create QR campaign');
    } finally {
      setBusy(false);
    }
  }

  async function activateCampaign(id: string) {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await api.setQrCampaignStatus(token, id, 'ACTIVE');
      await load();
      setMessage('QR campaign activated. Your printed code can now be scanned.');
    } catch (err: any) {
      setError(err.message || 'Could not activate campaign');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <p className="text-sm text-ink-600">Sign in to use QR Studio.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-gold-600">Premium module</p>
      <div className="mt-1 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">QR Studio</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Host files on CreatorPlus, design branded QR codes, and distribute one stable scan link.
            All plans are paid, branded, and watermark-free.
          </p>
        </div>
        <div className="rounded-2xl border border-forest-100 bg-forest-50 px-4 py-3 text-sm text-forest-800">
          <span className="font-semibold">{activeCount}</span> active campaigns
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-5 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-700" role="status">
          {message}
        </div>
      )}

      <section className="mt-8 grid gap-4 lg:grid-cols-4">
        {offers.map((offer) => (
          <article key={offer.code} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-ink-900">{offer.name}</p>
            <p className="mt-2 font-display text-3xl font-bold text-ink-900">
              ₦{Number(offer.amount).toLocaleString()}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-500">
              {offer.pro
                ? `Up to ${offer.maxActiveCampaigns} active campaigns for ${offer.durationDays} days.`
                : `${offer.campaignCredits} active campaign slot${offer.campaignCredits > 1 ? 's' : ''} for 12 months.`}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => startCheckout(offer.code)}
              className="mt-4 w-full rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50 transition hover:bg-forest-700 disabled:opacity-50"
            >
              Pay with Paystack
            </button>
          </article>
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink-900">Create a campaign</h2>
          <p className="mt-1 text-sm text-ink-500">
            Start with a hosted file/PDF or website link. Pro users can unlock richer content options through the API.
          </p>
          <form className="mt-5 space-y-4" onSubmit={createCampaign}>
            <div>
              <label className="text-sm font-medium text-ink-700" htmlFor="qr-title">Title</label>
              <input
                id="qr-title"
                required
                className={inputClass}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="My creator guide PDF"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700" htmlFor="qr-type">Content type</label>
              <select
                id="qr-type"
                className={inputClass}
                value={form.contentType}
                onChange={(event) => setForm({ ...form, contentType: event.target.value })}
              >
                <option value="FILE">Hosted PDF / document</option>
                <option value="WEBSITE">Website / custom link</option>
                <option value="TEXT_NOTE">Text note — Pro</option>
                <option value="WHATSAPP">WhatsApp chat — Pro</option>
                <option value="SOCIAL_LINK_HUB">Social link hub — Pro</option>
              </select>
            </div>
            {form.contentType === 'FILE' ? (
              <div>
                <label className="text-sm font-medium text-ink-700" htmlFor="qr-file">PDF or document</label>
                <input
                  id="qr-file"
                  type="file"
                  className={inputClass}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-ink-500">
                  Files are stored in the existing CreatorPlus Cloudflare R2 bucket and served through checked scan routes.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-ink-700" htmlFor="qr-url">Destination URL</label>
                <input
                  id="qr-url"
                  type="url"
                  className={inputClass}
                  value={form.destinationUrl}
                  onChange={(event) => setForm({ ...form, destinationUrl: event.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-ink-700" htmlFor="qr-brand">Brand name</label>
                <input
                  id="qr-brand"
                  className={inputClass}
                  value={form.brandName}
                  onChange={(event) => setForm({ ...form, brandName: event.target.value })}
                  placeholder="CreatorPlus"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-700" htmlFor="qr-description">Description</label>
                <input
                  id="qr-description"
                  className={inputClass}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="What scanners will receive"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Create paid campaign'}
              </button>
              <p className="text-xs leading-5 text-ink-500">
                No free drafts: the API requires a paid QR entitlement before creation.
              </p>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-ink-900">Design preview</h2>
          {selectedCampaign && qrPreview ? (
            <div className="mt-4">
              <img src={qrPreview} alt={`QR code for ${selectedCampaign.title}`} className="mx-auto h-64 w-64 rounded-2xl border border-ink-100 bg-white p-3" />
              <p className="mt-3 text-center text-sm font-semibold text-ink-900">{selectedCampaign.title}</p>
              <p className="mt-1 text-center text-xs text-ink-500">
                Encodes /qr/{selectedCampaign.publicCode}, not an R2 file URL.
              </p>
              {scanWarning && (
                <p className="mt-3 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-xs text-gold-800">
                  {scanWarning}
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={qrPreview}
                  download={`${selectedCampaign.title || 'creatorplus-qr'}.png`}
                  className="rounded-full bg-gold-500 px-4 py-2 text-center text-sm font-semibold text-ink-900 hover:bg-gold-400"
                >
                  Download PNG
                </a>
                <a
                  href={qrSvg || undefined}
                  download={`${selectedCampaign.title || 'creatorplus-qr'}.svg`}
                  aria-disabled={!qrSvg}
                  className={cn(
                    'rounded-full border border-forest-300 px-4 py-2 text-center text-sm font-semibold text-forest-800 hover:bg-cream-100',
                    !qrSvg && 'pointer-events-none opacity-50',
                  )}
                >
                  Print-ready SVG
                </a>
              </div>
              <p className="mt-2 text-center text-xs text-ink-400">
                Use the SVG for print — it stays sharp at any size.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">
              {loading ? 'Loading…' : 'Create or select a campaign to preview its QR code.'}
            </p>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold text-ink-900">Campaigns</h2>
        {!hasCampaigns ? (
          <p className="mt-3 text-sm text-ink-500">No QR campaigns yet. Buy a plan, then create your first campaign.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedCampaign(campaign)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition',
                  selectedCampaign?.id === campaign.id ? 'border-forest-500 bg-forest-50' : 'border-ink-100 hover:border-forest-200',
                )}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-ink-900">{campaign.title}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {campaign.contentType} · {campaign.status} · /qr/{campaign.publicCode}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {campaign.status !== 'ACTIVE' && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          void activateCampaign(campaign.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void activateCampaign(campaign.id);
                        }}
                        className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-cream-50"
                      >
                        Activate
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
