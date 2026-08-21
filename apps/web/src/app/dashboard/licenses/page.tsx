'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  product?: { id: string; title: string; slug: string; thumbnail?: string | null };
}

export default function MyLicensesPage() {
  const { token } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getMyLicenses(token);
      setLicenses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your licenses');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const copyKey = (key: string) => {
    navigator.clipboard?.writeText(key);
    setMessage('License key copied.');
    setTimeout(() => setMessage(''), 2500);
  };

  const removeDevice = async (lic: License, deviceId: string) => {
    if (!token) return;
    if (!window.confirm('Deactivate this device? It frees a slot so you can activate another device.')) return;
    const busyKey = `${lic.id}:${deviceId}`;
    setBusy(busyKey);
    setMessage('');
    try {
      await api.deactivateLicenseDevice(token, lic.id, deviceId);
      setLicenses((prev) =>
        prev.map((l) =>
          l.id === lic.id ? { ...l, activations: l.activations.filter((a) => a.deviceId !== deviceId) } : l,
        ),
      );
      setMessage('Device deactivated.');
    } catch (err: any) {
      setError(err.message || 'Could not deactivate device');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div>
        <p className="eyebrow text-gold-600">Buyer dashboard</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">My Licenses</h1>
        <p className="mt-1 text-sm text-ink-500">
          License keys for the apps you&apos;ve bought. Enter a key in the app to activate it, and manage
          your devices here — deactivate one to free a slot for a new device.
        </p>
      </div>

      {error && <div className="mt-5 rounded-xl border border-clay-200 bg-clay-50 p-4 text-sm text-clay-700">{error}</div>}
      {message && <div className="mt-5 rounded-xl border border-forest-200 bg-forest-50 p-4 text-sm text-forest-800">{message}</div>}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-cream-100" />)
        ) : licenses.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <AdinkraMark className="mx-auto h-10 w-10 text-ink-200" />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">No licenses yet</h3>
            <p className="mt-1 text-sm text-ink-500">
              When you buy a product that uses license keys, your key and devices appear here.
            </p>
            <Link href="/products" className="mt-4 inline-block font-semibold text-forest-700 hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          licenses.map((lic) => {
            const used = lic.activations.length;
            const expiry = lic.expiresAt
              ? new Date(lic.expiresAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
              : 'Lifetime';
            const expired = lic.expiresAt ? new Date(lic.expiresAt) < new Date() : false;
            const revoked = lic.status === 'REVOKED';
            return (
              <div key={lic.id} className="surface-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    {lic.product?.slug ? (
                      <Link href={`/products/${lic.product.slug}`} className="font-display text-lg font-semibold text-ink-900 hover:text-forest-700">
                        {lic.product?.title}
                      </Link>
                    ) : (
                      <span className="font-display text-lg font-semibold text-ink-900">{lic.product?.title || 'Product'}</span>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-cream-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-ink-900">
                        {lic.key}
                      </span>
                      <button onClick={() => copyKey(lic.key)} className="text-xs font-medium text-forest-700 hover:text-forest-600">
                        Copy
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-500">
                      <span>{used}/{lic.maxActivations} devices used</span>
                      <span>Expires {expiry}</span>
                      {revoked && <span className="font-medium text-clay-600">Revoked</span>}
                      {expired && !revoked && <span className="font-medium text-ink-500">Expired</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-ink-100 pt-4">
                  <p className="text-xs font-medium text-ink-600">Your devices</p>
                  {used === 0 ? (
                    <p className="mt-2 text-sm text-ink-400">No devices activated yet. Enter your key in the app to activate.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-ink-100">
                      {lic.activations.map((a) => (
                        <li key={a.deviceId} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-800">{a.deviceName || a.deviceId}</p>
                            <p className="text-xs text-ink-400">
                              Activated {new Date(a.activatedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} ·
                              last seen {new Date(a.lastSeenAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <button
                            onClick={() => removeDevice(lic, a.deviceId)}
                            disabled={busy === `${lic.id}:${a.deviceId}`}
                            className="shrink-0 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-cream-100 disabled:opacity-50"
                          >
                            {busy === `${lic.id}:${a.deviceId}` ? 'Removing…' : 'Deactivate'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
