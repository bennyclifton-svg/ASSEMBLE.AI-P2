import * as React from 'react';
import { Building2, Home, Building, Factory, RefreshCw, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectType {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface ProjectTypeSelectorProps {
  types: ProjectType[];
  activeType?: string;
  onTypeChange: (typeId: string) => void;
  className?: string;
}

/**
 * Default project types with icons
 */
export const DEFAULT_PROJECT_TYPES: ProjectType[] = [
  { id: 'pre-development', label: 'Pre-Development', icon: <Diamond className="w-4 h-4" /> },
  { id: 'residential', label: 'Residential', icon: <Home className="w-4 h-4" /> },
  { id: 'commercial', label: 'Commercial', icon: <Building className="w-4 h-4" /> },
  { id: 'industrial', label: 'Industrial', icon: <Factory className="w-4 h-4" /> },
  { id: 'refurbishment', label: 'Refurbishment', icon: <RefreshCw className="w-4 h-4" /> },
];

/**
 * ProjectTypeSelector Component
 *
 * Displays a vertical list of project type options with icons.
 * Used in planning sections for selecting project type.
 *
 * @param types - Array of project types to display
 * @param activeType - Currently selected type ID
 * @param onTypeChange - Callback when type is selected
 * @param className - Additional CSS classes
 */
export function ProjectTypeSelector({
  types,
  activeType,
  onTypeChange,
  className,
}: ProjectTypeSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {types.map((type) => {
        const isActive = activeType === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-md',
              'border transition-all duration-200',
              'text-[13px] font-medium',
              isActive
                ? 'bg-[rgba(212,165,116,0.12)] border-[var(--color-accent-primary)] text-[var(--color-text-primary)]'
                : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)]',
              !isActive &&
                'hover:border-[rgba(212,165,116,0.4)] hover:bg-[rgba(212,165,116,0.05)] hover:text-[var(--color-text-primary)]'
            )}
          >
            <span
              className={cn(
                'flex-shrink-0',
                isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)]'
              )}
            >
              {type.icon || <Building2 className="w-4 h-4" />}
            </span>
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
