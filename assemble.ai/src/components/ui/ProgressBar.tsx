'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  className?: string;
  animate?: boolean;
}

/**
 * ProgressBar Component
 *
 * Animated progress bar with optional label and value display.
 * Used for showing completion status and progress indicators.
 *
 * @param value - Progress value from 0 to 100
 * @param label - Optional label text
 * @param showValue - Whether to show the numeric value (default: true)
 * @param className - Additional CSS classes
 * @param animate - Whether to animate on mount (default: true)
 */
export function ProgressBar({
  value,
  label,
  showValue = true,
  className,
  animate = true,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = React.useState(animate ? 0 : value);

  // Animate to the target value on mount
  React.useEffect(() => {
    if (animate) {
      const timeout = setTimeout(() => {
        setDisplayValue(value);
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      setDisplayValue(value);
    }
  }, [value, animate]);

  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(displayValue, 0), 100);

  return (
    <div
      className={cn(
        'p-3.5 rounded-lg',
        'bg-[rgba(212,165,116,0.06)]',
        className
      )}
    >
      {/* Header: Label + Value */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-[11px] font-semibold text-[var(--color-accent-primary)]">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      {/* Progress track */}
      <div className="relative w-full h-[3px] bg-[rgba(212,165,116,0.25)] rounded-full overflow-hidden">
        {/* Progress fill */}
        <div
          className={cn(
            'absolute inset-y-0 left-0',
            'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-primary-hover)]',
            'rounded-full',
            'transition-all duration-1000 ease-out'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
