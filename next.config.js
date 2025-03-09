/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    domains: ['cdn.nba.com'],
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/NBA' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/NBA/' : '',
}

module.exports = nextConfig 