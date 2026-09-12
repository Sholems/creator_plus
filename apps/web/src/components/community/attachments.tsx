type Attachment = {
  url: string;
  name?: string | null;
  type?: string | null;
  size?: number | null;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(a: Attachment): boolean {
  return !!a.type?.startsWith('image/');
}

export function AttachmentList({ attachments }: { attachments?: Attachment[] | null }) {
  const files = attachments?.filter((a) => a?.url) ?? [];
  if (files.length === 0) return null;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {files.map((a) => (
        <a
          key={a.url}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-xl border border-ink-100 bg-cream-50 transition hover:border-forest-200 hover:bg-cream-100"
        >
          {isImage(a) ? (
            <img src={a.url} alt={a.name || 'Attachment'} className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-24 items-center justify-center bg-white text-3xl">📎</div>
          )}
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-ink-800 group-hover:text-forest-800">{a.name || 'Attachment'}</p>
            <p className="mt-0.5 text-xs text-ink-400">{[a.type, formatBytes(a.size)].filter(Boolean).join(' · ') || 'Open file'}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export function AttachmentSummary({ attachments }: { attachments?: Attachment[] | null }) {
  const count = attachments?.length ?? 0;
  if (!count) return null;
  return <span>📎 {count} attachment{count === 1 ? '' : 's'}</span>;
}
