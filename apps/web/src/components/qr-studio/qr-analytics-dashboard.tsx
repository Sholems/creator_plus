'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type CampaignOption = { id: string; title: string };
type Point = { date: string; scans: number; actions: number; uniqueScans: number };
type CountItem = { label: string; count: number };
type Analytics = {
  range: { from: string; to: string };
  totals: { scans: number; uniqueScans: number; actions: number; actionRate: number };
  timeline: Point[];
  campaigns: Array<{ campaignId: string; title: string; scans: number; actions: number; actionRate: number }>;
  breakdowns: {
    devices: CountItem[];
    browsers: CountItem[];
    countries: CountItem[];
    referrers: CountItem[];
    actions: CountItem[];
  };
};

function utcDate(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function TrendChart({ points }: { points: Point[] }) {
  const width = 760;
  const height = 220;
  const pad = { top: 18, right: 14, bottom: 32, left: 44 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.flatMap((point) => [point.scans, point.actions]));
  const x = (index: number) => pad.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const y = (value: number) => pad.top + plotHeight - (value / max) * plotHeight;
  const path = (key: 'scans' | 'actions') => points.map((point, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(' ');
  const labels = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  if (!points.length || points.every((point) => point.scans === 0 && point.actions === 0)) {
    return <div className="flex h-56 items-center justify-center border border-dashed border-ink-200 bg-cream-50/40 text-sm text-ink-500">No scans in this period yet.</div>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-xs text-ink-600" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-forest-700" />Scans</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-gold-600" />Actions</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="QR scans and actions over time">
        {[0, .25, .5, .75, 1].map((ratio) => {
          const value = Math.round(max * (1 - ratio));
          const lineY = pad.top + ratio * plotHeight;
          return <g key={ratio}><line x1={pad.left} x2={width - pad.right} y1={lineY} y2={lineY} stroke="#e5e7e4" /><text x={pad.left - 8} y={lineY + 4} textAnchor="end" fontSize="10" fill="#69736d">{value}</text></g>;
        })}
        <path d={path('scans')} fill="none" stroke="#166534" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path('actions')} fill="none" stroke="#b7791f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {[...new Set(labels)].map((index) => <text key={index} x={x(index)} y={height - 8} textAnchor="middle" fontSize="10" fill="#69736d">{new Date(`${points[index].date}T00:00:00Z`).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>)}
      </svg>
      <details className="mt-2 text-xs text-ink-600">
        <summary className="cursor-pointer font-semibold text-forest-700">View chart data as a table</summary>
        <div className="mt-3 max-h-64 overflow-auto border border-ink-200">
          <table className="w-full text-left"><thead className="sticky top-0 bg-cream-50"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2 text-right">Scans</th><th className="px-3 py-2 text-right">Unique</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{points.map((point) => <tr key={point.date} className="border-t border-ink-100"><td className="px-3 py-2">{point.date}</td><td className="px-3 py-2 text-right">{point.scans}</td><td className="px-3 py-2 text-right">{point.uniqueScans}</td><td className="px-3 py-2 text-right">{point.actions}</td></tr>)}</tbody></table>
        </div>
      </details>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: CountItem[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="border-t border-ink-200 pt-4">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {rows.length ? <ol className="mt-3 space-y-3">{rows.slice(0, 6).map((row) => <li key={row.label}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-ink-600" title={row.label}>{row.label}</span><strong className="font-semibold text-ink-900">{row.count.toLocaleString()}</strong></div><div className="mt-1 h-1.5 bg-cream-100"><div className="h-full bg-forest-600" style={{ width: `${(row.count / max) * 100}%` }} /></div></li>)}</ol> : <p className="mt-3 text-xs text-ink-400">No data yet</p>}
    </section>
  );
}

export function QrAnalyticsDashboard({ token, campaigns }: { token: string; campaigns: CampaignOption[] }) {
  const [days, setDays] = useState(30);
  const [campaignId, setCampaignId] = useState('');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const params = useMemo(() => ({ from: utcDate(days - 1), to: utcDate(), campaignId: campaignId || undefined }), [days, campaignId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.getQrAnalytics(token, params)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load QR analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, params, refreshKey]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ['date', 'scans', 'unique_scanners', 'actions'],
      ...data.timeline.map((point) => [point.date, point.scans, point.uniqueScans, point.actions]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `creatorplus-qr-analytics-${data.range.from}-to-${data.range.to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="mt-6 border-y border-ink-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-ink-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Performance</p><h2 className="mt-1 font-display text-2xl font-semibold text-ink-900">QR analytics</h2><p className="mt-1 text-sm text-ink-500">Measure scans, meaningful actions, devices and campaign performance.</p></div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-ink-600">Campaign<select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="mt-1 block min-w-44 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"><option value="">All campaigns</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title}</option>)}</select></label>
          <label className="text-xs font-semibold text-ink-600">Period<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 block rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-normal text-ink-900"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
          <button type="button" disabled={!data || loading} onClick={exportCsv} className="self-end rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-forest-700 transition hover:border-forest-400 hover:bg-forest-50 disabled:cursor-not-allowed disabled:opacity-40">Export CSV</button>
        </div>
      </div>

      {error ? <div className="m-5 flex flex-wrap items-center justify-between gap-3 border-l-2 border-clay-500 bg-clay-50 px-4 py-3 text-sm text-clay-700" role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="rounded-md border border-clay-200 bg-white px-3 py-1.5 text-xs font-semibold text-clay-700 hover:bg-clay-50">Try again</button></div> : loading || !data ? <div className="grid gap-px bg-ink-100 sm:grid-cols-4" aria-label="Loading analytics">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse bg-cream-50" />)}</div> : <>
        <div className="grid gap-px bg-ink-100 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total scans', data.totals.scans.toLocaleString(), 'Every successful QR resolution'],
            ['Unique scanners', data.totals.uniqueScans.toLocaleString(), 'Daily privacy-safe estimate'],
            ['Actions', data.totals.actions.toLocaleString(), 'Clicks, opens and contact actions'],
            ['Action rate', `${data.totals.actionRate.toFixed(1)}%`, 'Actions divided by scans'],
          ].map(([label, value, note]) => <div key={label} className="bg-white px-5 py-5 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p><p className="mt-2 font-display text-3xl font-semibold text-ink-900">{value}</p><p className="mt-1 text-xs text-ink-500">{note}</p></div>)}
        </div>

        <div className="grid gap-8 px-5 py-7 sm:px-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,.8fr)]">
          <section><div className="mb-4 flex items-center justify-between gap-4"><h3 className="font-display text-lg font-semibold text-ink-900">Activity over time</h3><span className="text-xs text-ink-400">{data.range.from} — {data.range.to}</span></div><TrendChart points={data.timeline} /></section>
          <div className="grid content-start gap-6 sm:grid-cols-2 xl:grid-cols-1"><Breakdown title="Devices" rows={data.breakdowns.devices} /><Breakdown title="Top countries" rows={data.breakdowns.countries} /></div>
        </div>

        <div className="grid gap-6 border-t border-ink-200 px-5 py-7 sm:px-8 lg:grid-cols-3"><Breakdown title="Browsers" rows={data.breakdowns.browsers} /><Breakdown title="Referrers" rows={data.breakdowns.referrers} /><Breakdown title="Actions" rows={data.breakdowns.actions} /></div>

        <section className="border-t border-ink-200 px-5 py-7 sm:px-8"><h3 className="font-display text-lg font-semibold text-ink-900">Campaign performance</h3>{data.campaigns.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><thead><tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-400"><th className="pb-3 font-semibold">Campaign</th><th className="pb-3 text-right font-semibold">Scans</th><th className="pb-3 text-right font-semibold">Actions</th><th className="pb-3 text-right font-semibold">Action rate</th></tr></thead><tbody>{data.campaigns.map((campaign) => <tr key={campaign.campaignId} className="border-b border-ink-100"><td className="py-3 font-medium text-ink-900">{campaign.title}</td><td className="py-3 text-right text-ink-600">{campaign.scans.toLocaleString()}</td><td className="py-3 text-right text-ink-600">{campaign.actions.toLocaleString()}</td><td className="py-3 text-right font-semibold text-forest-700">{campaign.actionRate.toFixed(1)}%</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-ink-500">No campaign activity in this period.</p>}</section>
      </>}
    </section>
  );
}
