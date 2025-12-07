'use client';

/**
 * Sync Status Indicator
 * Feature 006 - Cost Planning Module (Task T090)
 *
 * Displays save/sync status: Saved, Saving, Error
 * Shows last saved timestamp.
 */

import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle, Cloud, CloudOff } from 'lucide-react';

export type SyncStatus = 'saved' | 'saving' | 'error' | 'offline';

interface SyncIndicatorProps {
  status: SyncStatus;
  lastSaved?: Date | null;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export function SyncIndicator({
  status,
  lastSaved,
  errorMessage,
  onRetry,
  className = '',
}: SyncIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Update relative time periodically
  useEffect(() => {
    if (!lastSaved) {
      setRelativeTime('');
      return;
    }

    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(lastSaved));
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [lastSaved]);

  const config = getStatusConfig(status);

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${className}`}
      title={getTooltip(status, lastSaved, errorMessage)}
    >
      {/* Icon */}
      <span className={config.iconClass}>
        {config.icon}
      </span>

      {/* Label */}
      <span className={config.textClass}>
        {config.label}
      </span>

      {/* Last saved time */}
      {status === 'saved' && relativeTime && (
        <span className="text-[#6e6e6e]">
          · {relativeTime}
        </span>
      )}

      {/* Error retry button */}
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 text-[#0e639c] hover:text-[#1177bb] hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Helper: Get status configuration
function getStatusConfig(status: SyncStatus) {
  switch (status) {
    case 'saved':
      return {
        icon: <Check className="w-3.5 h-3.5" />,
        iconClass: 'text-[#4ade80]',
        textClass: 'text-[#858585]',
        label: 'Saved',
      };
    case 'saving':
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        iconClass: 'text-[#0e639c]',
        textClass: 'text-[#858585]',
        label: 'Saving...',
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        iconClass: 'text-[#f87171]',
        textClass: 'text-[#f87171]',
        label: 'Save failed',
      };
    case 'offline':
      return {
        icon: <CloudOff className="w-3.5 h-3.5" />,
        iconClass: 'text-[#f59e0b]',
        textClass: 'text-[#f59e0b]',
        label: 'Offline',
      };
    default:
      return {
        icon: <Cloud className="w-3.5 h-3.5" />,
        iconClass: 'text-[#858585]',
        textClass: 'text-[#858585]',
        label: 'Unknown',
      };
  }
}

// Helper: Get tooltip text
function getTooltip(status: SyncStatus, lastSaved?: Date | null, errorMessage?: string): string {
  switch (status) {
    case 'saved':
      return lastSaved
        ? `Last saved: ${lastSaved.toLocaleString('en-AU', {
            dateStyle: 'short',
            timeStyle: 'medium',
          })}`
        : 'All changes saved';
    case 'saving':
      return 'Saving changes...';
    case 'error':
      return errorMessage || 'Failed to save changes. Click Retry to try again.';
    case 'offline':
      return 'You are offline. Changes will be saved when connection is restored.';
    default:
      return '';
  }
}

// Helper: Get relative time string
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) {
    return 'just now';
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }

  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Compact version for tight spaces
export function SyncIndicatorCompact({
  status,
  className = '',
}: {
  status: SyncStatus;
  className?: string;
}) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={status === 'error' ? 'Save failed' : status === 'saving' ? 'Saving...' : 'Saved'}
    >
      <span className={config.iconClass}>{config.icon}</span>
    </span>
  );
}

export default SyncIndicator;
