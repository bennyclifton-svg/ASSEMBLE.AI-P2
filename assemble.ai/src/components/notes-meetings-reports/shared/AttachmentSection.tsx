/**
 * Attachment Section Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides Save/Load functionality for document attachments.
 * Styled to match RFT TransmittalSchedule format.
 */

'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, Download, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentTable, type AttachmentDocument } from './AttachmentTable';
import { cn } from '@/lib/utils';

interface AttachmentSectionProps {
    documents: AttachmentDocument[];
    isLoading?: boolean;
    onSave?: () => void;
    canSave?: boolean;
    onLoad?: () => void;
    canLoad?: boolean;
    onDownload?: () => void;
    canDownload?: boolean;
    isDownloading?: boolean;
    headingLabel?: string;
    headingClassName?: string;
    headingStyle?: React.CSSProperties;
    accentColor?: string;
    showToggle?: boolean;
    /** Compact mode for notes - smaller text, reduced padding, fewer columns */
    compact?: boolean;
    className?: string;
}

export function AttachmentSection({
    documents,
    isLoading = false,
    onSave,
    canSave = true,
    onLoad,
    canLoad,
    onDownload,
    canDownload,
    isDownloading = false,
    headingLabel = 'attachments',
    headingClassName,
    headingStyle,
    accentColor = 'var(--sw-cyan)',
    showToggle = true,
    compact = false,
    className,
}: AttachmentSectionProps) {
    const [isVisible, setIsVisible] = useState(true);

    const documentCount = documents.length;
    const loadEnabled = canLoad ?? documentCount > 0;
    const downloadEnabled = canDownload ?? documentCount > 0;

    return (
        <div className={cn('space-y-2', className)}>
            {/* Section Header - matches RFT TransmittalSchedule format */}
            <div className="flex items-center justify-between">
                <h3
                    className={cn(
                        'flex items-center gap-2 text-xs font-semibold uppercase text-[var(--sw-ink)]',
                        headingClassName
                    )}
                    style={headingStyle ?? { fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.12em' }}
                >
                    <span aria-hidden="true" className="h-1.5 w-1.5" style={{ background: accentColor }} />
                    {headingLabel}
                </h3>

                <div className="flex items-center gap-2">
                    {onSave && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-none border border-[var(--sw-rule)] bg-transparent px-2 text-xs font-medium text-[var(--sw-ink)] hover:bg-[var(--sw-paper)]"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                            onClick={onSave}
                            disabled={isLoading || !canSave}
                            title="Save transmittal - select documents from repository"
                        >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                        </Button>
                    )}

                    {onLoad && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-none border border-[var(--sw-rule)] bg-transparent px-2 text-xs font-medium text-[var(--sw-ink)] hover:bg-[var(--sw-paper)]"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                            onClick={onLoad}
                            disabled={isLoading || !loadEnabled}
                            title="Load transmittal - view and modify attached documents"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Load {documentCount > 0 && `(${documentCount})`}
                        </Button>
                    )}

                    {onDownload && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-none border border-[var(--sw-rule)] bg-transparent px-2 text-xs font-medium text-[var(--sw-ink)] hover:bg-[var(--sw-paper)]"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                            onClick={onDownload}
                            disabled={isLoading || isDownloading || !downloadEnabled}
                            title="Download transmittal"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                    )}

                    {showToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none border border-[var(--sw-rule)] bg-transparent hover:bg-[var(--sw-paper)]"
                            onClick={() => setIsVisible(!isVisible)}
                            title={isVisible ? 'Hide attachments' : 'Show attachments'}
                        >
                            {isVisible ? (
                                <EyeOff className="h-3.5 w-3.5 text-[var(--sw-muted)]" />
                            ) : (
                                <Eye className="h-3.5 w-3.5 text-[var(--sw-muted)]" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Documents Table */}
            {isVisible && (
                <>
                    {isLoading ? (
                        <div className="flex items-center justify-center border border-[var(--sw-rule)] py-6">
                            <div className="h-6 w-6 animate-spin rounded-full border border-[var(--sw-muted)] border-t-transparent" />
                        </div>
                    ) : (
                        <AttachmentTable
                            documents={documents}
                            compact={compact}
                            emptyMessage="No documents attached. Click 'Save' to select documents from the repository."
                        />
                    )}
                </>
            )}
        </div>
    );
}

export default AttachmentSection;
