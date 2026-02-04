/**
 * ExportButtonGroup Component
 * Standardized export buttons (PDF, DOCX) matching RFT/TRR/Addendum styling
 */

'use client';

import { Button } from '@/components/ui/button';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

interface ExportButtonGroupProps {
    /** Callback for PDF export */
    onExportPdf?: () => void;
    /** Callback for DOCX export */
    onExportDocx?: () => void;
    /** Whether export is in progress */
    isExporting?: boolean;
    /** Whether buttons should be disabled */
    disabled?: boolean;
    /** Optional className for the container */
    className?: string;
}

export function ExportButtonGroup({
    onExportPdf,
    onExportDocx,
    isExporting = false,
    disabled = false,
    className = '',
}: ExportButtonGroupProps) {
    const isDisabled = disabled || isExporting;

    return (
        <div className={`flex items-center gap-1 pr-2 ${className}`}>
            {onExportPdf && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExportPdf}
                    disabled={isDisabled}
                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                    title="Export PDF"
                >
                    <PdfIcon size={20} />
                </Button>
            )}
            {onExportDocx && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExportDocx}
                    disabled={isDisabled}
                    className="h-7 w-7 p-0 hover:bg-[var(--color-border)]"
                    title="Export Word"
                >
                    <DocxIcon size={20} />
                </Button>
            )}
        </div>
    );
}

export default ExportButtonGroup;
