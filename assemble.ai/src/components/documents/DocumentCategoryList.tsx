import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DocumentCategory {
  id: string;
  name: string;
  count: number;
}

interface DocumentCategoryListProps {
  categories: DocumentCategory[];
  activeCategory?: string;
  onChange: (categoryId: string) => void;
  className?: string;
}

/**
 * DocumentCategoryList Component
 *
 * Displays a vertical list of document categories with count badges.
 * Used in document repository for category navigation.
 *
 * @param categories - Array of categories with counts
 * @param activeCategory - ID of the currently selected category
 * @param onChange - Callback when category is selected
 * @param className - Additional CSS classes
 */
export function DocumentCategoryList({
  categories,
  activeCategory,
  onChange,
  className,
}: DocumentCategoryListProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {categories.map((category) => {
        const isActive = activeCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onChange(category.id)}
            className={cn(
              'flex items-center justify-between',
              'px-2.5 py-2 rounded-md',
              'text-left transition-all duration-200',
              isActive
                ? 'bg-[rgba(212,165,116,0.15)] text-[var(--color-text-primary)]'
                : 'bg-transparent text-[var(--color-text-secondary)]',
              !isActive && 'hover:bg-[rgba(212,165,116,0.08)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {/* Category name */}
            <span className="text-[13px] font-medium">{category.name}</span>

            {/* Count badge */}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                isActive
                  ? 'bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)]'
                  : 'bg-[rgba(212,165,116,0.12)] text-[var(--color-accent-primary)]'
              )}
            >
              {category.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
