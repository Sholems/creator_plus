import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@creatorplus/ui', '@creatorplus/shared'],
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // CreatorPlus is pivoting from a marketplace to a learning community. The
  // marketplace surfaces are hidden (not deleted) via temporary redirects to
  // the landing page; the code stays dormant and reversible. /creator/* is left
  // intact because QR Studio lives there.
  async redirects() {
    const toHome = (source: string) => ({ source, destination: '/', permanent: false });
    return [
      toHome('/marketplace'),
      toHome('/marketplace/:path*'),
      toHome('/products'),
      toHome('/products/:path*'),
      toHome('/product/:path*'),
      toHome('/categories'),
      toHome('/categories/:path*'),
      toHome('/creators'),
      toHome('/creators/:path*'),
      toHome('/sell'),
      toHome('/sell/:path*'),
      toHome('/earn'),
      toHome('/cart'),
      toHome('/checkout'),
      toHome('/checkout/:path*'),
    ];
  },
};

export default nextConfig;
