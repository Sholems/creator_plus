import { notFound } from 'next/navigation';
import { ProductDetailClient } from './product-detail-client';
import { API_BASE } from '@/lib/env';

const API = API_BASE;

async function getJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // track=false: server render / crawler hits must not inflate view counts.
  // The client component re-fetches on mount to register the real view.
  const product = await getJson(`/products/${encodeURIComponent(slug)}?track=false`);
  if (!product?.id) {
    notFound();
  }

  const [reviewsRes, relatedRes] = await Promise.all([
    getJson(`/reviews/product/${product.id}`),
    product.categoryId
      ? getJson(`/products?categoryId=${product.categoryId}&perPage=4`)
      : Promise.resolve(null),
  ]);

  const related = (relatedRes?.data ?? []).filter((p: any) => p.id !== product.id);

  return (
    <ProductDetailClient
      slug={slug}
      initialProduct={product}
      initialReviews={reviewsRes?.data ?? []}
      initialRelated={related}
    />
  );
}
