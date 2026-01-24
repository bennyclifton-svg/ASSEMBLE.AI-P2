import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  label: string;
  className?: string;
}

/**
 * SectionHeader Component
 *
 * Displays a label with a gradient divider line.
 * Used throughout TESSERA for section demarcation.
 *
 * @param label - The section label text (will be uppercased)
 * @param className - Additional CSS classes for spacing/positioning
 */
export function SectionHeader({ label, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="text-[9px] font-semibold uppercase tracking-[2px] text-[var(--color-text-muted)]">
        {label}
      </span>
      <div className="flex-1 h-px divider-gradient" />
    </div>
  );
}
