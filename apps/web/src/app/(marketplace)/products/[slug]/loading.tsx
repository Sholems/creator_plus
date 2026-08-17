export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-cream-200" />
        <div className="h-3 w-3 animate-pulse rounded bg-cream-100" />
        <div className="h-3 w-16 animate-pulse rounded bg-cream-200" />
        <div className="h-3 w-3 animate-pulse rounded bg-cream-100" />
        <div className="h-3 w-24 animate-pulse rounded bg-cream-200" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Image skeleton */}
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-cream-100" />

        {/* Details skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-full bg-cream-200" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-cream-200" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-pulse rounded-full bg-cream-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-cream-100" />
          </div>
          <div className="flex items-baseline gap-3">
            <div className="h-8 w-28 animate-pulse rounded bg-cream-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-cream-100" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full animate-pulse rounded bg-cream-100" />
            <div className="h-3 w-full animate-pulse rounded bg-cream-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-cream-100" />
          </div>
          <div className="flex gap-3 pt-4">
            <div className="h-11 flex-1 animate-pulse rounded-full bg-forest-200" />
            <div className="h-11 w-11 animate-pulse rounded-full bg-cream-200" />
          </div>
        </div>
      </div>

      {/* Reviews skeleton */}
      <div className="mt-16">
        <div className="h-6 w-40 animate-pulse rounded bg-cream-200" />
        <div className="mt-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-cream-200" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-cream-200" />
                  <div className="h-2.5 w-16 animate-pulse rounded bg-cream-100" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-cream-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-cream-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
