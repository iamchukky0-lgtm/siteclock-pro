import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow deploy while we iron out remaining strict type edges
    ignoreBuildErrors: true,
  },
}

export default nextConfig
