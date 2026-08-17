import { Suspense } from 'react';
import { ProductsClient } from './products-client';
import { API_BASE } from '@/lib/env';

const API = API_BASE;

async function getJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const category = sp.category || '';

  const params = new URLSearchParams();
  params.set('q', q);
  if (category) params.set('category', category);
  if (sp.minPrice) params.set('minPrice', sp.minPrice);
  if (sp.maxPrice) params.set('maxPrice', sp.maxPrice);
  if (sp.rating) params.set('rating', sp.rating);
  if (sp.sort) params.set('sort', sp.sort);
  if (sp.creator) params.set('creator', sp.creator);
  params.set('page', '1');
  params.set('perPage', '20');

  const [search, categories] = await Promise.all([
    getJson(`/search?${params.toString()}`),
    getJson('/categories'),
  ]);

  return (
    <ProductsClient
      initialProducts={search?.data ?? []}
      initialPagination={search?.pagination ?? { page: 1, perPage: 20, total: 0, totalPages: 0 }}
      initialCategories={Array.isArray(categories) ? categories : categories?.data ?? []}
      initialQuery={q}
      initialCategoryId={category}
    />
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-8 w-48 animate-pulse rounded bg-cream-200" />
          <div className="mt-4 h-4 w-96 animate-pulse rounded bg-cream-100" />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                <div className="aspect-[4/3] animate-pulse bg-cream-100" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-1/3 rounded bg-cream-200 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-cream-200 animate-pulse" />
                  <div className="h-5 w-20 rounded bg-cream-200 animate-pulse mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}
