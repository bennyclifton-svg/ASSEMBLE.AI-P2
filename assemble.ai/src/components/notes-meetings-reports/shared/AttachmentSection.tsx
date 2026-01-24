/**
 * Attachment Section Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides Save/Load functionality for document attachments.
 */

'use client';

import React, { useState } from 'react';
import { Save, FolderOpen, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachmentTable, type AttachmentDocument } from './AttachmentTable';
import { cn } from '@/lib/utils';

interface AttachmentSectionProps {
    documents: AttachmentDocument[];
    isLoading?: boolean;
    onSave?: () => void;
    onLoad?: () => void;
    showToggle?: boolean;
    className?: string;
}

export function AttachmentSection({
    documents,
    isLoading = false,
    onSave,
    onLoad,
    showToggle = true,
    className,
}: AttachmentSectionProps) {
    const [isVisible, setIsVisible] = useState(true);

    const documentCount = documents.length;

    return (
        <div className={cn('border-t border-[var(--color-border)]', className)}>
            {/* Section Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-bg-tertiary)]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                        Attachments
                    </span>
                    {documentCount > 0 && (
                        <span className="text-xs bg-[var(--color-accent-primary-tint)] text-[var(--color-accent-primary)] px-2 py-0.5 rounded-full">
                            {documentCount}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {onSave && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={onSave}
                            disabled={isLoading}
                            title="Save transmittal - select documents from repository"
                        >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Save
                        </Button>
                    )}

                    {onLoad && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={onLoad}
                            disabled={isLoading}
                            title="Load transmittal - view and modify attached documents"
                        >
                            <FolderOpen className="h-3.5 w-3.5 mr-1" />
                            Load
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
                <div className="px-4 py-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent-primary)]" />
                        </div>
                    ) : (
                        <AttachmentTable
                            documents={documents}
                            emptyMessage="No documents attached. Click 'Save' to select documents from the repository."
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default AttachmentSection;
