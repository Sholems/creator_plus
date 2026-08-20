import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/brand';
import { API_BASE } from '@/lib/env';

const API = API_BASE;

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

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  const jsonLd = product?.title
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description:
          product.shortDescription ||
          (product.description ? String(product.description).slice(0, 300) : ''),
        image: product.coverImage || product.thumbnail || undefined,
        url: `${SITE_URL}/products/${slug}`,
        brand: product.creator?.storeName
          ? { '@type': 'Organization', name: product.creator.storeName }
          : undefined,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency || 'NGN',
          availability: product.status === 'PUBLISHED'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `${SITE_URL}/products/${slug}`,
          seller: product.creator?.storeName
            ? { '@type': 'Organization', name: product.creator.storeName }
            : undefined,
        },
        aggregateRating:
          product.averageRating && product.reviewCount
            ? {
                '@type': 'AggregateRating',
                ratingValue: product.averageRating,
                reviewCount: product.reviewCount,
                bestRating: 5,
                worstRating: 1,
              }
            : undefined,
      }
    : null;

  const breadcrumbLd = product?.title
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Products',
            item: `${SITE_URL}/products`,
          },
          ...(product.category?.name
            ? [
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: product.category.name,
                  item: `${SITE_URL}/categories/${product.category.slug || product.category.id}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: product.category?.name ? 4 : 3,
            name: product.title,
          },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
        />
      )}
      {children}
    </>
  );
}
