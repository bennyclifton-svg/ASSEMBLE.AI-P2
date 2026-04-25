// Sentry init for background workers (doc-worker, draw-worker).
// MUST be imported before any other module that might throw.

import * as Sentry from '@sentry/node';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    sendDefaultPii: false,
  });
}

export { Sentry };
