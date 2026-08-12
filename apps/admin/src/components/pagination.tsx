interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, perPage, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return total > 0 ? (
      <div className="px-4 py-3 text-xs text-ink-500">
        {total} result{total === 1 ? '' : 's'}
      </div>
    ) : null;
  }

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
      <div className="text-xs text-ink-500">
        {from}–{to} of {total}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-ghost btn-sm"
        >
          ← Prev
        </button>
        <span className="text-xs tabular-nums text-ink-600">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-ghost btn-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
