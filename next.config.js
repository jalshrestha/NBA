/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'export',
  images: {
    domains: ['cdn.nba.com'],
    unoptimized: true,
  },
  // Only use basePath and assetPrefix for GitHub Pages, not for Vercel
  basePath: process.env.GITHUB_PAGES === 'true' ? '/NBA' : '',
  assetPrefix: process.env.GITHUB_PAGES === 'true' ? '/NBA/' : '',
  // Add src directory to the project
  distDir: '.next',
  reactStrictMode: true,
  // Configure the src directory as the source of pages
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Configure webpack to resolve paths from the src directory
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      'styles': path.resolve(__dirname, 'styles'),
    };
    return config;
  },
}

module.exports = nextConfig 