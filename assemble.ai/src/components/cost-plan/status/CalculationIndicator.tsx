'use client';

/**
 * Calculation Status Indicator
 * Feature 006 - Cost Planning Module (Task T092)
 *
 * Displays calculation status when recalculating derived values.
 */

import { useEffect, useState } from 'react';
import { Calculator, Check, Loader2 } from 'lucide-react';

export type CalculationStatus = 'idle' | 'calculating' | 'complete';

interface CalculationIndicatorProps {
  status: CalculationStatus;
  message?: string;
  showComplete?: boolean; // Show checkmark briefly after calculation
  completeDuration?: number; // How long to show "complete" state (ms)
  className?: string;
}

export function CalculationIndicator({
  status,
  message,
  showComplete = true,
  completeDuration = 1500,
  className = '',
}: CalculationIndicatorProps) {
  const [displayStatus, setDisplayStatus] = useState<CalculationStatus>(status);

  // Handle transition from calculating to complete
  useEffect(() => {
    if (status === 'idle' && displayStatus === 'calculating' && showComplete) {
      // Show complete state briefly
      setDisplayStatus('complete');
      const timer = setTimeout(() => {
        setDisplayStatus('idle');
      }, completeDuration);
      return () => clearTimeout(timer);
    }

    setDisplayStatus(status);
  }, [status, displayStatus, showComplete, completeDuration]);

  // Don't render anything when idle
  if (displayStatus === 'idle') {
    return null;
  }

  const config = getStatusConfig(displayStatus);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs
        bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
        animate-in fade-in slide-in-from-bottom-2 duration-200
        ${className}
      `}
    >
      <span className={config.iconClass}>
        {config.icon}
      </span>
      <span className={config.textClass}>
        {message || config.label}
      </span>
    </div>
  );
}

// Helper: Get status configuration
function getStatusConfig(status: CalculationStatus) {
  switch (status) {
    case 'calculating':
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        iconClass: 'text-[var(--color-accent-primary)]',
        textClass: 'text-[var(--color-text-muted)]',
        label: 'Calculating...',
      };
    case 'complete':
      return {
        icon: <Check className="w-3.5 h-3.5" />,
        iconClass: 'text-[var(--color-success)]',
        textClass: 'text-[var(--color-success)]',
        label: 'Updated',
      };
    case 'idle':
    default:
      return {
        icon: <Calculator className="w-3.5 h-3.5" />,
        iconClass: 'text-[var(--color-text-muted)]',
        textClass: 'text-[var(--color-text-muted)]',
        label: 'Ready',
      };
  }
}

// Inline version for tight spaces
export function CalculationIndicatorInline({
  isCalculating,
  className = '',
}: {
  isCalculating: boolean;
  className?: string;
}) {
  if (!isCalculating) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] ${className}`}>
      <Loader2 className="w-3 h-3 animate-spin text-[var(--color-accent-primary)]" />
      <span>Updating...</span>
    </span>
  );
}

// Hook for managing calculation status
export function useCalculationStatus(initialStatus: CalculationStatus = 'idle') {
  const [status, setStatus] = useState<CalculationStatus>(initialStatus);
  const [message, setMessage] = useState<string | undefined>();

  const startCalculating = (msg?: string) => {
    setStatus('calculating');
    setMessage(msg);
  };

  const finishCalculating = () => {
    setStatus('idle');
    setMessage(undefined);
  };

  const setCalculationMessage = (msg: string) => {
    setMessage(msg);
  };

  return {
    status,
    message,
    startCalculating,
    finishCalculating,
    setCalculationMessage,
    isCalculating: status === 'calculating',
  };
}

// Component that combines all status indicators
export function StatusBar({
  syncStatus,
  connectionStatus,
  isCalculating,
  lastSaved,
  onRetry,
  className = '',
}: {
  syncStatus: 'saved' | 'saving' | 'error';
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  isCalculating: boolean;
  lastSaved?: Date | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 text-xs ${className}`}>
      {/* Connection status dot */}
      <div className="flex items-center gap-1.5">
        <span
          className={`
            w-2 h-2 rounded-full
            ${connectionStatus === 'connected' ? 'bg-[var(--color-success)] animate-pulse' : ''}
            ${connectionStatus === 'disconnected' ? 'bg-[var(--color-error)]' : ''}
            ${connectionStatus === 'reconnecting' ? 'bg-[var(--color-warning)]' : ''}
          `}
        />
        {connectionStatus !== 'connected' && (
          <span className="text-[var(--color-text-muted)]">
            {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
          </span>
        )}
      </div>

      {/* Divider */}
      <span className="text-[var(--color-border)]">|</span>

      {/* Sync status */}
      <div className="flex items-center gap-1.5">
        {syncStatus === 'saving' && (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-[var(--color-accent-primary)]" />
            <span className="text-[var(--color-text-muted)]">Saving...</span>
          </>
        )}
        {syncStatus === 'saved' && (
          <>
            <Check className="w-3 h-3 text-[var(--color-success)]" />
            <span className="text-[var(--color-text-muted)]">
              Saved{lastSaved && ` · ${formatTime(lastSaved)}`}
            </span>
          </>
        )}
        {syncStatus === 'error' && (
          <>
            <span className="text-[var(--color-error)]">Save failed</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] hover:underline"
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>

      {/* Calculation status */}
      {isCalculating && (
        <>
          <span className="text-[var(--color-border)]">|</span>
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-[var(--color-accent-primary)]" />
            <span className="text-[var(--color-text-muted)]">Calculating...</span>
          </div>
        </>
      )}
    </div>
  );
}

// Helper: Format time
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

export default CalculationIndicator;
