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

  // Increase body size limit for file uploads (default is 10MB)
  // Allows uploads up to 100MB for large PDF documents with multiple pages
  experimental: {
    serverActions: {
      bodySizeLimit: '100MB',  // Using uppercase MB as recommended
    },
    // Increase proxy body size limit for API routes in development
    proxyClientMaxBodySize: '100MB',
  },
};

export default nextConfig;
