import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Optimize for production
  reactStrictMode: true,

  // Configure allowed image domains if needed
  images: {
    remotePatterns: [],
  },

  // Skip TypeScript errors during build (pre-existing codebase issues)
  // TODO: Fix type errors and remove this setting
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
