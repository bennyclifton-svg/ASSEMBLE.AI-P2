import * as React from 'react';
import { Plus, LucideIcon } from 'lucide-react';
import { ConsultantCard } from './ConsultantCard';
import { cn } from '@/lib/utils';

export interface Consultant {
  id: string;
  name: string;
  icon?: LucideIcon;
}

interface ConsultantGridProps {
  consultants: Consultant[];
  activeId?: string;
  onSelect: (consultantId: string) => void;
  onAdd?: () => void;
  className?: string;
  columns?: 3 | 4 | 5;
}

/**
 * ConsultantGrid Component
 *
 * Displays a grid of consultant cards with selection state.
 * Optionally includes an "Add Firm" card for adding new consultants.
 *
 * @param consultants - Array of consultants to display
 * @param activeId - ID of the currently selected consultant
 * @param onSelect - Callback when a consultant is selected
 * @param onAdd - Optional callback for adding a new consultant
 * @param className - Additional CSS classes
 * @param columns - Number of columns in the grid (3, 4, or 5)
 */
export function ConsultantGrid({
  consultants,
  activeId,
  onSelect,
  onAdd,
  className,
  columns = 4,
}: ConsultantGridProps) {
  const gridColsClass =
    columns === 3
      ? 'grid-cols-3'
      : columns === 5
      ? 'grid-cols-5'
      : 'grid-cols-4';

  return (
    <div className={cn('grid gap-2.5', gridColsClass, className)}>
      {consultants.map((consultant) => (
        <ConsultantCard
          key={consultant.id}
          name={consultant.name}
          icon={consultant.icon}
          isActive={consultant.id === activeId}
          onClick={() => onSelect(consultant.id)}
        />
      ))}

      {/* Add Firm card */}
      {onAdd && (
        <button
          onClick={onAdd}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5',
            'p-3.5 rounded-xl min-h-[88px]',
            'border-2 border-dashed border-[var(--color-border)]',
            'bg-transparent',
            'hover:border-[var(--color-accent-primary)]',
            'hover:bg-[rgba(212,165,116,0.05)]',
            'transition-all duration-200',
            'text-[var(--color-text-muted)]',
            'hover:text-[var(--color-accent-primary)]'
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add Firm</span>
        </button>
      )}
    </div>
  );
}
