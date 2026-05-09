'use client';

/**
 * Cost Plan Error Boundary
 * Feature 006 - Cost Planning Module (Task T083)
 *
 * Error boundary with retry functionality for the cost plan page.
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CostPlanError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for debugging/monitoring
    console.error('Cost Plan Error:', error);
  }, [error]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* Error header */}
      <div className="flex items-center bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-sm text-[var(--color-text-muted)]">Cost Plan</span>
      </div>

      {/* Error content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-6 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#7f1d1d]/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[#f87171]" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Failed to Load Cost Plan
            </h2>

            {/* Message */}
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              {error.message || 'An unexpected error occurred while loading the cost plan. Please try again.'}
            </p>

            {/* Error digest for debugging */}
            {error.digest && (
              <p className="text-xs text-[var(--color-text-muted)] mb-6 font-mono">
                Error ID: {error.digest}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-primary)] text-white text-sm rounded hover:bg-[var(--color-accent-primary-hover)] transition-colors w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-[#37373d] text-[var(--color-text-primary)] text-sm rounded hover:bg-[var(--color-border)] transition-colors w-full sm:w-auto justify-center"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
            If this problem persists, please contact support or check your network connection.
          </p>
        </div>
      </div>
    </div>
  );
}
