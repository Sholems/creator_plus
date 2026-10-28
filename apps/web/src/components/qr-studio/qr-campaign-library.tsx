'use client';

import { useMemo, useState } from 'react';
import { cn } from '@creatorplus/ui';
import type { QrCampaign } from './qr-campaign-types';

type Props = {
  campaigns: QrCampaign[];
  busy: boolean;
  onCreate: () => void;
  onEdit: (campaign: QrCampaign) => void;
  onDuplicate: (campaign: QrCampaign) => Promise<void>;
  onBulkAction: (ids: string[], action: 'PAUSE' | 'ARCHIVE') => Promise<void>;
};

const controlClass =
  'h-10 rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function QrCampaignLibrary({
  campaigns,
  busy,
  onCreate,
  onEdit,
  onDuplicate,
  onBulkAction,
}: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [contentType, setContentType] = useState('ALL');
  const [folder, setFolder] = useState('ALL');
  const [sort, setSort] = useState('UPDATED_DESC');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const contentTypes = useMemo(
    () => [...new Set(campaigns.map((campaign) => campaign.contentType))].sort(),
    [campaigns],
  );
  const folders = useMemo(
    () =>
      [...new Set(campaigns.map((campaign) => campaign.folder).filter(Boolean) as string[])].sort(),
    [campaigns],
  );
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = campaigns.filter((campaign) => {
      const haystack = [
        campaign.title,
        campaign.contentType,
        campaign.folder,
        ...(campaign.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (status === 'ALL' || campaign.status === status) &&
        (contentType === 'ALL' || campaign.contentType === contentType) &&
        (folder === 'ALL' || campaign.folder === folder)
      );
    });
    return filtered.sort((a, b) => {
      if (sort === 'NAME_ASC') return a.title.localeCompare(b.title);
      if (sort === 'SCANS_DESC') return (b.scanCount ?? 0) - (a.scanCount ?? 0);
      if (sort === 'LAST_SCAN_DESC')
        return new Date(b.lastScannedAt ?? 0).getTime() - new Date(a.lastScannedAt ?? 0).getTime();
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
  }, [campaigns, contentType, folder, search, sort, status]);

  const selectableVisible = visible.filter((campaign) => campaign.status !== 'ARCHIVED');
  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectableVisible.every((campaign) => selected.has(campaign.id));
  const hasSelectedActive = campaigns.some(
    (campaign) => selected.has(campaign.id) && campaign.status === 'ACTIVE',
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) selectableVisible.forEach((campaign) => next.delete(campaign.id));
      else selectableVisible.forEach((campaign) => next.add(campaign.id));
      return next;
    });
  }

  async function runBulk(action: 'PAUSE' | 'ARCHIVE') {
    const ids = [...selected];
    if (!ids.length) return;
    if (
      action === 'ARCHIVE' &&
      !window.confirm(
        `Archive ${ids.length} selected campaign${ids.length === 1 ? '' : 's'}? Their QR links will stop working.`,
      )
    )
      return;
    await onBulkAction(ids, action);
    setSelected(new Set());
  }

  return (
    <section className="mt-6 border-y border-ink-200 bg-white" aria-labelledby="qr-library-heading">
      <header className="flex flex-col gap-4 border-b border-ink-200 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-forest-700">
            Campaign operations
          </p>
          <h2
            id="qr-library-heading"
            className="mt-1 font-display text-2xl font-semibold text-ink-900"
          >
            QR campaign library
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Find, compare, organize, duplicate, pause, or archive your stable QR campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="min-h-11 rounded-md bg-forest-800 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
        >
          Create QR campaign
        </button>
      </header>

      <div className="grid gap-3 border-b border-ink-200 bg-cream-50/40 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:p-5">
        <label className="sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search campaigns</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, tag or folder"
            className={`${controlClass} w-full`}
          />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={`${controlClass} w-full`}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Content type</span>
          <select
            value={contentType}
            onChange={(event) => setContentType(event.target.value)}
            className={`${controlClass} w-full`}
          >
            <option value="ALL">All content</option>
            {contentTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Folder</span>
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            className={`${controlClass} w-full`}
          >
            <option value="ALL">All folders</option>
            {folders.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort campaigns</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className={`${controlClass} w-full`}
          >
            <option value="UPDATED_DESC">Recently updated</option>
            <option value="SCANS_DESC">Most scans</option>
            <option value="LAST_SCAN_DESC">Recently scanned</option>
            <option value="NAME_ASC">Name A–Z</option>
          </select>
        </label>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-200 bg-forest-50 px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold text-forest-900" role="status">
            {selected.size} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !hasSelectedActive}
              onClick={() => void runBulk('PAUSE')}
              className="min-h-10 rounded-md border border-forest-300 bg-white px-4 text-sm font-semibold text-forest-800 hover:bg-forest-100 disabled:opacity-50"
            >
              Pause selected
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runBulk('ARCHIVE')}
              className="min-h-10 rounded-md border border-clay-200 bg-white px-4 text-sm font-semibold text-clay-700 hover:bg-clay-50 disabled:opacity-50"
            >
              Archive selected
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <h3 className="font-display text-lg font-semibold text-ink-900">No matching campaigns</h3>
          <p className="mt-1 text-sm text-ink-500">Adjust the filters or create a new campaign.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-cream-50/60 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="w-14 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisible}
                      disabled={selectableVisible.length === 0}
                      aria-label="Select all visible campaigns"
                      className="h-6 w-6 accent-forest-700 disabled:opacity-40"
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Campaign</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Scans</th>
                  <th className="px-3 py-3 font-semibold">Last scan</th>
                  <th className="px-3 py-3 font-semibold">Placements</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-t border-ink-100 align-middle hover:bg-cream-50/40"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(campaign.id)}
                        onChange={() => toggle(campaign.id)}
                        disabled={campaign.status === 'ARCHIVED'}
                        aria-label={`Select ${campaign.title}`}
                        className="h-6 w-6 accent-forest-700 disabled:opacity-40"
                      />
                    </td>
                    <td className="max-w-[22rem] px-3 py-4">
                      <button
                        type="button"
                        onClick={() => onEdit(campaign)}
                        className="block max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
                      >
                        <span className="block truncate font-semibold text-ink-900 hover:text-forest-700">
                          {campaign.title}
                        </span>
                        <span className="mt-1 block text-xs text-ink-500">
                          {campaign.contentType.replaceAll('_', ' ')}
                          {campaign.folder ? ` · ${campaign.folder}` : ''}
                        </span>
                        {campaign.tags?.length ? (
                          <span className="mt-1 block truncate text-xs text-ink-400">
                            {campaign.tags.join(' · ')}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          'text-xs font-bold uppercase tracking-wide',
                          campaign.status === 'ACTIVE'
                            ? 'text-forest-700'
                            : campaign.status === 'ARCHIVED'
                              ? 'text-ink-400'
                              : 'text-gold-700',
                        )}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-semibold tabular-nums text-ink-900">
                      {(campaign.scanCount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-4 text-ink-600">{formatDate(campaign.lastScannedAt)}</td>
                    <td className="px-3 py-4 text-ink-600">
                      {campaign.placementVariants?.length ?? 0}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(campaign)}
                          className="min-h-10 rounded-md border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:border-ink-400"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDuplicate(campaign)}
                          className="min-h-10 rounded-md border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:border-ink-400 disabled:opacity-50"
                        >
                          Duplicate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-ink-100 lg:hidden">
            {visible.map((campaign) => (
              <article key={campaign.id} className="px-4 py-5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(campaign.id)}
                    onChange={() => toggle(campaign.id)}
                    disabled={campaign.status === 'ARCHIVED'}
                    aria-label={`Select ${campaign.title}`}
                    className="mt-1 h-6 w-6 shrink-0 accent-forest-700 disabled:opacity-40"
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onEdit(campaign)}
                      className="block max-w-full text-left"
                    >
                      <h3 className="truncate font-semibold text-ink-900">{campaign.title}</h3>
                      <p className="mt-1 text-xs text-ink-500">
                        {campaign.contentType.replaceAll('_', ' ')}
                        {campaign.folder ? ` · ${campaign.folder}` : ''}
                      </p>
                    </button>
                    <div className="mt-3 grid grid-cols-3 gap-3 border-y border-ink-100 py-3 text-xs">
                      <span>
                        <strong className="block text-base text-ink-900">
                          {campaign.scanCount ?? 0}
                        </strong>
                        Scans
                      </span>
                      <span>
                        <strong className="block text-base text-ink-900">
                          {campaign.placementVariants?.length ?? 0}
                        </strong>
                        Placements
                      </span>
                      <span>
                        <strong
                          className={cn(
                            'block text-xs uppercase',
                            campaign.status === 'ACTIVE'
                              ? 'text-forest-700'
                              : campaign.status === 'ARCHIVED'
                                ? 'text-ink-400'
                                : 'text-gold-700',
                          )}
                        >
                          {campaign.status}
                        </strong>
                        {formatDate(campaign.lastScannedAt)}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(campaign)}
                        className="min-h-11 flex-1 rounded-md bg-forest-800 px-3 text-sm font-semibold text-white"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onDuplicate(campaign)}
                        className="min-h-11 flex-1 rounded-md border border-ink-200 px-3 text-sm font-semibold text-ink-700 disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
