/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    domains: ['cdn.nba.com'],
    unoptimized: true,
  },
  // Only use basePath and assetPrefix for GitHub Pages, not for Vercel
  basePath: process.env.GITHUB_PAGES === 'true' ? '/NBA' : '',
  assetPrefix: process.env.GITHUB_PAGES === 'true' ? '/NBA/' : '',
}

module.exports = nextConfig 