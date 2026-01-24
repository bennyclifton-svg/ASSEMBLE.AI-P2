import * as React from 'react';
import { cn } from '@/lib/utils';

interface RFTDetailsProps {
  projectName: string;
  address: string;
  documentName: string;
  date: string;
  className?: string;
}

/**
 * RFTDetails Component
 *
 * Displays project and document details for RFT/TRR/Addendum documents.
 * Shows project name, address, document name, and date.
 *
 * @param projectName - Name of the project
 * @param address - Project address
 * @param documentName - Document filename or identifier
 * @param date - Document date (formatted string)
 * @param className - Additional CSS classes
 */
export function RFTDetails({
  projectName,
  address,
  documentName,
  date,
  className,
}: RFTDetailsProps) {
  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      {/* Project Name */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
          Project
        </div>
        <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
          {projectName}
        </div>
      </div>

      {/* Address */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
          Address
        </div>
        <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
          {address}
        </div>
      </div>

      {/* Document row with inline date */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-1">
          Document
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
            {documentName}
          </span>
          <span className="text-[11px] text-[var(--color-accent-primary)]">
            {date}
          </span>
        </div>
      </div>
    </div>
  );
}
