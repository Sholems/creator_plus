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
      </section>
    </main>
  );
}
