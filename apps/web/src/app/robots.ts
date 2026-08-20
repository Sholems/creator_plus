import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / non-indexable areas.  /creator/ storefronts (/creator/[slug])
      // are public and must NOT be blocked — only the creator dashboard routes
      // underneath are disallowed.
      disallow: [
        '/dashboard/',
        '/creator/analytics',
        '/creator/coupons',
        '/creator/earnings',
        '/creator/orders',
        '/creator/products',
        '/creator/settings',
        '/creator/store',
        '/checkout/',
        '/cart',
        '/auth/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
