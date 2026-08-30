'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type QrCampaign = {
  id: string;
  title: string;
  publicCode: string;
  contentType: string;
  status: string;
  scanMode: string;
  owner?: { email: string; displayName?: string | null };
  entitlement?: { offerCode: string; status: string; expiresAt: string };
  assetsCount: number;
  eventsCount: number;
  createdAt: string;
  expiresAt?: string | null;
};

export default function AdminQrStudioPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token, status]);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getQrCampaigns(token, { status, search });
      setCampaigns(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Could not load QR campaigns');
    } finally {
      setLoading(false);
    }
  }

  async function safetyAction(id: string, archive = false) {
    if (!token) return;
    const reason = window.prompt(`Reason for ${archive ? 'archiving' : 'pausing'} this QR campaign?`);
    if (!reason) return;
    try {
      await api.pauseOrArchiveQrCampaign(token, id, {
        reasonCode: archive ? 'ADMIN_ARCHIVE' : 'ADMIN_PAUSE',
        reason,
        archive,
      });
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update QR campaign');
    }
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">Support visibility</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-900">QR Studio</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Inspect QR campaigns, entitlement state, and safety status. Private R2 file keys and signed URLs are not shown here.
          </p>
          <Link href={'/qr-studio/coupons' as Route} className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            Manage discount coupons →
          </Link>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-600">
          {campaigns.length} campaigns
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title, code, or owner email"
          className="flex-1 rounded-xl border border-ink-100 bg-cream-50 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-ink-100 bg-cream-50 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="EXPIRED">Expired</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-forest-800 px-4 py-2 text-sm font-semibold text-cream-50"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100 text-sm">
            <thead className="bg-cream-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entitlement</th>
                <th className="px-4 py-3">Counts</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr><td className="px-4 py-6 text-ink-500" colSpan={6}>Loading…</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td className="px-4 py-6 text-ink-500" colSpan={6}>No QR campaigns found.</td></tr>
              ) : campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{campaign.title}</p>
                    <p className="mt-1 font-mono text-xs text-ink-500">/qr/{campaign.publicCode}</p>
                    <p className="mt-1 text-xs text-ink-500">{campaign.contentType} · {campaign.scanMode}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{campaign.owner?.email || 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cream-100 px-2 py-1 text-xs font-semibold text-ink-700">
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {campaign.entitlement ? `${campaign.entitlement.offerCode} · ${campaign.entitlement.status}` : 'None'}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {campaign.assetsCount} assets · {campaign.eventsCount} events
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/qr-studio/${campaign.id}` as Route}
                        className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-cream-100"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => safetyAction(campaign.id)}
                        className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700"
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        onClick={() => safetyAction(campaign.id, true)}
                        className="rounded-full bg-clay-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
