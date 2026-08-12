import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/brand';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/products',
    '/categories',
    '/creators',
    '/sell',
    '/earn',
    '/pricing',
    '/about',
    '/help',
    '/terms',
    '/privacy',
    '/licensing',
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));

  const entries: MetadataRoute.Sitemap = [...staticRoutes];

  // Published products
  const products = await fetchJson('/products?perPage=200');
  for (const p of products?.data ?? []) {
    if (!p?.slug) continue;
    entries.push({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  // Categories
  const categories = await fetchJson('/categories');
  const catList = Array.isArray(categories) ? categories : (categories?.data ?? []);
  for (const c of catList) {
    if (!c?.slug) continue;
    entries.push({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  // Creator storefronts
  const creators = await fetchJson('/creators?perPage=200');
  for (const c of creators?.data ?? []) {
    if (!c?.slug) continue;
    entries.push({
      url: `${SITE_URL}/creator/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  return entries;
}
