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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const category = sp.category || '';

  const params = new URLSearchParams();
  params.set('q', q);
  if (category) params.set('category', category);
  params.set('sort', 'newest');
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
