import { notFound } from 'next/navigation';
import { ProductDetailClient } from './product-detail-client';
import { getJson } from '@/lib/get-json';

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

  const [reviewsRes, relatedRes, creatorProductsRes] = await Promise.all([
    getJson(`/reviews/product/${product.id}`),
    product.categoryId
      ? getJson(`/products?categoryId=${product.categoryId}&perPage=4`)
      : Promise.resolve(null),
    product.creatorId
      ? getJson(`/products?creatorId=${product.creatorId}&perPage=5`)
      : Promise.resolve(null),
  ]);

  const related = (relatedRes?.data ?? []).filter((p: any) => p.id !== product.id);
  const creatorProducts = (creatorProductsRes?.data ?? []).filter((p: any) => p.id !== product.id);

  return (
    <ProductDetailClient
      slug={slug}
      initialProduct={product}
      initialReviews={reviewsRes?.data ?? []}
      initialRelated={related}
      initialCreatorProducts={creatorProducts}
    />
  );
}
