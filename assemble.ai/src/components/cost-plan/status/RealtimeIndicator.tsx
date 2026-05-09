'use client';

/**
 * Realtime Connection Indicator
 * Feature 006 - Cost Planning Module (Task T091)
 *
 * Displays connection status: Connected, Disconnected, Reconnecting
 * Shows tooltip with connection details.
 */

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface RealtimeIndicatorProps {
  status: ConnectionStatus;
  lastPollTime?: Date | null;
  pollInterval?: number; // in seconds
  onReconnect?: () => void;
  className?: string;
}

export function RealtimeIndicator({
  status,
  lastPollTime,
  pollInterval = 10,
  onReconnect,
  className = '',
}: RealtimeIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Update countdown timer
  useEffect(() => {
    if (status !== 'connected' || !lastPollTime) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - lastPollTime.getTime()) / 1000);
      const remaining = Math.max(0, pollInterval - elapsed);
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status, lastPollTime, pollInterval]);

  const config = getStatusConfig(status);

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Indicator */}
      <button
        onClick={status === 'disconnected' ? onReconnect : undefined}
        disabled={status === 'reconnecting'}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors
          ${status === 'disconnected' ? 'cursor-pointer hover:bg-[var(--color-bg-hover)]' : 'cursor-default'}
        `}
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />

        {/* Icon */}
        <span className={config.iconClass}>
          {config.icon}
        </span>

        {/* Label (optional - shows on hover) */}
        {status !== 'connected' && (
          <span className={config.textClass}>{config.label}</span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg px-3 py-2 text-xs whitespace-nowrap">
            <div className="font-medium text-[var(--color-text-primary)] mb-1">{config.tooltipTitle}</div>
            <div className="text-[var(--color-text-muted)]">
              {getTooltipContent(status, lastPollTime, countdown, pollInterval)}
            </div>
            {status === 'disconnected' && onReconnect && (
              <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]">
                <span className="text-[var(--color-accent-primary)]">Click to reconnect</span>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-[var(--color-border)]" />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Get status configuration
function getStatusConfig(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return {
        icon: <Wifi className="w-3.5 h-3.5" />,
        iconClass: 'text-[var(--color-success)]',
        textClass: 'text-[var(--color-success)]',
        dotClass: 'bg-[var(--color-success)] animate-pulse',
        label: 'Live',
        tooltipTitle: 'Connected',
      };
    case 'reconnecting':
      return {
        icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
        iconClass: 'text-[var(--color-warning)]',
        textClass: 'text-[var(--color-warning)]',
        dotClass: 'bg-[var(--color-warning)]',
        label: 'Reconnecting...',
        tooltipTitle: 'Reconnecting',
      };
    case 'disconnected':
      return {
        icon: <WifiOff className="w-3.5 h-3.5" />,
        iconClass: 'text-[var(--color-error)]',
        textClass: 'text-[var(--color-error)]',
        dotClass: 'bg-[var(--color-error)]',
        label: 'Disconnected',
        tooltipTitle: 'Disconnected',
      };
    default:
      return {
        icon: <Wifi className="w-3.5 h-3.5" />,
        iconClass: 'text-[var(--color-text-muted)]',
        textClass: 'text-[var(--color-text-muted)]',
        dotClass: 'bg-[var(--color-text-muted)]',
        label: 'Unknown',
        tooltipTitle: 'Unknown Status',
      };
  }
}

// Helper: Get tooltip content
function getTooltipContent(
  status: ConnectionStatus,
  lastPollTime?: Date | null,
  countdown?: number,
  pollInterval?: number
): string {
  switch (status) {
    case 'connected':
      if (lastPollTime && countdown !== undefined) {
        return `Next update in ${countdown}s (every ${pollInterval}s)`;
      }
      return 'Receiving live updates';
    case 'reconnecting':
      return 'Attempting to reconnect...';
    case 'disconnected':
      if (lastPollTime) {
        return `Last connected: ${lastPollTime.toLocaleTimeString('en-AU')}`;
      }
      return 'Not receiving updates';
    default:
      return '';
  }
}

// Compact version (just the dot)
export function RealtimeIndicatorDot({
  status,
  className = '',
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${config.dotClass} ${className}`}
      title={config.tooltipTitle}
    />
  );
}

// Hook for managing realtime status with polling
export function useRealtimeStatus(pollFn: () => Promise<void>, intervalMs = 10000) {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const poll = useCallback(async () => {
    try {
      await pollFn();
      setStatus('connected');
      setLastPollTime(new Date());
      setConsecutiveErrors(0);
    } catch (error) {
      setConsecutiveErrors((prev) => prev + 1);

      if (consecutiveErrors >= 2) {
        setStatus('disconnected');
      } else {
        setStatus('reconnecting');
      }
    }
  }, [pollFn, consecutiveErrors]);

  useEffect(() => {
    poll(); // Initial poll

    const interval = setInterval(poll, intervalMs);
    return () => clearInterval(interval);
  }, [poll, intervalMs]);

  const reconnect = useCallback(() => {
    setStatus('reconnecting');
    poll();
  }, [poll]);

  return {
    status,
    lastPollTime,
    reconnect,
    pollInterval: intervalMs / 1000,
  };
}

export default RealtimeIndicator;
