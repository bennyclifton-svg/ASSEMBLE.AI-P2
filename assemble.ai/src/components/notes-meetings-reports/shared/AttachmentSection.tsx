/**
 * Attachment Section Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides Save/Load functionality for document attachments.
 * Styled to match RFT TransmittalSchedule format.
 */

'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentTable, type AttachmentDocument } from './AttachmentTable';
import { cn } from '@/lib/utils';

// Greyscale button styling - readable on all note colors
const BUTTON_BG = 'rgba(0, 0, 0, 0.08)';
const BUTTON_TEXT = 'rgba(0, 0, 0, 0.6)';
const BUTTON_BORDER = 'rgba(0, 0, 0, 0.15)';

interface AttachmentSectionProps {
    documents: AttachmentDocument[];
    isLoading?: boolean;
    onSave?: () => void;
    onLoad?: () => void;
    showToggle?: boolean;
    /** Compact mode for notes - smaller text, reduced padding, fewer columns */
    compact?: boolean;
    className?: string;
}

export function AttachmentSection({
    documents,
    isLoading = false,
    onSave,
    onLoad,
    showToggle = true,
    compact = false,
    className,
}: AttachmentSectionProps) {
    const [isVisible, setIsVisible] = useState(true);

    const documentCount = documents.length;

    return (
        <div className={cn('space-y-2', className)}>
            {/* Section Header - matches RFT TransmittalSchedule format */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Attachments
                </h3>

                <div className="flex items-center gap-2">
                    {onSave && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-medium"
                            style={{
                                backgroundColor: BUTTON_BG,
                                color: BUTTON_TEXT,
                                border: `1px solid ${BUTTON_BORDER}`,
                            }}
                            onClick={onSave}
                            disabled={isLoading}
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
                            className="h-7 px-2 text-xs font-medium"
                            style={{
                                backgroundColor: BUTTON_BG,
                                color: BUTTON_TEXT,
                                border: `1px solid ${BUTTON_BORDER}`,
                            }}
                            onClick={onLoad}
                            disabled={isLoading}
                            title="Load transmittal - view and modify attached documents"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Load {documentCount > 0 && `(${documentCount})`}
                        </Button>
                    )}

                    {showToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setIsVisible(!isVisible)}
                            title={isVisible ? 'Hide attachments' : 'Show attachments'}
                        >
                            {isVisible ? (
                                <EyeOff className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                            ) : (
                                <Eye className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Documents Table */}
            {isVisible && (
                <>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6 border border-black/10 rounded">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent-primary)]" />
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
