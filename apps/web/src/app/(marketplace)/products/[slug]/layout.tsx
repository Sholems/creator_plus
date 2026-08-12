import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/brand';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getProduct(slug: string): Promise<any | null> {
  try {
    // track=false so SEO metadata fetches never inflate the product view count.
    const res = await fetch(`${API}/products/${encodeURIComponent(slug)}?track=false`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product?.title) {
    return { title: 'Product' };
  }

  const description =
    product.shortDescription ||
    (product.description ? String(product.description).slice(0, 155) : SITE_DESCRIPTION);
  const image = product.coverImage || product.thumbnail;
  const url = `${SITE_URL}/products/${slug}`;

  return {
    title: product.title,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      title: `${product.title} · ${SITE_NAME}`,
      description,
      url,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
