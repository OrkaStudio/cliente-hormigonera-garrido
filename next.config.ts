import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Salió de experimental en Next 15.5. Los tipos de ruta los genera
  // `next typegen`, que corre antes del tsc en el script de typecheck.
  typedRoutes: true,
}

export default nextConfig
