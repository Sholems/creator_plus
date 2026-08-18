'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const inputClass =
  'mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

interface TrackingConfig {
  trackingEnabled: boolean;
  facebookPixelId: string;
  ga4MeasurementId: string;
  gtmContainerId: string;
  tiktokPixelId: string;
  twitterPixelId: string;
  hotjarId: string;
  customHeadScript: string;
}

export default function AdminTrackingPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<TrackingConfig>({
    trackingEnabled: true,
    facebookPixelId: '',
    ga4MeasurementId: '',
    gtmContainerId: '',
    tiktokPixelId: '',
    twitterPixelId: '',
    hotjarId: '',
    customHeadScript: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (token) loadConfig();
  }, [token]);

  const loadConfig = async () => {
    if (!token) return;
    try {
      const data = await api.adminGetTracking(token);
      setConfig({
        trackingEnabled: data.trackingEnabled !== false,
        facebookPixelId: data.facebookPixelId || '',
        ga4MeasurementId: data.ga4MeasurementId || '',
        gtmContainerId: data.gtmContainerId || '',
        tiktokPixelId: data.tiktokPixelId || '',
        twitterPixelId: data.twitterPixelId || '',
        hotjarId: data.hotjarId || '',
        customHeadScript: data.customHeadScript || '',
      });
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || 'Failed to load tracking settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await api.adminUpdateTracking(token, config);
      setMessage({ ok: true, text: 'Tracking settings saved successfully.' });
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || 'Failed to save tracking settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof TrackingConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  if (isLoading) {
    return (
      <div>
        <p className="eyebrow text-gold-600">Admin</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">Tracking & Analytics</h1>
        <div className="mt-8 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-cream-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-gold-600">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900">
            Tracking & Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Configure analytics pixels, tag managers, and tracking scripts.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            message.ok
              ? 'border border-forest-200 bg-forest-50 text-forest-800'
              : 'border border-clay-200 bg-clay-50 text-clay-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="mt-8 max-w-3xl space-y-6">
        {/* Master toggle */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Tracking</h2>
              <p className="mt-1 text-sm text-ink-500">
                Master switch — disable to stop all tracking scripts from loading.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField('trackingEnabled', !config.trackingEnabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                config.trackingEnabled ? 'bg-forest-600' : 'bg-ink-200'
              }`}
              role="switch"
              aria-checked={config.trackingEnabled}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform mt-1 ${
                  config.trackingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Facebook Pixel */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1877F2]/10">
              <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Facebook Pixel</h3>
              <p className="text-xs text-ink-500">Track conversions from Facebook ads</p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="facebookPixelId" className="block text-sm font-medium text-ink-700">
              Pixel ID
            </label>
            <input
              type="text"
              id="facebookPixelId"
              value={config.facebookPixelId}
              onChange={(e) => updateField('facebookPixelId', e.target.value)}
              className={inputClass}
              placeholder="e.g. 123456789012345"
            />
          </div>
        </div>

        {/* Google Analytics 4 */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F4B400]/10">
              <svg className="h-5 w-5 text-[#F4B400]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.83 1.42c.52-.3 1.1-.42 1.67-.42 2.2 0 4 1.8 4 4s-1.8 4-4 4c-.58 0-1.15-.12-1.67-.42L7.2 12.6c.52.3 1.1.42 1.67.42 2.2 0 4-1.8 4-4s-1.8-4-4-4c-.58 0-1.15.12-1.67.42L11.83 1.42zM5.5 14c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm13-6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Google Analytics 4</h3>
              <p className="text-xs text-ink-500">Measure website traffic and user behavior</p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="ga4MeasurementId" className="block text-sm font-medium text-ink-700">
              Measurement ID
            </label>
            <input
              type="text"
              id="ga4MeasurementId"
              value={config.ga4MeasurementId}
              onChange={(e) => updateField('ga4MeasurementId', e.target.value)}
              className={inputClass}
              placeholder="e.g. G-XXXXXXXXXX"
            />
          </div>
        </div>

        {/* Google Tag Manager */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4285F4]/10">
              <svg className="h-5 w-5 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Google Tag Manager</h3>
              <p className="text-xs text-ink-500">Manage all your tags in one place</p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="gtmContainerId" className="block text-sm font-medium text-ink-700">
              Container ID
            </label>
            <input
              type="text"
              id="gtmContainerId"
              value={config.gtmContainerId}
              onChange={(e) => updateField('gtmContainerId', e.target.value)}
              className={inputClass}
              placeholder="e.g. GTM-XXXXXXX"
            />
          </div>
        </div>

        {/* TikTok Pixel */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <span className="text-lg">🎵</span>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">TikTok Pixel</h3>
              <p className="text-xs text-ink-500">Track conversions from TikTok ads</p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="tiktokPixelId" className="block text-sm font-medium text-ink-700">
              Pixel ID
            </label>
            <input
              type="text"
              id="tiktokPixelId"
              value={config.tiktokPixelId}
              onChange={(e) => updateField('tiktokPixelId', e.target.value)}
              className={inputClass}
              placeholder="e.g. Cxxxxxxxxxxxxxxxxx"
            />
          </div>
        </div>

        {/* Twitter/X Pixel */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <svg className="h-4 w-4 text-ink-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Twitter / X Pixel</h3>
              <p className="text-xs text-ink-500">Track conversions from Twitter/X ads</p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="twitterPixelId" className="block text-sm font-medium text-ink-700">
              Pixel ID
            </label>
            <input
              type="text"
              id="twitterPixelId"
              value={config.twitterPixelId}
              onChange={(e) => updateField('twitterPixelId', e.target.value)}
              className={inputClass}
              placeholder="e.g. o8abc"
            />
          </div>
        </div>

        {/* Hotjar */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF3C00]/10">
              <span className="text-lg">🔥</span>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Hotjar</h3>
              <p className="text-xs text-ink-500">Heatmaps, session recordings, and feedback</p>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="hotjarId" className="block text-sm font-medium text-ink-700">
              Site ID
            </label>
            <input
              type="text"
              id="hotjarId"
              value={config.hotjarId}
              onChange={(e) => updateField('hotjarId', e.target.value)}
              className={inputClass}
              placeholder="e.g. 1234567"
            />
          </div>
        </div>

        {/* Custom head script */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
          <h2 className="font-display text-lg font-semibold text-ink-900">Custom Head Script</h2>
          <p className="mt-1 text-sm text-ink-500">
            Inject a custom &lt;script&gt; tag into every page&apos;s &lt;head&gt;. Use for any tracking service not listed above.
          </p>
          <div className="mt-4">
            <label htmlFor="customHeadScript" className="block text-sm font-medium text-ink-700">
              Script content (raw HTML)
            </label>
            <textarea
              id="customHeadScript"
              value={config.customHeadScript}
              onChange={(e) => updateField('customHeadScript', e.target.value)}
              rows={8}
              className={`${inputClass} font-mono text-xs`}
              placeholder='&lt;script&gt;console.log("tracking loaded");&lt;/script&gt;'
            />
            <p className="mt-1 text-xs text-ink-400">
              This will be injected as-is. Only paste trusted scripts.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Tracking Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
