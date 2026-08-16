import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    // Don't fail production builds on ESLint (Railway may omit eslint packages)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Still check types, but we'll fix real errors in code
    ignoreBuildErrors: false,
  },
}

export default nextConfig
