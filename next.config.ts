import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? '/gelephu-gis-viewer' : '',
  assetPrefix: isGitHubPages ? '/gelephu-gis-viewer/' : '',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
