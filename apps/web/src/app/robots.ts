import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / non-indexable areas.
      disallow: ['/dashboard/', '/creator/', '/checkout/', '/cart', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
