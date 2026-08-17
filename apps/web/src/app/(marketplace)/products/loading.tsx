export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="h-4 w-32 animate-pulse rounded bg-cream-200" />
      <div className="mt-3 h-8 w-48 animate-pulse rounded bg-cream-200" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-cream-100" />

      {/* Category chips skeleton */}
      <div className="mt-8 flex flex-wrap gap-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-cream-200" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="aspect-[4/3] animate-pulse bg-cream-100" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 rounded bg-cream-200 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-cream-200 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-cream-100 animate-pulse" />
              <div className="h-5 w-20 rounded bg-cream-200 animate-pulse mt-2" />
              <div className="h-9 w-full rounded-full bg-cream-200 animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
