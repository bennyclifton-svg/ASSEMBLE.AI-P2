'use client';

import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Sun, Moon, Compass, Ruler } from 'lucide-react';

type Theme = 'light' | 'dark' | 'precision-light' | 'precision';

interface ThemeOption {
  id: Theme;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    icon: <Sun className="w-4 h-4" />,
    description: 'Standard light theme',
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: <Moon className="w-4 h-4" />,
    description: 'Standard dark theme',
  },
  {
    id: 'precision-light',
    label: 'Precision Light',
    icon: <Compass className="w-4 h-4" />,
    description: 'Architectural warm light',
  },
  {
    id: 'precision',
    label: 'Precision Dark',
    icon: <Ruler className="w-4 h-4" />,
    description: 'Architectural dark slate',
  },
];

interface ThemeToggleProps {
  variant?: 'compact' | 'expanded' | 'dropdown';
  className?: string;
}

/**
 * Theme toggle component supporting all 4 themes
 */
export function ThemeToggle({ variant = 'compact', className }: ThemeToggleProps) {
  const { theme, setTheme, cycleTheme } = useTheme();

  if (variant === 'compact') {
    // Simple button that cycles through themes
    const currentOption = themeOptions.find(opt => opt.id === theme) || themeOptions[0];
    
    return (
      <button
        onClick={cycleTheme}
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          className
        )}
        title={`Current: ${currentOption.label}. Click to change.`}
        aria-label={`Theme: ${currentOption.label}`}
      >
        {currentOption.icon}
      </button>
    );
  }

  if (variant === 'expanded') {
    // Segmented control showing all options
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 p-1',
          'bg-[var(--color-bg-tertiary)]',
          'border border-[var(--color-border)]',
          'rounded-xl',
          className
        )}
        role="radiogroup"
        aria-label="Select theme"
      >
        {themeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5',
              'rounded-lg text-xs font-medium',
              'transition-all duration-200',
              theme === option.id
                ? [
                    'bg-[var(--color-bg-elevated)]',
                    'text-[var(--color-text-primary)]',
                    'shadow-sm',
                  ]
                : [
                    'text-[var(--color-text-muted)]',
                    'hover:text-[var(--color-text-secondary)]',
                    'hover:bg-[var(--color-bg-elevated)]/50',
                  ]
            )}
            role="radio"
            aria-checked={theme === option.id}
            title={option.description}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={cn('relative group', className)}>
      <button
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2',
          'bg-[var(--color-bg-tertiary)]',
          'border border-[var(--color-border)]',
          'rounded-lg text-sm font-medium',
          'text-[var(--color-text-secondary)]',
          'hover:border-[var(--color-accent-primary)]',
          'transition-all duration-200'
        )}
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        {themeOptions.find(opt => opt.id === theme)?.icon}
        <span>{themeOptions.find(opt => opt.id === theme)?.label}</span>
        <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div
        className={cn(
          'absolute top-full right-0 mt-2',
          'w-48 py-1',
          'bg-[var(--color-bg-elevated)]',
          'border border-[var(--color-border)]',
          'rounded-xl shadow-lg',
          'opacity-0 invisible',
          'group-hover:opacity-100 group-hover:visible',
          'group-focus-within:opacity-100 group-focus-within:visible',
          'transition-all duration-200',
          'z-50'
        )}
        role="listbox"
      >
        {themeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2',
              'text-sm text-left',
              'transition-colors duration-150',
              theme === option.id
                ? 'bg-[var(--color-accent-primary-tint)] text-[var(--color-accent-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
            )}
            role="option"
            aria-selected={theme === option.id}
          >
            {option.icon}
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              <div className="text-xs opacity-60">{option.description}</div>
            </div>
            {theme === option.id && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple light/dark toggle (ignores precision themes)
 */
export function SimpleDarkModeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();

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
        'transition-all duration-200',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
