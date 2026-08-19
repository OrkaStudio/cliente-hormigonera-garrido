import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true, // Tipado estricto de rutas Next.js
  },
}

export default nextConfig
