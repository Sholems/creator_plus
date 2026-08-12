import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@creatormarket/ui', '@creatormarket/shared'],
  typedRoutes: true,
};

export default nextConfig;
