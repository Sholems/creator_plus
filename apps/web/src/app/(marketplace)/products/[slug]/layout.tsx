import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { stripToText } from '@/lib/rich-text';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/brand';
import { API_BASE } from '@/lib/env';

const API = API_BASE;

/**
 * A clean meta/description string. The stored description is HTML, so it must be
 * flattened to text before truncating — otherwise tags leak into <meta> and
 * JSON-LD. Prefers the plain shortDescription when present.
 */
function metaText(product: any, max: number): string {
  const raw = product.shortDescription || product.description || '';
  const text = stripToText(String(raw));
  if (text.length <= max) return text || SITE_DESCRIPTION;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Absolute, de-duplicated image URLs for OG/JSON-LD (cover, previews, thumb). */
function productImages(product: any): string[] {
  const list = [
    product.coverImage,
    ...(Array.isArray(product.previewImages) ? product.previewImages : []),
    product.thumbnail,
  ].filter(Boolean);
  return [...new Set(list)] as string[];
}

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

  const description = metaText(product, 155);
  const images = productImages(product);
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
      siteName: SITE_NAME,
      images: images.map((img) => ({ url: img, alt: product.title })),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: images.length ? images : undefined,
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
        description: metaText(product, 300),
        image: productImages(product).length ? productImages(product) : undefined,
        sku: product.id,
        productID: product.id,
        category: product.category?.name || undefined,
        url: `${SITE_URL}/products/${slug}`,
        brand: product.creator?.storeName
          ? { '@type': 'Brand', name: product.creator.storeName }
          : undefined,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency || 'NGN',
          // Google recommends a validity date for merchant listings; roll a year
          // forward so the offer never reads as expired.
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
          availability: product.status === 'PUBLISHED'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `${SITE_URL}/products/${slug}`,
          seller: product.creator?.storeName
            ? { '@type': 'Organization', name: product.creator.storeName }
            : undefined,
          // Declares the advertised 30-day guarantee — resolves the "missing
          // return policy" warning in Google's merchant/rich-result checks.
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'NG',
            returnPolicyCategory:
              'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 30,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
        },
        review: Array.isArray(product.reviews)
          ? product.reviews.slice(0, 10).map((r: any) => ({
              '@type': 'Review',
              reviewRating: {
                '@type': 'Rating',
                ratingValue: r.rating,
                bestRating: 5,
                worstRating: 1,
              },
              author: { '@type': 'Person', name: r.buyer?.displayName || 'Verified buyer' },
              datePublished: r.createdAt ? String(r.createdAt).slice(0, 10) : undefined,
              name: r.title || undefined,
              reviewBody: r.comment || undefined,
            }))
          : undefined,
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
