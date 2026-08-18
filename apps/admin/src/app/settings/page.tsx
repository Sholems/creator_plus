'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Switch } from '@/components/switch';

interface PaystackSettings {
  enabled: boolean;
  hasSecretKey: boolean;
  secretKeyPreview: string | null;
  publicKey: string | null;
  source: string;
}

interface PlatformSettings {
  commissionRate: number;
  minPayoutAmount: number;
  holdingPeriodDays: number;
  maxFileSize: number;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPercentage: number;
  environment: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULTS: PlatformSettings = {
  commissionRate: 10,
  minPayoutAmount: 10000,
  holdingPeriodDays: 14,
  maxFileSize: 100,
  maintenanceMode: false,
  registrationEnabled: true,
};

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Paystack payment configuration (backed by the API) ---
  const [paystack, setPaystack] = useState<PaystackSettings | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [publicInput, setPublicInput] = useState('');
  const [savingPaystack, setSavingPaystack] = useState(false);
  const [paystackMsg, setPaystackMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // --- Feature flags ---
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [newFlag, setNewFlag] = useState({ name: '', description: '', isEnabled: false, rolloutPercentage: 100 });
  const [creatingFlag, setCreatingFlag] = useState(false);
  const [busyFlagId, setBusyFlagId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getPlatformSettings(token)
      .then((r) => {
        setSettings({ ...DEFAULTS, ...r });
        setLoaded(true);
      })
      .catch(() => toast('Could not load platform settings', 'error'));
    api
      .getPaymentSettings(token)
      .then((r) => {
        setPaystack(r.paystack);
        setPublicInput(r.paystack.publicKey || '');
      })
      .catch(() => setPaystackMsg({ ok: false, text: 'Could not load payment settings' }));
    loadFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadFlags = () => {
    if (!token) return;
    api
      .getFeatureFlags(token)
      .then((r) => setFlags(r || []))
      .catch(() => toast('Could not load feature flags', 'error'));
  };

  const setNumber = (key: 'commissionRate' | 'minPayoutAmount' | 'holdingPeriodDays' | 'maxFileSize', value: string) => {
    setSettings({ ...settings, [key]: Math.max(0, parseInt(value) || 0) });
  };

  const savePlatform = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const r = await api.updatePlatformSettings(token, settings);
      setSettings({ ...DEFAULTS, ...r });
      toast('Platform settings saved');
    } catch (e: any) {
      toast(e.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePaystackEnabled = () =>
    setPaystack((p) => (p ? { ...p, enabled: !p.enabled } : p));

  const savePaystack = async () => {
    if (!token) return;
    setSavingPaystack(true);
    setPaystackMsg(null);
    try {
      const r = await api.updatePaystack(token, {
        secretKey: secretInput.trim() || undefined,
        publicKey: publicInput.trim(),
        enabled: paystack?.enabled ?? true,
      });
      setPaystack(r.paystack);
      setSecretInput('');
      setPaystackMsg({ ok: true, text: 'Saved — changes are live immediately.' });
    } catch (e: any) {
      setPaystackMsg({ ok: false, text: e.message || 'Failed to save' });
    } finally {
      setSavingPaystack(false);
    }
  };

  const createFlag = async () => {
    if (!token || !newFlag.name.trim()) return;
    setCreatingFlag(true);
    try {
      await api.createFeatureFlag(token, {
        name: newFlag.name.trim().toLowerCase().replace(/\s+/g, '.'),
        description: newFlag.description.trim() || undefined,
        isEnabled: newFlag.isEnabled,
        rolloutPercentage: newFlag.rolloutPercentage,
      });
      setNewFlag({ name: '', description: '', isEnabled: false, rolloutPercentage: 100 });
      loadFlags();
      toast('Feature flag created');
    } catch (e: any) {
      toast(e.message || 'Failed to create flag', 'error');
    } finally {
      setCreatingFlag(false);
    }
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    if (!token) return;
    setBusyFlagId(flag.id);
    try {
      await api.updateFeatureFlag(token, flag.id, { isEnabled: !flag.isEnabled });
      loadFlags();
    } catch (e: any) {
      toast(e.message || 'Failed to toggle flag', 'error');
    } finally {
      setBusyFlagId(null);
    }
  };

  const setRollout = async (flag: FeatureFlag, rolloutPercentage: number) => {
    if (!token) return;
    setBusyFlagId(flag.id);
    try {
      await api.updateFeatureFlag(token, flag.id, { rolloutPercentage });
      loadFlags();
      toast(`Rollout set to ${rolloutPercentage}%`);
    } catch (e: any) {
      toast(e.message || 'Failed to update rollout', 'error');
    } finally {
      setBusyFlagId(null);
    }
  };

  const deleteFlag = async (flag: FeatureFlag) => {
    if (!token) return;
    setBusyFlagId(flag.id);
    try {
      await api.deleteFeatureFlag(token, flag.id);
      loadFlags();
      toast('Feature flag deleted');
    } catch (e: any) {
      toast(e.message || 'Failed to delete flag', 'error');
    } finally {
      setBusyFlagId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow text-gold-600">Configuration</p>
        <h1 className="page-title mt-1">Platform Settings</h1>
      </div>

      <div className="max-w-3xl space-y-6">
        <section className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow text-forest-700">Finance</h2>
            <span className="badge badge-green">{loaded ? 'Live · persisted' : 'Loading…'}</span>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-ink-700">Commission Rate (%)</label>
              <input type="number" value={settings.commissionRate}
                onChange={(e) => setNumber('commissionRate', e.target.value)}
                className="input mt-1.5" />
              <p className="mt-1 text-xs text-ink-500">Platform fee charged on each sale</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Minimum Payout</label>
              <input type="number" value={settings.minPayoutAmount}
                onChange={(e) => setNumber('minPayoutAmount', e.target.value)}
                className="input mt-1.5" />
              <p className="mt-1 text-xs text-ink-500">Minimum balance (₦) for creator payouts</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700">Holding Period (days)</label>
              <input type="number" value={settings.holdingPeriodDays}
                onChange={(e) => setNumber('holdingPeriodDays', e.target.value)}
                className="input mt-1.5" />
              <p className="mt-1 text-xs text-ink-500">Days before payouts are released</p>
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Payments · Paystack</h2>
          <p className="mt-1 text-xs text-ink-500">
            Keys used for checkout. Stored securely and applied immediately — no restart needed.
          </p>
          <div className="mt-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-700">Enabled</p>
                <p className="text-xs text-ink-500">
                  {paystack
                    ? paystack.hasSecretKey
                      ? `Current key: ${paystack.secretKeyPreview} (source: ${paystack.source})`
                      : 'No secret key set yet'
                    : 'Loading…'}
                </p>
              </div>
              <Switch checked={!!paystack?.enabled} onChange={togglePaystackEnabled} disabled={!paystack} />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700">Secret Key</label>
              <input
                type="password"
                autoComplete="off"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder={
                  paystack?.hasSecretKey
                    ? `${paystack.secretKeyPreview} — leave blank to keep`
                    : 'sk_live_… or sk_test_…'
                }
                className="input mt-1.5"
              />
              <p className="mt-1 text-xs text-ink-500">
                Never shown in full again after saving. Leave blank to keep the current key.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700">Public Key</label>
              <input
                type="text"
                value={publicInput}
                onChange={(e) => setPublicInput(e.target.value)}
                placeholder="pk_live_… (optional)"
                className="input mt-1.5"
              />
            </div>

            {paystackMsg && (
              <p className={`text-xs ${paystackMsg.ok ? 'text-forest-700' : 'text-red-600'}`}>
                {paystackMsg.text}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={savePaystack}
                disabled={savingPaystack || !token}
              >
                {savingPaystack ? 'Saving…' : 'Save Paystack'}
              </button>
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Products</h2>
          <div className="mt-4">
            <label className="block text-sm font-medium text-ink-700">Max File Size (MB)</label>
            <input type="number" value={settings.maxFileSize}
              onChange={(e) => setNumber('maxFileSize', e.target.value)}
              className="input mt-1.5 max-w-xs" />
            <p className="mt-1 text-xs text-ink-500">Largest file creators may upload per product</p>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Platform</h2>
          <div className="mt-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-700">Maintenance Mode</p>
                <p className="text-xs text-ink-500">Temporarily disable public access</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onChange={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                disabled={!loaded}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-700">Registration Enabled</p>
                <p className="text-xs text-ink-500">Allow new users to register</p>
              </div>
              <Switch
                checked={settings.registrationEnabled}
                onChange={() => setSettings({ ...settings, registrationEnabled: !settings.registrationEnabled })}
                disabled={!loaded}
              />
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow text-forest-700">Feature Flags</h2>
          <p className="mt-1 text-xs text-ink-500">
            Kill-switches for product surfaces. Disabled flags are reported as off to every client.
          </p>

          <div className="mt-4 space-y-4">
            {flags.map((flag) => (
              <div key={flag.id} className="rounded-xl border border-ink-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-semibold text-ink-900">{flag.name}</code>
                      <span className={`badge ${flag.isEnabled ? 'badge-green' : 'badge-gray'}`}>
                        {flag.isEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="mt-0.5 text-xs text-ink-500">{flag.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={flag.rolloutPercentage}
                        disabled={busyFlagId === flag.id}
                        onChange={(e) => setRollout(flag, parseInt(e.target.value))}
                        className="w-28"
                      />
                      <span className="w-10 text-right text-xs font-medium text-ink-600">
                        {flag.rolloutPercentage}%
                      </span>
                    </div>
                    <Switch
                      checked={flag.isEnabled}
                      onChange={() => toggleFlag(flag)}
                      disabled={busyFlagId === flag.id}
                    />
                    <button
                      onClick={() => deleteFlag(flag)}
                      disabled={busyFlagId === flag.id}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {flags.length === 0 && (
              <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                No feature flags yet. Create one below.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-cream-100/60 p-4">
            <p className="text-sm font-semibold text-ink-900">New feature flag</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-ink-500">Name (e.g. checkout.v2)</label>
                <input
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                  placeholder="checkout.v2"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500">Description</label>
                <input
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  placeholder="Optional"
                  className="input mt-1"
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-ink-500">Rollout %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newFlag.rolloutPercentage}
                    onChange={(e) => setNewFlag({ ...newFlag, rolloutPercentage: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="input mt-1"
                  />
                </div>
                <button
                  onClick={createFlag}
                  disabled={creatingFlag || !newFlag.name.trim()}
                  className="btn btn-primary btn-md"
                >
                  {creatingFlag ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            className="btn btn-primary btn-md"
            onClick={savePlatform}
            disabled={saving || !loaded}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
