'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

const FOREST = '#143c2b';

/** Pick a brand accent that white text still reads on; fall back to forest. */
function pickAccent(hex?: string | null): string {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return FOREST;
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.62 ? FOREST : hex.startsWith('#') ? hex : `#${hex}`;
}
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const TYPE_LABELS: Record<string, string> = {
  FILE: 'File', IMAGE_GALLERY: 'Gallery', WEBSITE: 'Website', PRODUCT_PAGE: 'Product',
  CREATOR_PROFILE: 'Profile', WHATSAPP: 'WhatsApp', SOCIAL_LINK_HUB: 'Links', TEXT_NOTE: 'Note',
  VCARD: 'Contact card', COUPON: 'Coupon', LOCATION: 'Location', EMAIL: 'Email', SMS: 'Message',
  APP_LINK: 'Get the app', VIDEO: 'Video', AUDIO: 'Audio', EVENT: 'Event', WIFI: 'Wi-Fi',
};

function TypeIcon({ type }: { type: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactElement> = {
    FILE: <><path {...p} d="M14 3v4a1 1 0 0 0 1 1h4" /><path {...p} d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /></>,
    IMAGE_GALLERY: <><rect {...p} x="3" y="3" width="18" height="18" rx="2" /><circle {...p} cx="9" cy="9" r="1.5" /><path {...p} d="m21 15-5-5L5 21" /></>,
    WEBSITE: <><circle {...p} cx="12" cy="12" r="9" /><path {...p} d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    VCARD: <><circle {...p} cx="12" cy="8" r="4" /><path {...p} d="M4 21a8 8 0 0 1 16 0" /></>,
    COUPON: <><path {...p} d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path {...p} d="M14 6v12" strokeDasharray="1 3" /></>,
    LOCATION: <><path {...p} d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle {...p} cx="12" cy="10" r="2.5" /></>,
    EMAIL: <><rect {...p} x="3" y="5" width="18" height="14" rx="2" /><path {...p} d="m3 7 9 6 9-6" /></>,
    SMS: <><path {...p} d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></>,
    WHATSAPP: <><path {...p} d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></>,
    VIDEO: <><rect {...p} x="3" y="5" width="18" height="14" rx="2" /><path {...p} d="m10 9 5 3-5 3Z" /></>,
    AUDIO: <><path {...p} d="M9 18V5l10-2v13" /><circle {...p} cx="6" cy="18" r="3" /><circle {...p} cx="16" cy="16" r="3" /></>,
    APP_LINK: <><rect {...p} x="4" y="4" width="6" height="6" rx="1.5" /><rect {...p} x="14" y="4" width="6" height="6" rx="1.5" /><rect {...p} x="4" y="14" width="6" height="6" rx="1.5" /><rect {...p} x="14" y="14" width="6" height="6" rx="1.5" /></>,
    WIFI: <><path {...p} d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" fill="currentColor" /></>,
    EVENT: <><rect {...p} x="3" y="5" width="18" height="16" rx="2" /><path {...p} d="M3 9h18M8 3v4M16 3v4" /></>,
    SOCIAL_LINK_HUB: <><circle {...p} cx="18" cy="5" r="3" /><circle {...p} cx="6" cy="12" r="3" /><circle {...p} cx="18" cy="19" r="3" /><path {...p} d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>,
    TEXT_NOTE: <><path {...p} d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path {...p} d="M8 12h8M8 16h6" /></>,
  };
  paths.PRODUCT_PAGE = paths.WEBSITE;
  paths.CREATOR_PROFILE = paths.VCARD;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      {paths[type] ?? <><circle {...p} cx="12" cy="12" r="9" /><path {...p} d="M12 8v4l3 2" /></>}
    </svg>
  );
}

export default function PublicQrPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!code) return;
    api.resolveQrCampaign(code)
      .then((result) => {
        setData(result);
        if (result?.mode === 'DIRECT_OPEN' && result.redirectUrl) {
          window.location.assign(result.redirectUrl);
        }
      })
      .catch((err) => setError(err.message || 'This QR campaign could not be loaded'))
      .finally(() => setLoading(false));
  }, [code]);

  async function openFile() {
    setOpening(true);
    setError('');
    try {
      const result = await api.openQrCampaignFile(code);
      window.location.href = result.url;
    } catch (err: any) {
      setError(err.message || 'Could not open this file');
    } finally {
      setOpening(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <p className="text-sm text-ink-600">Opening QR campaign…</p>
      </main>
    );
  }

  if (error || !data?.available) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4">
        <section className="w-full max-w-lg rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-sm">
          <p className="eyebrow text-gold-600">CreatorPlus QR</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">
            {data?.title || 'This QR is unavailable'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-600">
            {error || data?.description || 'The creator may have paused, archived, or expired this campaign.'}
          </p>
        </section>
      </main>
    );
  }

  const accent = pickAccent(data.branding?.primaryColor);

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ background: accent }} />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tint(accent, 0.12), color: accent }}>
              <TypeIcon type={data.contentType} />
            </span>
            <div>
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                {TYPE_LABELS[data.contentType] ?? 'CreatorPlus QR'}
              </p>
              {data.branding?.name && <p className="text-xs text-ink-500">by {data.branding.name}</p>}
            </div>
          </div>

          <h1 className="mt-4 font-display text-3xl font-bold text-ink-900">{data.title}</h1>
          {data.description && <p className="mt-3 text-sm leading-6 text-ink-600">{data.description}</p>}

          {data.asset && (
            <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: tint(accent, 0.12), color: accent }}><TypeIcon type="FILE" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{data.asset.fileName}</p>
                  <p className="text-xs text-ink-500">{data.asset.mimeType}{data.asset.fileSize ? ` · ${formatSize(data.asset.fileSize)}` : ''}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={opening}
                onClick={openFile}
                style={{ backgroundColor: accent }}
                className="mt-4 w-full rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {opening ? 'Preparing secure link…' : 'Open / download file'}
              </button>
              <p className="mt-3 text-xs leading-5 text-ink-500">
                CreatorPlus creates a short-lived secure file link after this campaign is checked.
              </p>
            </div>
          )}

          {!data.asset && data.destinationUrl && (
            <div className="mt-6">
              {data.externalDomain && (
                <p className="mb-2 text-center text-xs text-ink-500">
                  You are leaving CreatorPlus for <span className="font-semibold text-ink-700">{data.externalDomain}</span>.
                </p>
              )}
              <a
                href={data.destinationUrl}
                rel="noreferrer"
                style={{ backgroundColor: accent }}
                className="block rounded-full px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                Continue
              </a>
            </div>
          )}

          {!data.asset && !data.destinationUrl && data.destinationData && (
            <ContentBlock contentType={data.contentType} d={data.destinationData} title={data.title} accent={accent} />
          )}

          <p className="mt-6 text-center text-[0.7rem] text-ink-400">Powered by CreatorPlus</p>
        </div>
      </section>
    </main>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ContentBlock({ contentType, d, title, accent }: { contentType: string; d: any; title: string; accent: string }) {
  const [copied, setCopied] = useState(false);
  const primary = 'mt-4 block w-full rounded-full px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90';
  const primaryStyle = { backgroundColor: accent };
  const copy = (text: string) => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (contentType === 'TEXT_NOTE') {
    return <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-ink-100 bg-cream-50 p-4 text-sm leading-6 text-ink-800">{d.text}</div>;
  }

  if (contentType === 'SOCIAL_LINK_HUB') {
    return (
      <div className="mt-6 space-y-2">
        {(d.links ?? []).map((l: any, i: number) => (
          <a key={i} href={l.url} rel="noreferrer" className="block rounded-full border border-ink-200 bg-white px-5 py-3 text-center text-sm font-semibold text-ink-800 transition hover:bg-cream-100" style={{ borderColor: tint(accent, 0.35) }}>
            {l.label || l.url}
          </a>
        ))}
      </div>
    );
  }

  if (contentType === 'VCARD') {
    const vcf = [
      'BEGIN:VCARD', 'VERSION:3.0', `FN:${d.fullName ?? ''}`,
      d.org ? `ORG:${d.org}` : '', d.title ? `TITLE:${d.title}` : '',
      d.phone ? `TEL:${d.phone}` : '', d.email ? `EMAIL:${d.email}` : '',
      d.website ? `URL:${d.website}` : '', 'END:VCARD',
    ].filter(Boolean).join('\n');
    const href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`;
    return (
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-5 text-sm text-ink-700">
        <p className="text-lg font-semibold text-ink-900">{d.fullName}</p>
        {(d.title || d.org) && <p className="text-ink-500">{[d.title, d.org].filter(Boolean).join(' · ')}</p>}
        <div className="mt-3 space-y-1">
          {d.phone && <p><a href={`tel:${d.phone}`} className="hover:underline">{d.phone}</a></p>}
          {d.email && <p><a href={`mailto:${d.email}`} className="hover:underline">{d.email}</a></p>}
          {d.website && <a href={d.website} rel="noreferrer" className="hover:underline" style={{ color: accent }}>{d.website}</a>}
        </div>
        <a href={href} download={`${(d.fullName || 'contact').replace(/\s+/g, '-')}.vcf`} className={primary} style={primaryStyle}>Save contact</a>
      </div>
    );
  }

  if (contentType === 'COUPON') {
    return (
      <div className="mt-6 rounded-2xl border-2 border-dashed p-5 text-center" style={{ borderColor: tint(accent, 0.4), background: tint(accent, 0.06) }}>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>Your code</p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-wide text-ink-900">{d.code}</p>
        <button type="button" onClick={() => copy(d.code)} className="mt-2 text-xs font-semibold hover:underline" style={{ color: accent }}>
          {copied ? 'Copied!' : 'Tap to copy'}
        </button>
        {d.description && <p className="mt-3 text-sm text-ink-700">{d.description}</p>}
        {d.expiresAt && <p className="mt-1 text-xs text-ink-500">Expires {d.expiresAt}</p>}
        {d.ctaUrl && <a href={d.ctaUrl} rel="noreferrer" className={primary} style={primaryStyle}>Shop now</a>}
      </div>
    );
  }

  if (contentType === 'EMAIL') {
    const q = [d.subject ? `subject=${encodeURIComponent(d.subject)}` : '', d.body ? `body=${encodeURIComponent(d.body)}` : ''].filter(Boolean).join('&');
    return (
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4 text-center">
        <p className="text-sm font-medium text-ink-800">{d.email}</p>
        {d.subject && <p className="mt-1 text-xs text-ink-500">Subject: {d.subject}</p>}
        <a href={`mailto:${d.email}${q ? `?${q}` : ''}`} className={primary} style={primaryStyle}>Send email</a>
      </div>
    );
  }

  if (contentType === 'SMS') {
    return (
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4 text-center">
        <p className="text-sm font-medium text-ink-800">{d.phone}</p>
        {d.message && <p className="mt-1 text-xs text-ink-500">“{d.message}”</p>}
        <a href={`sms:${d.phone}${d.message ? `?body=${encodeURIComponent(d.message)}` : ''}`} className={primary} style={primaryStyle}>Send SMS</a>
      </div>
    );
  }

  if (contentType === 'VIDEO') {
    const embed = videoEmbed(d.url);
    return (
      <div className="mt-6">
        {embed ? (
          <div className="aspect-video overflow-hidden rounded-2xl border border-ink-100">
            <iframe src={embed} title={title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <a href={d.url} rel="noreferrer" className={primary} style={primaryStyle}>Watch video</a>
        )}
      </div>
    );
  }

  if (contentType === 'AUDIO') {
    const embed = spotifyEmbed(d.url);
    return (
      <div className="mt-6">
        {embed ? (
          <iframe src={embed} title={title} className="w-full rounded-2xl" height={152} allow="encrypted-media" />
        ) : (
          <a href={d.url} rel="noreferrer" className={primary} style={primaryStyle}>Listen</a>
        )}
      </div>
    );
  }

  if (contentType === 'APP_LINK') {
    const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const main = isIos ? d.iosUrl : isAndroid ? d.androidUrl : d.webUrl || d.iosUrl || d.androidUrl;
    return (
      <div className="mt-6 space-y-2">
        {main && <a href={main} rel="noreferrer" className={primary + ' mt-0'} style={primaryStyle}>Get the app</a>}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {d.iosUrl && <a href={d.iosUrl} rel="noreferrer" className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100">App Store</a>}
          {d.androidUrl && <a href={d.androidUrl} rel="noreferrer" className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100">Google Play</a>}
          {d.webUrl && <a href={d.webUrl} rel="noreferrer" className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100">Open on web</a>}
        </div>
      </div>
    );
  }

  if (contentType === 'WIFI') {
    return (
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-5 text-sm text-ink-700">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-3">
          <span className="text-ink-500">Network</span>
          <span className="font-mono font-semibold text-ink-900">{d.ssid}</span>
        </div>
        {d.password && (
          <div className="flex items-center justify-between gap-3 pt-3">
            <span className="text-ink-500">Password</span>
            <button type="button" onClick={() => copy(d.password)} className="font-mono font-semibold hover:underline" style={{ color: accent }}>
              {copied ? 'Copied!' : d.password}
            </button>
          </div>
        )}
        {d.encryption === 'nopass'
          ? <p className="mt-3 text-xs text-ink-500">Open network — no password needed.</p>
          : d.password && <p className="mt-3 text-xs text-ink-500">Tap the password to copy, then join “{d.ssid}” in your Wi-Fi settings.</p>}
      </div>
    );
  }

  return null;
}

function videoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch { /* ignore */ }
  return null;
}

function spotifyEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('spotify.com')) {
      return `https://open.spotify.com${u.pathname.replace(/^\/(track|album|playlist|episode|show)\//, '/embed/$1/')}`;
    }
  } catch { /* ignore */ }
  return null;
}
