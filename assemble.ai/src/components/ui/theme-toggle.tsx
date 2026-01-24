'use client';

import { Sun, Ruler } from 'lucide-react';
import { useTheme } from '@/lib/hooks/use-theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Theme toggle for TESSERA's Architectural Precision themes.
 * Toggles between precision (dark slate) and precision-light (warm cream).
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme, isLoaded } = useTheme();

  // Prevent hydration mismatch by not rendering until loaded
  if (!isLoaded) {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center',
          'w-9 h-9 rounded-lg',
          'bg-[var(--color-bg-tertiary)]',
          'border border-[var(--color-border)]',
          className
        )}
        aria-label="Toggle theme"
        disabled
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const isPrecisionDark = theme === 'precision';
  const label = isPrecisionDark
    ? 'Switch to Precision Light theme'
    : 'Switch to Precision Dark theme';
  const currentLabel = isPrecisionDark ? 'Precision Dark' : 'Precision Light';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center',
        'w-9 h-9 rounded-lg',
        'bg-[var(--color-bg-tertiary)]',
        'border border-[var(--color-border)]',
        'text-[var(--color-text-secondary)]',
        'hover:bg-[var(--color-accent-primary-tint)]',
        'hover:text-[var(--color-accent-primary)]',
        'hover:border-[var(--color-accent-primary)]',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]',
        className
      )}
      aria-label={label}
      title={`${currentLabel}. Click to change.`}
    >
      {isPrecisionDark ? (
        <Ruler className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </button>
  );
}
