import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/json-ld';
import { SITE_NAME, SITE_URL } from '@/lib/brand';
import { API_BASE } from '@/lib/env';

const API = API_BASE;

async function getStorefront(slug: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}/creators/storefront/${encodeURIComponent(slug)}`, {
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
  const store = await getStorefront(slug);
  if (!store?.storeName) {
    return { title: 'Creator Store' };
  }

  const description =
    store.bio ||
    `Browse ${store.storeName}'s digital products, templates, courses and assets on ${SITE_NAME}. Buy and download instantly, pay in naira.`;
  const image = store.avatar || store.banner || undefined;
  const url = `${SITE_URL}/creator/${slug}`;

  return {
    title: `${store.storeName} — Creator Store`,
    description,
    alternates: { canonical: `/creator/${slug}` },
    openGraph: {
      title: `${store.storeName} · ${SITE_NAME}`,
      description,
      url,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: store.storeName,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CreatorStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStorefront(slug);

  const breadcrumbLd = store?.storeName
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
            name: 'Creators',
            item: `${SITE_URL}/creators`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: store.storeName,
          },
        ],
      }
    : null;

  const profileLd = store?.storeName
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: store.storeName,
        url: `${SITE_URL}/creator/${slug}`,
        description: store.bio || undefined,
        image: store.avatar || undefined,
      }
    : null;

  return (
    <>
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
        />
      )}
      {profileLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(profileLd) }}
        />
      )}
      {children}
    </>
  );
}
