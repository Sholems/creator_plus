export default function CreatorStorefrontLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Banner skeleton */}
      <div className="h-48 animate-pulse rounded-2xl bg-cream-100 sm:h-64" />

      {/* Profile skeleton */}
      <div className="mt-8 flex items-end gap-5">
        <div className="h-20 w-20 animate-pulse rounded-full bg-cream-200 ring-4 ring-white" />
        <div className="space-y-2 pb-1">
          <div className="h-6 w-48 animate-pulse rounded bg-cream-200" />
          <div className="h-3 w-32 animate-pulse rounded bg-cream-100" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="mt-6 flex gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-5 w-12 animate-pulse rounded bg-cream-200" />
            <div className="h-3 w-16 animate-pulse rounded bg-cream-100" />
          </div>
        ))}
      </div>

      {/* Products skeleton */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="aspect-[4/3] animate-pulse bg-cream-100" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 rounded bg-cream-200 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-cream-200 animate-pulse" />
              <div className="h-5 w-20 rounded bg-cream-200 animate-pulse mt-2" />
              <div className="h-9 w-full rounded-full bg-cream-200 animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
