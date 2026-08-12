import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@creatormarket/ui', '@creatormarket/shared'],
  typedRoutes: true,
};

export default nextConfig;
