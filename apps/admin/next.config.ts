import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@creatorplus/ui', '@creatorplus/shared'],
  typedRoutes: true,
};

export default nextConfig;
