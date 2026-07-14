import type { NextConfig } from 'next'

const apiOrigin = (process.env.RPG_API_ORIGIN || 'http://127.0.0.1:8001').replace(/\/$/, '')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/game/rpg',
        destination: '/',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      { source: '/sanctum/:path*', destination: `${apiOrigin}/sanctum/:path*` },
    ]
  },
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'https', hostname: 'upyun.dogeow.com', pathname: '/**' },
      { protocol: 'https', hostname: 'rpg-api.dogeow.com', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    ],
  },
}

export default nextConfig
