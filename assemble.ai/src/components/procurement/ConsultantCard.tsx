import * as React from 'react';
import { LucideIcon, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsultantCardProps {
  name: string;
  icon?: LucideIcon;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * ConsultantCard Component
 *
 * Displays a consultant firm card with icon, name, and active state.
 * Used in consultant selection grids for procurement.
 *
 * @param name - Consultant firm name
 * @param icon - Optional Lucide icon component (defaults to Building2)
 * @param isActive - Whether this consultant is currently selected
 * @param onClick - Click handler for selection
 * @param className - Additional CSS classes
 */
export function ConsultantCard({
  name,
  icon: Icon = Building2,
  isActive = false,
  onClick,
  className,
}: ConsultantCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5',
        'p-3.5 rounded-xl',
        'border transition-all duration-200',
        'text-center',
        isActive
          ? 'bg-[rgba(212,165,116,0.12)] border-[var(--color-accent-primary)]'
          : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)]',
        !isActive && 'hover:border-[rgba(212,165,116,0.4)] hover-lift',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isActive
            ? 'bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* Name */}
      <span
        className={cn(
          'text-[10px] font-medium leading-tight',
          isActive
            ? 'text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)]'
        )}
      >
        {name}
      </span>

      {/* Active badge */}
      {isActive && (
        <span className="text-[8px] font-semibold uppercase tracking-wider text-[var(--color-accent-primary)] mt-0.5">
          Active
        </span>
      )}
    </button>
  );
}
