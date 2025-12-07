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
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Error header */}
      <div className="flex items-center bg-[#252526] border-b border-[#3e3e42] px-4 py-2">
        <span className="text-sm text-[#858585]">Cost Plan</span>
      </div>

      {/* Error content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-[#252526] rounded-lg border border-[#3e3e42] p-6 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#7f1d1d]/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-[#f87171]" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-[#cccccc] mb-2">
              Failed to Load Cost Plan
            </h2>

            {/* Message */}
            <p className="text-sm text-[#858585] mb-6">
              {error.message || 'An unexpected error occurred while loading the cost plan. Please try again.'}
            </p>

            {/* Error digest for debugging */}
            {error.digest && (
              <p className="text-xs text-[#6e6e6e] mb-6 font-mono">
                Error ID: {error.digest}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-[#0e639c] text-white text-sm rounded hover:bg-[#1177bb] transition-colors w-full sm:w-auto justify-center"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-[#37373d] text-[#cccccc] text-sm rounded hover:bg-[#4e4e52] transition-colors w-full sm:w-auto justify-center"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-[#6e6e6e] text-center mt-4">
            If this problem persists, please contact support or check your network connection.
          </p>
        </div>
      </div>
    </div>
  );
}
