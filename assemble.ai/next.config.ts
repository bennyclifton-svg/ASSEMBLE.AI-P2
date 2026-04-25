import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

  // Keep Sentry/OpenTelemetry deps as runtime externals so the standalone
  // trace-copy step doesn't try to copy chunks containing `node:` URIs
  // (which Windows can't write because of the colon in the filename).
  serverExternalPackages: [
    '@sentry/nextjs',
    '@sentry/node',
    '@opentelemetry/api',
    'require-in-the-middle',
    'import-in-the-middle',
  ],

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

export default withSentryConfig(nextConfig, {
  // Org/project come from .env (SENTRY_ORG, SENTRY_PROJECT) or are skipped if absent.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (i.e. production builds in CI).
  // Local builds skip the upload step automatically.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
