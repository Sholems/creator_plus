'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AdinkraMark } from '@/components/brand/adinkra';

interface Activation {
  deviceId: string;
  deviceName: string | null;
  activatedAt: string;
  lastSeenAt: string;
}
interface License {
  id: string;
  key: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  maxActivations: number;
  expiresAt: string | null;
  createdAt: string;
  activations: Activation[];
  product?: { id: string; title: string; slug: string };
  buyer?: { id: string; email: string; displayName: string | null };
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  ACTIVE: { label: 'Active', classes: 'bg-forest-100 text-forest-700' },
  SUSPENDED: { label: 'Suspended', classes: 'bg-gold-100 text-gold-700' },
  REVOKED: { label: 'Revoked', classes: 'bg-clay-100 text-clay-700' },
};

export default function CreatorLicensesPage() {
  const { token } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getCreatorLicenses(token);
      setLicenses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load licenses');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRevoke = async (lic: License) => {
    if (!token) return;
    if (!window.confirm(`Revoke license ${lic.key}? The buyer's app will stop working on all devices.`)) return;
    setBusyId(lic.id);
    setMessage('');
    try {
      await api.revokeLicense(token, lic.id);
      setLicenses((prev) => prev.map((l) => (l.id === lic.id ? { ...l, status: 'REVOKED' } : l)));
      setMessage(`License ${lic.key} revoked.`);
    } catch (err: any) {
      setError(err.message || 'Could not revoke license');
    } finally {
      setBusyId(null);
    }
  };

  const handleReset = async (lic: License) => {
    if (!token) return;
    if (!window.confirm(`Reset activations for ${lic.key}? All devices are cleared and the buyer can re-activate.`)) return;
    setBusyId(lic.id);
    setMessage('');
    try {
      await api.resetLicenseActivations(token, lic.id);
      setLicenses((prev) => prev.map((l) => (l.id === lic.id ? { ...l, activations: [] } : l)));
      setMessage(`Activations reset for ${lic.key}.`);
    } catch (err: any) {
      setError(err.message || 'Could not reset activations');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div>
        <p className="eyebrow text-gold-600">Creator studio</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Licenses</h1>
        <p className="mt-1 text-sm text-ink-500">
          License keys issued to buyers of your license-enabled products. Revoke a key or reset its
          devices if a buyer needs to move to a new machine.
        </p>
      </div>

      {error && <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>}
      {message && <div className="mt-5 rounded-xl border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800">{message}</div>}

      <div className="surface-card mt-6">
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-cream-100" />
              ))}
            </div>
          ) : licenses.length === 0 ? (
            <div className="py-14 text-center">
              <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">No licenses yet</h3>
              <p className="mt-1 text-sm text-ink-500">
                Turn on “License Keys” when creating or editing a product. Keys appear here after each sale.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {licenses.map((lic) => {
                const meta = STATUS_META[lic.status];
                const used = lic.activations.length;
                const expiry = lic.expiresAt
                  ? new Date(lic.expiresAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'Lifetime';
                const expired = lic.expiresAt ? new Date(lic.expiresAt) < new Date() : false;
                return (
                  <div key={lic.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-cream-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-ink-900">
                            {lic.key}
                          </span>
                          <button
                            onClick={() => { navigator.clipboard?.writeText(lic.key); setMessage('Key copied.'); }}
                            className="text-xs font-medium text-forest-700 hover:text-forest-600"
                          >
                            Copy
                          </button>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.classes}`}>{meta.label}</span>
                          {expired && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-500">Expired</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                          <span className="font-medium text-ink-700">{lic.product?.title || 'Product'}</span>
                          <span>{lic.buyer?.displayName || lic.buyer?.email || 'Buyer'}</span>
                          <button
                            onClick={() => setExpanded(expanded === lic.id ? null : lic.id)}
                            className="font-medium text-forest-700 hover:text-forest-600"
                          >
                            {used}/{lic.maxActivations} devices
                          </button>
                          <span>Expires {expiry}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReset(lic)}
                          disabled={busyId === lic.id || used === 0}
                          className="rounded-full border border-ink-100 px-4 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-cream-100 disabled:opacity-40"
                        >
                          Reset devices
                        </button>
                        <button
                          onClick={() => handleRevoke(lic)}
                          disabled={busyId === lic.id || lic.status === 'REVOKED'}
                          className="rounded-full border border-clay-200 px-4 py-1.5 text-xs font-semibold text-clay-600 transition-colors hover:bg-clay-50 disabled:opacity-40"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>

                    {expanded === lic.id && (
                      <div className="mt-3 rounded-xl border border-ink-100 bg-cream-50 p-3">
                        {used === 0 ? (
                          <p className="text-xs text-ink-500">No devices activated yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {lic.activations.map((a) => (
                              <li key={a.deviceId} className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate font-medium text-ink-800">{a.deviceName || a.deviceId}</span>
                                <span className="shrink-0 text-ink-400">
                                  last seen {new Date(a.lastSeenAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
