import * as React from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DocumentStatus = 'active' | 'complete' | 'review' | 'draft';

interface DocumentListItemProps {
  name: string;
  category?: string;
  status: DocumentStatus;
  onClick?: () => void;
  className?: string;
}

/**
 * DocumentListItem Component
 *
 * Displays a document item with status indicator.
 * Used in document lists and repositories.
 *
 * @param name - Document name
 * @param category - Optional document category
 * @param status - Document status (active, complete, review, draft)
 * @param onClick - Optional click handler
 * @param className - Additional CSS classes
 */
export function DocumentListItem({
  name,
  category,
  status,
  onClick,
  className,
}: DocumentListItemProps) {
  // Status color mapping
  const statusColors: Record<DocumentStatus, string> = {
    active: 'bg-[var(--color-accent-primary)]', // copper
    complete: 'bg-green-500',
    review: 'bg-yellow-500',
    draft: 'bg-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-between',
        'px-3 py-2.5 rounded-md',
        'bg-[var(--color-bg-elevated)]',
        'border border-transparent',
        'hover:bg-[rgba(184,137,90,0.03)]',
        'hover-glow',
        'transition-all duration-200',
        'text-left w-full',
        className
      )}
    >
      {/* Left: Icon + Name + Category */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <FileText className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />

        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
            {name}
          </span>
          {category && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {category}
            </span>
          )}
        </div>
      </div>

      {/* Right: Status dot */}
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          statusColors[status]
        )}
        title={status.charAt(0).toUpperCase() + status.slice(1)}
      />
    </button>
  );
}
