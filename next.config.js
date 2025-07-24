/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'firebasestorage.googleapis.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 