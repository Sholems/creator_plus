'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Switch } from '@/components/switch';

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

const DEFAULTS: TrackingConfig = {
  trackingEnabled: true,
  facebookPixelId: '',
  ga4MeasurementId: '',
  gtmContainerId: '',
  tiktokPixelId: '',
  twitterPixelId: '',
  hotjarId: '',
  customHeadScript: '',
};

export default function AdminTrackingPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<TrackingConfig>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .getTracking(token)
      .then((r) => {
        setConfig({
          trackingEnabled: r.trackingEnabled !== false,
          facebookPixelId: r.facebookPixelId || '',
          ga4MeasurementId: r.ga4MeasurementId || '',
          gtmContainerId: r.gtmContainerId || '',
          tiktokPixelId: r.tiktokPixelId || '',
          twitterPixelId: r.twitterPixelId || '',
          hotjarId: r.hotjarId || '',
          customHeadScript: r.customHeadScript || '',
        });
        setLoaded(true);
      })
      .catch(() => toast('Could not load tracking settings', 'error'));
  }, [token]);

  const update = (field: keyof TrackingConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.updateTracking(token, config);
      toast('Tracking settings saved — changes are live immediately.');
    } catch (e: any) {
      toast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow text-gold-600">Configuration</p>
        <h1 className="page-title mt-1">Tracking & Analytics</h1>
        <p className="mt-1 text-sm text-ink-500">
          Configure analytics pixels, tag managers, and tracking scripts.
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Master toggle */}
        <section className="surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="eyebrow text-forest-700">Tracking</h2>
              <p className="mt-1 text-xs text-ink-500">
                Master switch — disable to stop all tracking scripts from loading.
              </p>
            </div>
            <Switch
              checked={config.trackingEnabled}
              onChange={() => update('trackingEnabled', !config.trackingEnabled)}
              disabled={!loaded}
            />
          </div>
        </section>

        {/* Facebook Pixel */}
        <section className="surface-card p-6">
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
            <label className="block text-sm font-medium text-ink-700">Pixel ID</label>
            <input
              type="text"
              value={config.facebookPixelId}
              onChange={(e) => update('facebookPixelId', e.target.value)}
              className="input mt-1.5"
              placeholder="e.g. 123456789012345"
            />
          </div>
        </section>

        {/* Google Analytics 4 */}
        <section className="surface-card p-6">
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
            <label className="block text-sm font-medium text-ink-700">Measurement ID</label>
            <input
              type="text"
              value={config.ga4MeasurementId}
              onChange={(e) => update('ga4MeasurementId', e.target.value)}
              className="input mt-1.5"
              placeholder="e.g. G-XXXXXXXXXX"
            />
          </div>
        </section>

        {/* Google Tag Manager */}
        <section className="surface-card p-6">
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
            <label className="block text-sm font-medium text-ink-700">Container ID</label>
            <input
              type="text"
              value={config.gtmContainerId}
              onChange={(e) => update('gtmContainerId', e.target.value)}
              className="input mt-1.5"
              placeholder="e.g. GTM-XXXXXXX"
            />
          </div>
        </section>

        {/* TikTok Pixel */}
        <section className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <svg className="h-5 w-5 text-ink-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.38-6.22V9.4a8.16 8.16 0 0 0 4.84 1.58V7.53a4.85 4.85 0 0 1-1-.84z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">TikTok Pixel</h3>
              <p className="text-xs text-ink-500">Track conversions from TikTok ads</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-700">Pixel ID</label>
            <input
              type="text"
              value={config.tiktokPixelId}
              onChange={(e) => update('tiktokPixelId', e.target.value)}
              className="input mt-1.5"
              placeholder="e.g. Cxxxxxxxxxxxxxxxxx"
            />
          </div>
        </section>

        {/* Twitter/X Pixel */}
        <section className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <svg className="h-4 w-4 text-ink-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Twitter / X Pixel</h3>
              <p className="text-xs text-ink-500">Track conversions from Twitter/X ads</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-700">Pixel ID</label>
            <input
              type="text"
              value={config.twitterPixelId}
              onChange={(e) => update('twitterPixelId', e.target.value)}
              className="input mt-1.5"
              placeholder="e.g. o8abc"
            />
          </div>
        </section>

        {/* Hotjar */}
        <section className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF3C00]/10">
              <svg className="h-5 w-5 text-[#FF3C00]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">Hotjar</h3>
              <p className="text-xs text-ink-500">Heatmaps, session recordings, and feedback</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-700">Site ID</label>
            <input
              type="text"
              value={config.hotjarId}
              onChange={(e) => update('hotjarId', e.target.value)}
              className="input mt-1.5"
              placeholder="e.g. 1234567"
            />
          </div>
        </section>

        {/* Custom head script */}
        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Custom Head Script</h2>
          <p className="mt-1 text-xs text-ink-500">
            Inject a custom &lt;script&gt; tag into every page&apos;s &lt;head&gt;. Use for any tracking service not listed above.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-700">Script content (raw HTML)</label>
            <textarea
              value={config.customHeadScript}
              onChange={(e) => update('customHeadScript', e.target.value)}
              rows={8}
              className="input mt-1.5 font-mono text-xs"
              placeholder='<script>console.log("tracking loaded");</script>'
            />
            <p className="mt-1 text-xs text-ink-400">
              This will be injected as-is. Only paste trusted scripts.
            </p>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            className="btn btn-primary btn-md"
            onClick={save}
            disabled={saving || !loaded}
          >
            {saving ? 'Saving…' : 'Save Tracking Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
