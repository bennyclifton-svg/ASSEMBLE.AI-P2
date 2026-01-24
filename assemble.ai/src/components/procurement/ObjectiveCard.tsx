import * as React from 'react';
import { Diamond, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObjectiveCardProps {
  label: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}

/**
 * ObjectiveCard Component
 *
 * Displays a project objective with icon, label, and description.
 * Used in planning sections to communicate project goals.
 *
 * @param label - Objective title
 * @param description - Detailed objective description
 * @param icon - Optional Lucide icon component (defaults to Diamond)
 * @param className - Additional CSS classes
 */
export function ObjectiveCard({
  label,
  description,
  icon: Icon = Diamond,
  className,
}: ObjectiveCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-md',
        'bg-[rgba(212,165,116,0.04)]',
        'border border-[rgba(212,165,116,0.12)]',
        className
      )}
    >
      {/* Header with icon and label */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[var(--color-accent-primary)] flex-shrink-0" />
        <h4 className="text-[11px] font-semibold text-[var(--color-text-primary)]">
          {label}
        </h4>
      </div>

      {/* Description */}
      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {description}
      </p>
    </div>
  );
}
