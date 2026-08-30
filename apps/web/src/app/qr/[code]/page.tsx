'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

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

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="eyebrow text-gold-600">CreatorPlus QR</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">{data.title}</h1>
        {data.description && <p className="mt-3 text-sm leading-6 text-ink-600">{data.description}</p>}

        {data.branding?.name && (
          <div className="mt-5 rounded-2xl bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-800">
            Presented by {data.branding.name}
          </div>
        )}

        {data.asset && (
          <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4">
            <p className="text-sm font-semibold text-ink-900">{data.asset.fileName}</p>
            <p className="mt-1 text-xs text-ink-500">{data.asset.mimeType}</p>
            <button
              type="button"
              disabled={opening}
              onClick={openFile}
              className="mt-4 w-full rounded-full bg-forest-800 px-5 py-3 text-sm font-semibold text-cream-50 hover:bg-forest-700 disabled:opacity-50"
            >
              {opening ? 'Preparing secure link…' : 'Open / download file'}
            </button>
            <p className="mt-3 text-xs leading-5 text-ink-500">
              CreatorPlus creates a short-lived secure file link after this campaign is checked.
            </p>
          </div>
        )}

        {!data.asset && data.destinationUrl && (
          <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4">
            {data.externalDomain && (
              <p className="text-xs text-ink-500">
                You are leaving CreatorPlus for {data.externalDomain}.
              </p>
            )}
            <a
              href={data.destinationUrl}
              rel="noreferrer"
              className="mt-3 block rounded-full bg-forest-800 px-5 py-3 text-center text-sm font-semibold text-cream-50 hover:bg-forest-700"
            >
              Continue
            </a>
          </div>
        )}

        {!data.asset && !data.destinationUrl && data.destinationData && (
          <ContentBlock contentType={data.contentType} d={data.destinationData} title={data.title} />
        )}
      </section>
    </main>
  );
}

const btn = 'mt-4 block w-full rounded-full bg-forest-800 px-5 py-3 text-center text-sm font-semibold text-cream-50 hover:bg-forest-700';

function ContentBlock({ contentType, d, title }: { contentType: string; d: any; title: string }) {
  const [copied, setCopied] = useState(false);

  if (contentType === 'TEXT_NOTE') {
    return <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-ink-100 bg-cream-50 p-4 text-sm leading-6 text-ink-800">{d.text}</div>;
  }

  if (contentType === 'SOCIAL_LINK_HUB') {
    return (
      <div className="mt-6 space-y-2">
        {(d.links ?? []).map((l: any, i: number) => (
          <a key={i} href={l.url} rel="noreferrer" className="block rounded-full border border-ink-200 bg-white px-5 py-3 text-center text-sm font-semibold text-forest-800 hover:bg-cream-100">
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
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4 text-sm text-ink-700">
        <p className="text-base font-semibold text-ink-900">{d.fullName}</p>
        {(d.title || d.org) && <p className="text-ink-500">{[d.title, d.org].filter(Boolean).join(' · ')}</p>}
        {d.phone && <p className="mt-2">{d.phone}</p>}
        {d.email && <p>{d.email}</p>}
        {d.website && <a href={d.website} rel="noreferrer" className="text-forest-700 hover:underline">{d.website}</a>}
        <a href={href} download={`${(d.fullName || 'contact').replace(/\s+/g, '-')}.vcf`} className={btn}>Save contact</a>
      </div>
    );
  }

  if (contentType === 'COUPON') {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-forest-300 bg-forest-50 p-5 text-center">
        <p className="eyebrow text-forest-600">Your code</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-forest-900">{d.code}</p>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(d.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="mt-2 text-xs font-semibold text-forest-700 hover:underline">
          {copied ? 'Copied!' : 'Copy code'}
        </button>
        {d.description && <p className="mt-3 text-sm text-ink-700">{d.description}</p>}
        {d.expiresAt && <p className="mt-1 text-xs text-ink-500">Expires {d.expiresAt}</p>}
        {d.ctaUrl && <a href={d.ctaUrl} rel="noreferrer" className={btn}>Shop now</a>}
      </div>
    );
  }

  if (contentType === 'EMAIL') {
    const q = [d.subject ? `subject=${encodeURIComponent(d.subject)}` : '', d.body ? `body=${encodeURIComponent(d.body)}` : ''].filter(Boolean).join('&');
    return (
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4 text-center">
        <p className="text-sm text-ink-700">{d.email}</p>
        <a href={`mailto:${d.email}${q ? `?${q}` : ''}`} className={btn}>Send email</a>
      </div>
    );
  }

  if (contentType === 'SMS') {
    return (
      <div className="mt-6 rounded-2xl border border-ink-100 bg-cream-50 p-4 text-center">
        <p className="text-sm text-ink-700">{d.phone}</p>
        <a href={`sms:${d.phone}${d.message ? `?body=${encodeURIComponent(d.message)}` : ''}`} className={btn}>Send SMS</a>
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
          <a href={d.url} rel="noreferrer" className={btn}>Watch video</a>
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
          <a href={d.url} rel="noreferrer" className={btn}>Listen</a>
        )}
      </div>
    );
  }

  if (contentType === 'APP_LINK') {
    const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const primary = isIos ? d.iosUrl : isAndroid ? d.androidUrl : d.webUrl || d.iosUrl || d.androidUrl;
    return (
      <div className="mt-6 space-y-2">
        {primary && <a href={primary} rel="noreferrer" className={btn}>Get the app</a>}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {d.iosUrl && <a href={d.iosUrl} rel="noreferrer" className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100">App Store</a>}
          {d.androidUrl && <a href={d.androidUrl} rel="noreferrer" className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100">Google Play</a>}
          {d.webUrl && <a href={d.webUrl} rel="noreferrer" className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-cream-100">Open on web</a>}
        </div>
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
