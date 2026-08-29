'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const REASON_CODES = ['ABUSE_REPORT', 'POLICY_VIOLATION', 'SUPPORT_REQUEST', 'STORAGE_ISSUE'];

export default function AdminQrCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setC(await api.getQrCampaign(token, id));
    } catch (e: any) {
      setError(e.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, id]);

  const act = async (archive: boolean) => {
    if (!token) return;
    if (!window.confirm(`${archive ? 'Archive' : 'Pause'} this campaign? This is audited.`)) return;
    setBusy(true);
    setMessage('');
    try {
      await api.pauseOrArchiveQrCampaign(token, id, { reasonCode, reason: reason.trim() || undefined, archive });
      setMessage(`Campaign ${archive ? 'archived' : 'paused'}.`);
      void load();
    } catch (e: any) {
      setError(e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (error && !c) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!c) return null;

  const Row = ({ k, v }: { k: string; v: any }) => (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-medium text-gray-900">{v ?? '—'}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href={'/qr-studio' as Route} className="text-sm font-medium text-emerald-700 hover:underline">← QR campaigns</Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">{c.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {c.contentType} · {c.status} · {c.scanMode} · code {c.publicCode}
      </p>

      {message && <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-gray-900">Owner & entitlement</h2>
          <Row k="Owner" v={c.owner?.displayName || c.owner?.email} />
          <Row k="Email" v={c.owner?.email} />
          <Row k="Offer" v={c.entitlement?.offerCode} />
          <Row k="Entitlement" v={c.entitlement?.status} />
          <Row k="Expires" v={c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Lifetime'} />
          <Row k="Created" v={new Date(c.createdAt).toLocaleString()} />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 font-semibold text-gray-900">Support action</h2>
          <p className="mb-3 text-xs text-gray-500">Pause or archive for abuse/support. Private files are never shown here; every action is audited.</p>
          <label className="text-xs font-medium text-gray-600">Reason code</label>
          <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {REASON_CODES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" rows={2} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <div className="mt-3 flex gap-2">
            <button onClick={() => act(false)} disabled={busy} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">Pause</button>
            <button onClick={() => act(true)} disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Archive</button>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-gray-900">Assets ({c.assets?.length ?? 0})</h2>
        {(c.assets ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No assets.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400"><th className="py-1">File</th><th>Type</th><th>Safety</th><th>Active</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {c.assets.map((a: any) => (
                  <tr key={a.id}>
                    <td className="py-2 text-gray-800">{a.fileName}</td>
                    <td className="text-gray-500">{a.mimeType}</td>
                    <td className="text-gray-500">{a.safetyStatus}{a.safetyReason ? ` (${a.safetyReason})` : ''}</td>
                    <td className="text-gray-500">{a.active ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-gray-900">Audit trail</h2>
        {(c.adminActions ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No admin actions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {c.adminActions.map((a: any) => (
              <li key={a.id} className="text-gray-600">
                <span className="font-medium text-gray-900">{a.action}</span> · {a.reasonCode}
                {a.reason ? ` — ${a.reason}` : ''} · {a.actor?.email} · {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
