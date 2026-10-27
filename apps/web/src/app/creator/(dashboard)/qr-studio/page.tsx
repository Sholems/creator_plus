'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { QrDesigner, DEFAULT_QR_DESIGN, type QrDesign } from '@/components/qr-studio/qr-designer';
import { ContentTypePicker } from '@/components/qr-studio/content-type-picker';
import { AvatarUploader, SocialLinksEditor, MenuEditor, EMPTY_MENU } from '@/components/qr-studio/rich-fields';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@creatorplus/ui';

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · macrostructure: flat production workbench · theme: CreatorPlus forest/cream */

const inputClass =
  'mt-1 block w-full rounded-md border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition hover:border-ink-300 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

const BRAND_KIT_KEY = 'cp_qr_brand_kit';

// Design presets — the default is available to everyone; the rest are Pro (R6).
const DESIGN_PRESETS = [
  { id: 'forest', label: 'Forest', primary: '#166534', accent: '#f59e0b', pro: false },
  { id: 'midnight', label: 'Midnight', primary: '#0f172a', accent: '#38bdf8', pro: true },
  { id: 'plum', label: 'Plum', primary: '#4c1d95', accent: '#c084fc', pro: true },
  { id: 'ember', label: 'Ember', primary: '#7c2d12', accent: '#fb923c', pro: true },
  { id: 'mono', label: 'Mono', primary: '#111827', accent: '#6b7280', pro: true },
];

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
  destinationUrl?: string | null;
  destinationData?: Record<string, any> | null;
  brandName?: string | null;
  brandPrimaryColor?: string | null;
  brandAccentColor?: string | null;
  status: string;
  scanMode: string;
  designSettings?: { qrDesign?: Partial<QrDesign>; preset?: string } | null;
  assets?: { id: string; fileName: string; safetyStatus: string }[];
};

export default function QrStudioPage() {
  const { token } = useAuth();
  const [offers, setOffers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [design, setDesign] = useState<QrDesign>(DEFAULT_QR_DESIGN);
  const [savingDesign, setSavingDesign] = useState(false);
  const [access, setAccess] = useState<any>(null);
  const [presetId, setPresetId] = useState('forest');
  const [paymentNote, setPaymentNote] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [contentData, setContentData] = useState<Record<string, any>>({});
  const cd = (k: string, v: any) => setContentData((d) => ({ ...d, [k]: v }));

  const hasPro = !!access?.hasPro;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [createStep, setCreateStep] = useState<'content' | 'design' | 'publish'>('content');
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

  // Returning from Paystack: reflect canceled / pending / webhook-delayed states
  // and grant-on-confirmation without leaving the page (R34).
  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment');
    const status = params.get('status');
    if (!paymentId) return;
    window.history.replaceState({}, '', window.location.pathname);

    if (status === 'canceled') {
      setPaymentNote('Payment was canceled — no plan was purchased.');
      return;
    }

    let cancelled = false;
    setPaymentNote('Verifying your payment…');
    (async () => {
      for (let i = 0; i < 5 && !cancelled; i += 1) {
        try {
          const pay = await api.getQrPayment(token, paymentId);
          if (pay?.status === 'SUCCEEDED') {
            setPaymentNote('Payment confirmed — your QR Studio access is ready.');
            await load();
            return;
          }
          if (pay?.status === 'FAILED') {
            setPaymentNote('That payment did not go through. You can try again.');
            return;
          }
        } catch {
          /* keep waiting */
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (!cancelled) {
        setPaymentNote('Payment received — access is being confirmed. Refresh in a moment if it is not visible yet.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Load the selected campaign's saved QR design (falling back to its brand
  // colours, then defaults) so the designer opens on what was last saved.
  useEffect(() => {
    if (!selectedCampaign) {
      setDesign(DEFAULT_QR_DESIGN);
      return;
    }
    const saved = selectedCampaign.designSettings?.qrDesign;
    if (saved) {
      setDesign({ ...DEFAULT_QR_DESIGN, ...saved });
    } else {
      const brand = selectedCampaign.brandPrimaryColor;
      const dark = brand && contrastWithWhite(brand) >= 5 ? brand : DEFAULT_QR_DESIGN.dotsColor;
      setDesign({ ...DEFAULT_QR_DESIGN, dotsColor: dark, cornersColor: dark });
    }
  }, [selectedCampaign]);

  async function saveDesign() {
    if (!token || !selectedCampaign) return;
    setSavingDesign(true);
    setError('');
    try {
      await api.updateQrCampaign(token, selectedCampaign.id, { designSettings: { qrDesign: design } });
      setMessage('QR design saved.');
    } catch (err: any) {
      setError(err.message || 'Could not save design');
    } finally {
      setSavingDesign(false);
    }
  }

  function saveDesignTemplate() {
    try {
      localStorage.setItem('cp_qr_design_template', JSON.stringify(design));
      setMessage('Design template saved. Apply it on any campaign.');
    } catch {
      setError('Could not save the design template in this browser.');
    }
  }
  function applyDesignTemplate() {
    try {
      const raw = localStorage.getItem('cp_qr_design_template');
      if (!raw) return setError('No saved design template yet.');
      setDesign({ ...DEFAULT_QR_DESIGN, ...JSON.parse(raw) });
      setError('');
    } catch {
      setError('Could not read the saved design template.');
    }
  }

  const hasCampaigns = campaigns.length > 0;
  const activeCount = useMemo(
    () => campaigns.filter((campaign) => campaign.status === 'ACTIVE').length,
    [campaigns],
  );

  function populateFormFromCampaign(c: Campaign) {
    setForm({
      title: c.title ?? '',
      description: c.description ?? '',
      contentType: c.contentType ?? 'FILE',
      destinationUrl: c.destinationUrl ?? '',
      brandName: c.brandName ?? '',
      brandPrimaryColor: c.brandPrimaryColor ?? '#166534',
      brandAccentColor: c.brandAccentColor ?? '#f59e0b',
    });
    setFile(null);

    const data = (c.destinationData as Record<string, any>) || {};
    const t = c.contentType;

    if (['WEBSITE', 'PRODUCT_PAGE', 'CREATOR_PROFILE', 'EVENT'].includes(t)) {
      setContentData({});
    } else if (t === 'VIDEO' || t === 'AUDIO') {
      setContentData({ url: data.url ?? c.destinationUrl ?? '' });
    } else if (t === 'APP_LINK') {
      setContentData({
        iosUrl: data.iosUrl ?? '',
        androidUrl: data.androidUrl ?? '',
        webUrl: data.webUrl ?? '',
      });
    } else if (t === 'WIFI') {
      setContentData({
        ssid: data.ssid ?? '',
        password: data.password ?? '',
        encryption: data.encryption ?? 'WPA',
        hidden: !!data.hidden,
      });
    } else if (t === 'TEXT_NOTE') {
      setContentData({ text: data.text ?? '' });
    } else if (t === 'WHATSAPP' || t === 'SMS') {
      setContentData({ phone: data.phone ?? '', message: data.message ?? '' });
    } else if (t === 'SOCIAL_LINK_HUB') {
      const rawLinks = Array.isArray(data.links) ? data.links : [];
      const linksText = rawLinks.map((l: any) => `${l.label ?? ''} | ${l.url ?? ''}`).join('\n');
      setContentData({
        displayName: data.displayName ?? '',
        bio: data.bio ?? '',
        avatarUrl: data.avatarUrl ?? '',
        whatsapp: data.whatsapp ?? '',
        socials: Array.isArray(data.socials) ? data.socials : [],
        linksText,
      });
    } else if (t === 'VCARD') {
      setContentData({
        fullName: data.fullName ?? '',
        org: data.org ?? '',
        title: data.title ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        address: data.address ?? '',
        socials: Array.isArray(data.socials) ? data.socials : [],
        avatarUrl: data.avatarUrl ?? '',
      });
    } else if (t === 'COUPON') {
      setContentData({
        code: data.code ?? '',
        description: data.description ?? '',
        expiresAt: data.expiresAt ?? '',
        ctaUrl: data.ctaUrl ?? '',
      });
    } else if (t === 'LOCATION') {
      setContentData({
        address: data.address ?? '',
        label: data.label ?? '',
        latitude: data.latitude !== undefined ? String(data.latitude) : '',
        longitude: data.longitude !== undefined ? String(data.longitude) : '',
      });
    } else if (t === 'EMAIL') {
      setContentData({
        email: data.email ?? '',
        subject: data.subject ?? '',
        body: data.body ?? '',
      });
    } else if (t === 'MENU') {
      setContentData({ menu: data.sections ? data : EMPTY_MENU });
    } else {
      setContentData(data);
    }
  }

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [offerData, campaignData, accessData] = await Promise.all([
        api.getQrOffers(token),
        api.getQrCampaigns(token),
        api.getQrAccess(token).catch(() => null),
      ]);
      setOffers(offerData);
      setCampaigns(campaignData);
      setAccess(accessData);
      if (campaignData.length > 0) {
        setSelectedCampaign((prev) => {
          const matched = prev ? campaignData.find((c: Campaign) => c.id === prev.id) : null;
          const target = matched ?? campaignData[0];
          populateFormFromCampaign(target);
          return target;
        });
      } else {
        setSelectedCampaign(null);
      }
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
      const checkout = await api.createQrCheckout(token, offerCode, couponCode.trim() || undefined);
      window.location.href = checkout.url;
    } catch (err: any) {
      setError(err.message || 'Could not start Paystack checkout');
    } finally {
      setBusy(false);
    }
  }

  function buildContentPayload(): { destinationUrl?: string; destinationData?: any } {
    const t = form.contentType;
    if (['WEBSITE', 'PRODUCT_PAGE', 'CREATOR_PROFILE', 'EVENT'].includes(t)) return { destinationUrl: form.destinationUrl };
    if (t === 'VIDEO' || t === 'AUDIO') return { destinationData: { url: contentData.url } };
    if (t === 'APP_LINK') return { destinationData: { iosUrl: contentData.iosUrl || undefined, androidUrl: contentData.androidUrl || undefined, webUrl: contentData.webUrl || undefined } };
    if (t === 'WIFI') return { destinationData: { ssid: contentData.ssid, password: contentData.password, encryption: contentData.encryption || 'WPA', hidden: !!contentData.hidden } };
    if (t === 'TEXT_NOTE') return { destinationData: { text: contentData.text } };
    if (t === 'WHATSAPP' || t === 'SMS') return { destinationData: { phone: contentData.phone, message: contentData.message } };
    if (t === 'SOCIAL_LINK_HUB') {
      const links = String(contentData.linksText ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, url] = line.split('|').map((s) => s.trim());
          return { label: label ?? '', url: url ?? label };
        });
      return {
        destinationData: {
          displayName: contentData.displayName,
          bio: contentData.bio,
          avatarUrl: contentData.avatarUrl || undefined,
          whatsapp: contentData.whatsapp,
          socials: (contentData.socials ?? []).map((s: string) => s.trim()).filter(Boolean),
          links,
        },
      };
    }
    if (t === 'VCARD')
      return {
        destinationData: {
          fullName: contentData.fullName, org: contentData.org, title: contentData.title,
          phone: contentData.phone, email: contentData.email, website: contentData.website,
          address: contentData.address,
          socials: (contentData.socials ?? []).map((s: string) => s.trim()).filter(Boolean),
          avatarUrl: contentData.avatarUrl || undefined,
        },
      };
    if (t === 'COUPON')
      return { destinationData: { code: contentData.code, description: contentData.description, expiresAt: contentData.expiresAt, ctaUrl: contentData.ctaUrl } };
    if (t === 'LOCATION')
      return {
        destinationData: {
          address: contentData.address,
          label: contentData.label,
          latitude: contentData.latitude ? Number(contentData.latitude) : undefined,
          longitude: contentData.longitude ? Number(contentData.longitude) : undefined,
        },
      };
    if (t === 'EMAIL') return { destinationData: { email: contentData.email, subject: contentData.subject, body: contentData.body } };
    if (t === 'MENU') return { destinationData: contentData.menu ?? EMPTY_MENU };
    return {};
  }

  async function saveCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const campaignForm = e.currentTarget;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (selectedCampaign) {
        const payload: any = {
          title: form.title,
          description: form.description,
          contentType: form.contentType,
          brandName: form.brandName,
          brandPrimaryColor: form.brandPrimaryColor,
          brandAccentColor: form.brandAccentColor,
          ...buildContentPayload(),
        };

        const updated = await api.updateQrCampaign(token, selectedCampaign.id, payload);

        if (file && form.contentType === 'FILE') {
          await api.uploadQrCampaignFile(token, selectedCampaign.id, file);
          setFile(null);
        }

        const refreshed = await api.getQrCampaigns(token);
        setCampaigns(refreshed);
        const latest = refreshed.find((item: Campaign) => item.id === selectedCampaign.id) ?? updated;
        setSelectedCampaign(latest);
        populateFormFromCampaign(latest);
        setMessage('QR code updated successfully.');
      } else {
        const campaign = await api.createQrCampaign(token, {
          title: form.title,
          description: form.description,
          contentType: form.contentType,
          ...buildContentPayload(),
          brandName: form.brandName,
          brandPrimaryColor: form.brandPrimaryColor,
          brandAccentColor: form.brandAccentColor,
          designSettings: { preset: presetId },
        });

        if (file && form.contentType === 'FILE') {
          await api.uploadQrCampaignFile(token, campaign.id, file);
        }

        const refreshed = await api.getQrCampaigns(token);
        setCampaigns(refreshed);
        const latest = refreshed.find((item: Campaign) => item.id === campaign.id) ?? refreshed[0] ?? null;
        setSelectedCampaign(latest);
        if (latest) populateFormFromCampaign(latest);
        setCreateStep('design');
        setMessage('Content saved. Your stable QR link is ready to design.');
        setFile(null);
        campaignForm.reset();
      }
    } catch (err: any) {
      setError(err.message || (selectedCampaign ? 'Could not update QR campaign' : 'Could not create QR campaign'));
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
      const refreshed = await api.getQrCampaigns(token);
      setCampaigns(refreshed);
      const found = refreshed.find((campaign: Campaign) => campaign.id === id) ?? refreshed[0] ?? null;
      setSelectedCampaign(found);
      if (found) populateFormFromCampaign(found);
      setMessage('QR campaign activated. Your printed code can now be scanned.');
    } catch (err: any) {
      setError(err.message || 'Could not activate campaign');
    } finally {
      setBusy(false);
    }
  }

  async function updateCampaignStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await api.setQrCampaignStatus(token, id, status);
      const refreshed = await api.getQrCampaigns(token);
      setCampaigns(refreshed);
      const found = refreshed.find((campaign: Campaign) => campaign.id === id) ?? refreshed[0] ?? null;
      setSelectedCampaign(found);
      if (found) populateFormFromCampaign(found);
      setMessage(`Campaign status changed to ${status.toLowerCase()}.`);
    } catch (err: any) {
      setError(err.message || `Could not set status to ${status.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  async function updateScanMode(newMode: 'LANDING_PAGE' | 'DIRECT_OPEN') {
    if (!token || !selectedCampaign) return;
    setBusy(true);
    setError('');
    try {
      await api.updateQrCampaign(token, selectedCampaign.id, { scanMode: newMode });
      const refreshed = await api.getQrCampaigns(token);
      setCampaigns(refreshed);
      const found = refreshed.find((campaign: Campaign) => campaign.id === selectedCampaign.id) ?? refreshed[0] ?? null;
      setSelectedCampaign(found);
      if (found) populateFormFromCampaign(found);
      setMessage(`Scan mode updated to ${newMode === 'DIRECT_OPEN' ? 'Direct Open' : 'Landing Page'}.`);
    } catch (err: any) {
      setError(err.message || 'Could not update scan mode');
    } finally {
      setBusy(false);
    }
  }

  function selectCampaign(campaign: Campaign) {
    setSelectedCampaign(campaign);
    populateFormFromCampaign(campaign);
    setError('');
    setMessage('');
  }

  function applyPreset(preset: (typeof DESIGN_PRESETS)[number]) {
    if (preset.pro && !hasPro) {
      setError('That design preset is part of Pro QR Studio.');
      return;
    }
    setError('');
    setPresetId(preset.id);
    setForm((f) => ({ ...f, brandPrimaryColor: preset.primary, brandAccentColor: preset.accent }));
  }

  function saveBrandKit() {
    try {
      localStorage.setItem(
        BRAND_KIT_KEY,
        JSON.stringify({ brandName: form.brandName, brandPrimaryColor: form.brandPrimaryColor, brandAccentColor: form.brandAccentColor, presetId }),
      );
      setMessage('Brand kit saved. Apply it on any new campaign.');
    } catch {
      setError('Could not save your brand kit in this browser.');
    }
  }

  function applyBrandKit() {
    try {
      const raw = localStorage.getItem(BRAND_KIT_KEY);
      if (!raw) {
        setError('No saved brand kit yet — save one first.');
        return;
      }
      const kit = JSON.parse(raw);
      setForm((f) => ({ ...f, brandName: kit.brandName ?? '', brandPrimaryColor: kit.brandPrimaryColor ?? f.brandPrimaryColor, brandAccentColor: kit.brandAccentColor ?? f.brandAccentColor }));
      if (kit.presetId) setPresetId(kit.presetId);
      setError('');
    } catch {
      setError('Could not read your saved brand kit.');
    }
  }

  function beginNewCampaign() {
    setSelectedCampaign(null);
    setCreateStep('content');
    setError('');
    setMessage('');
    setForm({
      title: '',
      description: '',
      contentType: hasPro ? 'FILE' : 'WEBSITE',
      destinationUrl: '',
      brandName: '',
      brandPrimaryColor: '#166534',
      brandAccentColor: '#f59e0b',
    });
    setContentData({});
    setFile(null);
  }

  if (!token) {
    return (
      <div className="border-y border-ink-200 bg-white p-6">
        <p className="text-sm text-ink-600">Sign in to use QR Studio.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-ink-200 pb-5">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <Link href={'/dashboard' as Route} className="text-xs font-semibold text-forest-700 hover:text-forest-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500">← Account</Link>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">QR Studio</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Host files on CreatorPlus, design branded QR codes, and distribute one stable scan link.
            All plans are paid, branded, and watermark-free.
            </p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <div>
              <span className="font-semibold text-ink-900">{activeCount}</span>
              <span className="ml-1.5 text-ink-500">active</span>
            </div>
            {access && <span className="border-l border-ink-200 pl-5 text-xs text-ink-500">{hasPro ? 'Pro membership' : 'Starter access'}</span>}
          </div>
        </div>
      </header>

      {paymentNote && (
        <div className="mt-4 border-l-2 border-gold-500 bg-gold-50 px-4 py-3 text-sm text-gold-800" role="status">
          {paymentNote}
        </div>
      )}
      {error && (
        <div className="mt-4 border-l-2 border-clay-500 bg-clay-50 px-4 py-3 text-sm text-clay-700" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="mt-4 border-l-2 border-forest-600 bg-forest-50 px-4 py-3 text-sm text-forest-700" role="status">
          {message}
        </div>
      )}

      {!hasPro ? (
        <section className="mt-5 border-y border-ink-200 bg-white px-1 py-5">
          <h2 className="mt-1 font-display text-xl font-semibold text-ink-900">You're on the free QR plan</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            Create <strong>1 QR code</strong> with links, WhatsApp, vCard, a menu and more. Upgrade to a
            <strong> CreatorPlus Pro membership</strong> to unlock <strong>unlimited QR codes</strong>,
            <strong> file &amp; PDF uploads</strong>, the full designer, and every other member benefit.
          </p>
          <Link
            href={'/community/join' as Route}
            className="mt-4 inline-block rounded-md bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
          >
            Upgrade to Pro
          </Link>
        </section>
      ) : (
        <section className="mt-5 border-y border-ink-200 px-1 py-3 text-sm text-ink-600">
          <span className="font-semibold text-forest-800">Pro access</span> includes unlimited codes, file and PDF uploads, and the full designer.
        </section>
      )}

      <div className="mt-6 grid items-start overflow-hidden border-y border-ink-200 bg-white xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b border-ink-200 bg-cream-50/40 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">QR library</h2>
              <p className="mt-0.5 text-xs text-ink-500">{campaigns.length} campaigns</p>
            </div>
            <button
              type="button"
              onClick={beginNewCampaign}
              className="whitespace-nowrap rounded-md bg-forest-800 px-3 py-2 text-xs font-semibold text-cream-50 transition hover:bg-forest-700 active:bg-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
            >
              + New QR
            </button>
          </div>

          <div className="flex items-center gap-5 border-b border-ink-200 px-4 py-3 text-xs">
            <span><strong className="text-ink-900">{activeCount}</strong> <span className="text-ink-500">active</span></span>
            <span><strong className="text-ink-900">{campaigns.length - activeCount}</strong> <span className="text-ink-500">draft</span></span>
          </div>

          {!hasCampaigns ? (
            <div className="m-4 border border-dashed border-ink-300 p-4 text-center">
              <p className="text-sm font-semibold text-ink-800">Your QR library is empty</p>
              <p className="mt-1 text-xs leading-5 text-ink-500">Choose a content type to create your first stable QR link.</p>
            </div>
          ) : (
            <div className="max-h-[32rem] overflow-y-auto">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => selectCampaign(campaign)}
                  className={cn(
                    'w-full border-b border-ink-100 border-l-2 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-500',
                    selectedCampaign?.id === campaign.id
                      ? 'border-l-forest-700 bg-white'
                      : 'border-l-transparent hover:bg-white active:bg-forest-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">{campaign.title}</span>
                      <span className="mt-1 block text-[0.6875rem] text-ink-500">{campaign.contentType.replaceAll('_', ' ')} · /qr/{campaign.publicCode}</span>
                    </span>
                    <span className={cn('shrink-0 text-[0.5625rem] font-bold uppercase tracking-wide', campaign.status === 'ACTIVE' ? 'text-forest-700' : 'text-gold-700')}>
                      {campaign.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <nav aria-label="QR creation steps" className="border-b border-ink-200 bg-white px-5 sm:px-8">
            <ol className="grid grid-cols-3">
              {([
                ['content', '01', selectedCampaign ? 'Edit Content' : 'Content'],
                ['design', '02', 'Design'],
                ['publish', '03', selectedCampaign ? 'Publish & Manage' : 'Publish'],
              ] as const).map(([step, number, label]) => {
                const disabled = step !== 'content' && !selectedCampaign;
                return (
                  <li key={step}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setCreateStep(step)}
                      className={cn(
                        '-mb-px flex w-full items-center justify-center gap-2 border-b-2 px-2 py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 disabled:cursor-not-allowed disabled:opacity-40',
                        createStep === step ? 'border-forest-700 text-forest-900' : 'border-transparent text-ink-500 hover:text-ink-900',
                      )}
                    >
                      <span className={cn('text-[0.625rem] font-bold', createStep === step ? 'text-forest-600' : 'text-ink-300')}>{number}</span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

        {createStep === 'content' && (
        <section className="bg-white p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                  {selectedCampaign ? 'Edit QR code' : 'Choose your QR content'}
                </h2>
                {selectedCampaign && (
                  <span className={cn(
                    'rounded px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider',
                    selectedCampaign.status === 'ACTIVE' ? 'bg-forest-100 text-forest-800' : 'bg-gold-100 text-gold-800',
                  )}>
                    {selectedCampaign.status}
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-xs sm:text-sm text-ink-500">
                {selectedCampaign
                  ? `Editing /qr/${selectedCampaign.publicCode} — changes update immediately without reprinting your QR code.`
                  : 'Create one stable scan link for a hosted file, website, contact action, media page, or interactive experience.'}
              </p>
            </div>
            {selectedCampaign && (
              <button
                type="button"
                onClick={beginNewCampaign}
                className="whitespace-nowrap rounded-md border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-ink-400 hover:bg-cream-50"
              >
                + Create new QR instead
              </button>
            )}
          </div>
          <form className="mt-5 space-y-4" onSubmit={saveCampaign}>
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
            <ContentTypePicker
              value={form.contentType}
              onChange={(contentType) => setForm({ ...form, contentType })}
            />

            {form.contentType === 'FILE' && (
              <div>
                {selectedCampaign?.assets && selectedCampaign.assets.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink-200 bg-cream-50/70 px-3.5 py-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-ink-700">Active file: </span>
                      <span className="font-mono text-forest-800">{selectedCampaign.assets[0].fileName}</span>
                    </div>
                    <span className={cn(
                      'text-[0.625rem] font-bold uppercase tracking-wide',
                      selectedCampaign.assets[0].safetyStatus === 'APPROVED' ? 'text-forest-700' : 'text-gold-700',
                    )}>
                      {selectedCampaign.assets[0].safetyStatus}
                    </span>
                  </div>
                )}
                <label className="text-sm font-medium text-ink-700" htmlFor="qr-file">
                  {selectedCampaign?.assets?.length ? 'Upload replacement file (PDF or document)' : 'PDF or document'}
                </label>
                <input id="qr-file" type="file" className={inputClass} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                <p className="mt-1 text-xs text-ink-500">
                  {selectedCampaign?.assets?.length
                    ? 'Selecting a new file replaces the active document while keeping your QR code and scan link unchanged.'
                    : 'Stored in Cloudflare R2 and served through checked scan routes.'}
                </p>
              </div>
            )}
            {['WEBSITE', 'PRODUCT_PAGE', 'CREATOR_PROFILE', 'EVENT'].includes(form.contentType) && (
              <div>
                <label className="text-sm font-medium text-ink-700">{form.contentType === 'EVENT' ? 'Event / ticket page URL' : 'Destination URL'}</label>
                <input type="url" className={inputClass} value={form.destinationUrl} onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })} placeholder="https://mycreatorplus.com/products/your-event" />
              </div>
            )}
            {(form.contentType === 'VIDEO' || form.contentType === 'AUDIO') && (
              <div>
                <label className="text-sm font-medium text-ink-700">{form.contentType === 'VIDEO' ? 'YouTube / Vimeo / Bunny Stream URL' : 'Spotify / SoundCloud URL'}</label>
                <input type="url" className={inputClass} value={contentData.url ?? ''} onChange={(e) => cd('url', e.target.value)} placeholder="https://…" />
              </div>
            )}
            {form.contentType === 'APP_LINK' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input className={`${inputClass} sm:col-span-2`} value={contentData.iosUrl ?? ''} onChange={(e) => cd('iosUrl', e.target.value)} placeholder="App Store URL (apps.apple.com)" />
                <input className={`${inputClass} sm:col-span-2`} value={contentData.androidUrl ?? ''} onChange={(e) => cd('androidUrl', e.target.value)} placeholder="Play Store URL (play.google.com)" />
                <input className={`${inputClass} sm:col-span-2`} value={contentData.webUrl ?? ''} onChange={(e) => cd('webUrl', e.target.value)} placeholder="Web fallback URL (optional)" />
              </div>
            )}
            {form.contentType === 'WIFI' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input className={inputClass} value={contentData.ssid ?? ''} onChange={(e) => cd('ssid', e.target.value)} placeholder="Network name (SSID)*" />
                <select className={inputClass} value={contentData.encryption ?? 'WPA'} onChange={(e) => cd('encryption', e.target.value)}>
                  <option value="WPA">WPA / WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Open (no password)</option>
                </select>
                {contentData.encryption !== 'nopass' && (
                  <input className={`${inputClass} sm:col-span-2`} value={contentData.password ?? ''} onChange={(e) => cd('password', e.target.value)} placeholder="Password" />
                )}
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input type="checkbox" checked={!!contentData.hidden} onChange={(e) => cd('hidden', e.target.checked)} /> Hidden network
                </label>
              </div>
            )}
            {form.contentType === 'TEXT_NOTE' && (
              <div>
                <label className="text-sm font-medium text-ink-700">Text</label>
                <textarea className={inputClass} rows={3} value={contentData.text ?? ''} onChange={(e) => cd('text', e.target.value)} placeholder="The note scanners will see" />
              </div>
            )}
            {(form.contentType === 'WHATSAPP' || form.contentType === 'SMS') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-ink-700">Phone (international)</label>
                  <input className={inputClass} value={contentData.phone ?? ''} onChange={(e) => cd('phone', e.target.value)} placeholder="+2348012345678" />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Prefilled message (optional)</label>
                  <input className={inputClass} value={contentData.message ?? ''} onChange={(e) => cd('message', e.target.value)} />
                </div>
              </div>
            )}
            {form.contentType === 'SOCIAL_LINK_HUB' && (
              <div className="space-y-4">
                {token && <AvatarUploader token={token} value={contentData.avatarUrl} onChange={(url) => cd('avatarUrl', url)} />}
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className={inputClass} value={contentData.displayName ?? ''} onChange={(e) => cd('displayName', e.target.value)} placeholder="Display name" />
                  <input className={inputClass} value={contentData.whatsapp ?? ''} onChange={(e) => cd('whatsapp', e.target.value)} placeholder="WhatsApp number (optional)" />
                  <textarea className={`${inputClass} sm:col-span-2`} rows={2} value={contentData.bio ?? ''} onChange={(e) => cd('bio', e.target.value)} placeholder="Short bio / tagline" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-700">Social icons</p>
                  <SocialLinksEditor value={contentData.socials ?? []} onChange={(v) => cd('socials', v)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Featured link buttons (one per line, as “Label | https://url”)</label>
                  <textarea className={inputClass} rows={3} value={contentData.linksText ?? ''} onChange={(e) => cd('linksText', e.target.value)} placeholder={'My shop | https://shop.example.com'} />
                </div>
              </div>
            )}
            {form.contentType === 'MENU' && (
              <MenuEditor value={contentData.menu ?? EMPTY_MENU} onChange={(v) => cd('menu', v)} />
            )}
            {form.contentType === 'VCARD' && (
              <div className="space-y-4">
                {token && <AvatarUploader token={token} value={contentData.avatarUrl} onChange={(url) => cd('avatarUrl', url)} />}
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className={inputClass} value={contentData.fullName ?? ''} onChange={(e) => cd('fullName', e.target.value)} placeholder="Full name*" />
                  <input className={inputClass} value={contentData.org ?? ''} onChange={(e) => cd('org', e.target.value)} placeholder="Company" />
                  <input className={inputClass} value={contentData.title ?? ''} onChange={(e) => cd('title', e.target.value)} placeholder="Job title" />
                  <input className={inputClass} value={contentData.phone ?? ''} onChange={(e) => cd('phone', e.target.value)} placeholder="Phone (click-to-call)" />
                  <input className={inputClass} value={contentData.email ?? ''} onChange={(e) => cd('email', e.target.value)} placeholder="Email" />
                  <input className={inputClass} value={contentData.website ?? ''} onChange={(e) => cd('website', e.target.value)} placeholder="https://website" />
                  <input className={`${inputClass} sm:col-span-2`} value={contentData.address ?? ''} onChange={(e) => cd('address', e.target.value)} placeholder="Address (opens in Maps)" />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink-700">Social links</p>
                  <SocialLinksEditor value={contentData.socials ?? []} onChange={(v) => cd('socials', v)} />
                </div>
              </div>
            )}
            {form.contentType === 'COUPON' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input className={inputClass} value={contentData.code ?? ''} onChange={(e) => cd('code', e.target.value)} placeholder="Promo code*" />
                <input className={inputClass} value={contentData.expiresAt ?? ''} onChange={(e) => cd('expiresAt', e.target.value)} placeholder="Expires (e.g. Dec 31)" />
                <input className={`${inputClass} sm:col-span-2`} value={contentData.description ?? ''} onChange={(e) => cd('description', e.target.value)} placeholder="Description" />
                <input className={`${inputClass} sm:col-span-2`} value={contentData.ctaUrl ?? ''} onChange={(e) => cd('ctaUrl', e.target.value)} placeholder="Shop link (optional, https)" />
              </div>
            )}
            {form.contentType === 'LOCATION' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input className={`${inputClass} sm:col-span-2`} value={contentData.address ?? ''} onChange={(e) => cd('address', e.target.value)} placeholder="Address (or use coordinates)" />
                <input className={inputClass} value={contentData.label ?? ''} onChange={(e) => cd('label', e.target.value)} placeholder="Place name" />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} value={contentData.latitude ?? ''} onChange={(e) => cd('latitude', e.target.value)} placeholder="Latitude" />
                  <input className={inputClass} value={contentData.longitude ?? ''} onChange={(e) => cd('longitude', e.target.value)} placeholder="Longitude" />
                </div>
              </div>
            )}
            {form.contentType === 'EMAIL' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input className={inputClass} value={contentData.email ?? ''} onChange={(e) => cd('email', e.target.value)} placeholder="Email address*" />
                <input className={inputClass} value={contentData.subject ?? ''} onChange={(e) => cd('subject', e.target.value)} placeholder="Subject" />
                <textarea className={`${inputClass} sm:col-span-2`} rows={2} value={contentData.body ?? ''} onChange={(e) => cd('body', e.target.value)} placeholder="Message body" />
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

            <div className="border-y border-ink-200 py-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-800">Design &amp; branding</p>
                {!hasPro && <span className="text-[0.625rem] font-semibold text-forest-700">More presets with Pro</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DESIGN_PRESETS.map((preset) => {
                  const locked = preset.pro && !hasPro;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
                        presetId === preset.id ? 'border-forest-600 bg-forest-50 text-forest-800' : 'border-ink-200 text-ink-700 hover:border-ink-400',
                        locked && 'opacity-50',
                      )}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                      {preset.label}
                      {locked && <span className="text-[0.625rem] text-gold-600">Pro</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  Primary
                  <input type="color" value={form.brandPrimaryColor} onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-ink-200" />
                </label>
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  Accent
                  <input type="color" value={form.brandAccentColor} onChange={(e) => setForm({ ...form, brandAccentColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-ink-200" />
                </label>
                {hasPro && (
                  <div className="ml-auto flex gap-2">
                    <button type="button" onClick={saveBrandKit} className="rounded-md border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:border-ink-400">Save brand kit</button>
                    <button type="button" onClick={applyBrandKit} className="rounded-md border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:border-ink-400">Apply brand kit</button>
                  </div>
                )}
              </div>
              {contrastWithWhite(form.brandPrimaryColor) < 7 && (
                <p className="mt-2 text-xs text-gold-700">Tip: a darker primary colour scans more reliably.</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-forest-700 disabled:opacity-50"
              >
                {busy ? 'Saving…' : selectedCampaign ? 'Save changes' : 'Save content & continue'}
              </button>
              {selectedCampaign && (
                <button
                  type="button"
                  onClick={() => setCreateStep('design')}
                  className="rounded-md border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-ink-400"
                >
                  Continue to design →
                </button>
              )}
              {!selectedCampaign && (
                <p className="text-xs leading-5 text-ink-500">
                  No free drafts: the API requires a paid QR entitlement before creation.
                </p>
              )}
            </div>
          </form>
        </section>
        )}

        {createStep === 'design' && (
        <section className="bg-white p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink-900">Design your QR code</h2>
              <p className="mt-1 text-sm text-ink-500">Shape it for your brand while keeping the code easy to scan.</p>
            </div>
            {selectedCampaign && (
              <div className="flex flex-wrap gap-2">
                {hasPro && (
                  <>
                    <button onClick={saveDesignTemplate} className="rounded-md border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:border-ink-400">Save template</button>
                    <button onClick={applyDesignTemplate} className="rounded-md border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:border-ink-400">Apply template</button>
                  </>
                )}
                <button onClick={saveDesign} disabled={savingDesign} className="rounded-md bg-forest-800 px-4 py-2 text-xs font-semibold text-cream-50 hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {savingDesign ? 'Saving…' : 'Save design'}
                </button>
              </div>
            )}
          </div>
          {selectedCampaign ? (
            <div className="mt-4">
              <QrDesigner
                url={`${typeof window !== 'undefined' ? window.location.origin : 'https://mycreatorplus.com'}/qr/${selectedCampaign.publicCode}`}
                value={design}
                onChange={setDesign}
                fileName={selectedCampaign.title || 'creatorplus-qr'}
              />
              <p className="mt-3 text-xs text-ink-400">Encodes /qr/{selectedCampaign.publicCode} — edit content anytime without reprinting. SVG export stays sharp at any print size.</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
                <button type="button" onClick={() => setCreateStep('content')} className="whitespace-nowrap rounded-md border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500">Back to content</button>
                <button type="button" onClick={() => setCreateStep('publish')} className="whitespace-nowrap rounded-md bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-forest-700 active:bg-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2">Continue to publish</button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">{loading ? 'Loading…' : 'Create or select a campaign to design its QR code.'}</p>
          )}
        </section>
        )}

        {createStep === 'publish' && (
          <section className="bg-white p-5 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Publish with confidence</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-500">Review the destination and safety status, then activate the stable link before distributing your QR code.</p>

            {selectedCampaign ? (
              <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                  <div className="border-y border-ink-200 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Campaign</p>
                        <h3 className="mt-1 font-display text-xl font-semibold text-ink-900">{selectedCampaign.title}</h3>
                        <p className="mt-1 text-sm text-ink-500">{selectedCampaign.contentType.replaceAll('_', ' ')}</p>
                      </div>
                      <span className={cn(
                        'flex items-center gap-2 text-xs font-bold uppercase tracking-wide',
                        selectedCampaign.status === 'ACTIVE' ? 'text-forest-700' : 'text-gold-700',
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {selectedCampaign.status}
                      </span>
                    </div>
                    <div className="mt-5 border-t border-ink-200 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-ink-500">Stable scan link</p>
                          <p className="mt-1 break-all text-sm font-medium text-forest-700">
                            {selectedCampaign.publicUrl || `https://mycreatorplus.com/qr/${selectedCampaign.publicCode}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://mycreatorplus.com'}/qr/${selectedCampaign.publicCode}`;
                              void navigator.clipboard.writeText(fullUrl);
                              setMessage('Scan link copied to clipboard.');
                            }}
                            className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-ink-400"
                          >
                            Copy link
                          </button>
                          <a
                            href={`/qr/${selectedCampaign.publicCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-semibold text-forest-700 hover:border-forest-400"
                          >
                            Preview page ↗
                          </a>
                        </div>
                      </div>
                    </div>

                    {hasPro && (
                      <div className="mt-5 border-t border-ink-200 pt-4">
                        <label className="text-xs font-semibold text-ink-700">Scan behavior</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateScanMode('LANDING_PAGE')}
                            className={cn(
                              'rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                              selectedCampaign.scanMode === 'LANDING_PAGE'
                                ? 'border-forest-600 bg-forest-50 text-forest-800'
                                : 'border-ink-200 text-ink-600 hover:border-ink-400',
                            )}
                          >
                            Branded Landing Page
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void updateScanMode('DIRECT_OPEN')}
                            className={cn(
                              'rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                              selectedCampaign.scanMode === 'DIRECT_OPEN'
                                ? 'border-forest-600 bg-forest-50 text-forest-800'
                                : 'border-ink-200 text-ink-600 hover:border-ink-400',
                            )}
                          >
                            Direct Open (Instant Redirect)
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {selectedCampaign.scanMode === 'DIRECT_OPEN'
                            ? 'Scanners are redirected straight to destination.'
                            : 'Scanners view your branded profile card.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedCampaign.contentType === 'FILE' && (
                    <div className="border-b border-ink-200 py-5">
                      <p className="text-sm font-semibold text-ink-900">Hosted file check</p>
                      {selectedCampaign.assets?.length ? selectedCampaign.assets.map((asset) => (
                        <div key={asset.id} className="mt-3 flex flex-wrap items-center justify-between gap-2 border-l-2 border-ink-200 bg-cream-50/60 px-4 py-3">
                          <span className="min-w-0 truncate text-sm text-ink-700">{asset.fileName}</span>
                          <span className={cn(
                            'text-[0.625rem] font-bold uppercase tracking-wide',
                            asset.safetyStatus === 'APPROVED' ? 'text-forest-700' : 'text-gold-700',
                          )}>{asset.safetyStatus}</span>
                        </div>
                      )) : <p className="mt-2 text-sm text-clay-600">Upload a file in Content before activating this campaign.</p>}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-5">
                    <button type="button" onClick={() => setCreateStep('design')} className="whitespace-nowrap rounded-md border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-ink-400 active:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500">Back to design</button>
                    {selectedCampaign.status !== 'ACTIVE' ? (
                      <button type="button" disabled={busy} onClick={() => void activateCampaign(selectedCampaign.id)} className="whitespace-nowrap rounded-md bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-forest-700 active:bg-forest-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-forest-700 disabled:opacity-50">
                        {busy ? 'Activating…' : 'Activate QR campaign'}
                      </button>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700"><span className="h-2 w-2 rounded-full bg-forest-600" />Active &amp; scannable</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void updateCampaignStatus(selectedCampaign.id, 'PAUSED')}
                          className="whitespace-nowrap rounded-md border border-gold-300 bg-gold-50 px-3.5 py-2 text-xs font-semibold text-gold-800 transition hover:bg-gold-100"
                        >
                          Pause campaign
                        </button>
                      </>
                    )}
                    {selectedCampaign.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateCampaignStatus(selectedCampaign.id, 'ARCHIVED')}
                        className="whitespace-nowrap rounded-md border border-ink-200 px-3.5 py-2 text-xs font-semibold text-clay-700 transition hover:border-clay-300 hover:bg-clay-50"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>

                <aside className="border-l-4 border-gold-500 bg-forest-900 p-5 text-cream-50">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">Before you print</p>
                  <ul className="mt-4 list-disc space-y-3 pl-4 text-sm leading-5 text-cream-100 marker:text-gold-400">
                    <li>Test with two different phones.</li>
                    <li>Keep a clear margin around the code.</li>
                    <li>Use SVG for large-format printing.</li>
                    <li>You can change the destination later.</li>
                  </ul>
                </aside>
              </div>
            ) : (
              <p className="mt-5 border-y border-ink-200 bg-cream-50/60 p-5 text-sm text-ink-500">Create or select a campaign before publishing.</p>
            )}
          </section>
        )}
        </div>
      </div>
    </div>
  );
}
