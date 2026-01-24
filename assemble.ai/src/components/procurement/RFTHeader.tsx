import * as React from 'react';
import { Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RFTHeaderProps {
  documentType?: 'RFT' | 'TRR' | 'Addendum';
  title: string;
  onSave?: () => void;
  onDownload?: () => void;
  isSaving?: boolean;
  isDownloading?: boolean;
  className?: string;
}

/**
 * RFTHeader Component
 *
 * Header section for RFT, TRR, and Addendum documents.
 * Displays document type badge, title, and action buttons.
 *
 * @param documentType - Type of document (RFT, TRR, or Addendum)
 * @param title - Document title
 * @param onSave - Optional save handler
 * @param onDownload - Optional download handler
 * @param isSaving - Whether save is in progress
 * @param isDownloading - Whether download is in progress
 * @param className - Additional CSS classes
 */
export function RFTHeader({
  documentType = 'RFT',
  title,
  onSave,
  onDownload,
  isSaving = false,
  isDownloading = false,
  className,
}: RFTHeaderProps) {
  return (
    <header
      className={cn(
        'flex justify-between items-center',
        'px-5 py-4',
        'border-b border-[var(--color-border)]',
        'bg-[rgba(212,165,116,0.04)]',
        className
      )}
    >
      {/* Left: Badge + Title */}
      <div className="flex items-center gap-3">
        {/* Document type badge */}
        <div
          className={cn(
            'px-2 py-1 rounded-md',
            'bg-[var(--color-accent-primary)]',
            'text-[var(--color-bg-primary)]',
            'text-[9px] font-bold uppercase tracking-wider'
          )}
        >
          {documentType}
        </div>

        {/* Title */}
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {onSave && (
          <Button
            variant="copper-ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}

        {onDownload && (
          <Button
            variant="copper"
            size="sm"
            onClick={onDownload}
            disabled={isDownloading}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        )}
      </div>
    </header>
  );
}
