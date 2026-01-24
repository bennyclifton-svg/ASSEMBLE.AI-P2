import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  name: string;
  address: string;
  lotArea?: string;
  stories?: string;
  buildingClass?: string;
  zoning?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * ProjectCard Component
 *
 * Displays project summary information in a precision-themed card.
 * Used in planning sections for project overview.
 *
 * @param name - Project name
 * @param address - Project address
 * @param lotArea - Lot area (e.g., "2,450 m²")
 * @param stories - Number of stories (e.g., "12 storeys")
 * @param buildingClass - Building classification (e.g., "Class 2")
 * @param zoning - Zoning information (e.g., "R3 - Medium Density")
 * @param className - Additional CSS classes
 * @param onClick - Optional click handler
 */
export function ProjectCard({
  name,
  address,
  lotArea,
  stories,
  buildingClass,
  zoning,
  className,
  onClick,
}: ProjectCardProps) {
  return (
    <Card
      variant="translucent"
      className={cn(
        'card-copper cursor-pointer hover:border-[var(--color-accent-primary)] hover:-translate-y-0.5 transition-all duration-200',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] mb-1">
          {name}
        </h3>
        <p className="text-[11px] text-[var(--color-text-secondary)] mb-3.5">
          {address}
        </p>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {lotArea && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
                Lot Area
              </div>
              <div className="text-[12px] font-medium text-[var(--color-text-primary)]">
                {lotArea}
              </div>
            </div>
          )}

          {stories && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
                Stories
              </div>
              <div className="text-[12px] font-medium text-[var(--color-text-primary)]">
                {stories}
              </div>
            </div>
          )}

          {buildingClass && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
                Class
              </div>
              <div className="text-[12px] font-medium text-[var(--color-text-primary)]">
                {buildingClass}
              </div>
            </div>
          )}

          {zoning && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
                Zoning
              </div>
              <div className="text-[12px] font-medium text-[var(--color-text-primary)]">
                {zoning}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
