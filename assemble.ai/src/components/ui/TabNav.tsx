import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * TabNav Component
 *
 * Horizontal tab navigation with animated active indicator.
 * Used for switching between different views or sections.
 *
 * @param tabs - Array of tabs to display
 * @param activeTab - ID of the currently active tab
 * @param onTabChange - Callback when tab is selected
 * @param className - Additional CSS classes
 */
export function TabNav({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavProps) {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <div
      className={cn(
        'flex gap-1.5',
        'border-b border-[var(--color-border)]',
        'pb-3.5',
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'group relative px-4 py-1.5',
              'text-[13px] font-medium',
              'transition-all duration-200 ease-out',
              isActive
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)]',
              !isActive &&
                !tab.disabled &&
                'hover:text-[var(--color-text-primary)]',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.label}

            {/* Hover indicator - subtle preview of active state */}
            {!isActive && !tab.disabled && (
              <div
                className={cn(
                  'absolute bottom-[-15px] left-1/2 -translate-x-1/2',
                  'w-0 h-[3px] rounded-full',
                  'bg-[var(--color-accent-primary)] opacity-0',
                  'transition-all duration-200 ease-out',
                  'group-hover:w-8 group-hover:opacity-50'
                )}
              />
            )}

            {/* Active indicator */}
            {isActive && (
              <div
                className={cn(
                  'absolute bottom-[-15px] left-1/2 -translate-x-1/2',
                  'w-14 h-[3px] rounded-full',
                  'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-primary-hover)]',
                  'transition-all duration-300'
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
