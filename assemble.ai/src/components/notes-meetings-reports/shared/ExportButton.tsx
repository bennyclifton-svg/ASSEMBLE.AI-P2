/**
 * Export Button Component
 * Feature 021 - Notes, Meetings & Reports - Phase 7 (User Story 5)
 *
 * Dropdown button for exporting to PDF or DOCX format.
 * Shows loading state while exporting.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader2, FileText, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ExportFormat = 'pdf' | 'docx';

interface ExportButtonProps {
    onExport: (format: ExportFormat) => Promise<void>;
    isLoading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    tooltip?: string;
}

export function ExportButton({
    onExport,
    isLoading = false,
    disabled = false,
    size = 'md',
    className,
    tooltip = 'Export document',
}: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
    };

    const iconSizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleExport = async (format: ExportFormat) => {
        setExportingFormat(format);
        setIsOpen(false);
        try {
            await onExport(format);
        } finally {
            setExportingFormat(null);
        }
    };

    const isExporting = isLoading || exportingFormat !== null;

    return (
        <div ref={dropdownRef} className="relative">
            <Button
                variant="ghost"
                size="icon"
                className={cn(sizeClasses[size], className)}
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || isExporting}
                title={tooltip}
            >
                {isExporting ? (
                    <Loader2
                        className={cn(
                            iconSizeClasses[size],
                            'animate-spin text-[var(--color-accent-primary)]'
                        )}
                    />
                ) : (
                    <Download
                        className={cn(
                            iconSizeClasses[size],
                            'text-[var(--color-text-muted)]'
                        )}
                    />
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-lg">
                    <div className="p-1">
                        <button
                            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            onClick={() => handleExport('pdf')}
                        >
                            <FileText className="h-4 w-4 text-red-500" />
                            Export as PDF
                        </button>
                        <button
                            className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            onClick={() => handleExport('docx')}
                        >
                            <FileType className="h-4 w-4 text-blue-500" />
                            Export as DOCX
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExportButton;
