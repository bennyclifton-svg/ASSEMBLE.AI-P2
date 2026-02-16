/**
 * TRRAttachments Component
 * Displays documents attached to the TRR transmittal
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect } from 'react';
import { Folder, Save, RotateCcw, Download } from 'lucide-react';
import { TRRAttachment } from '@/types/trr';

interface TRRAttachmentsProps {
    trrId: string;
    transmittalCount?: number;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    isDownloading?: boolean;
}

export function TRRAttachments({
    trrId,
    transmittalCount,
    onSaveTransmittal,
    onLoadTransmittal,
    onDownloadTransmittal,
    canSaveTransmittal,
    isDownloading,
}: TRRAttachmentsProps) {
    const [attachments, setAttachments] = useState<TRRAttachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const hasAttachments = (transmittalCount ?? 0) > 0;

    useEffect(() => {
        const fetchAttachments = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/trr/${trrId}/transmittal`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.documents && Array.isArray(data.documents)) {
                        const attachmentList: TRRAttachment[] = data.documents.map((doc: {
                            documentId: string;
                            documentName?: string;
                            revision?: number;
                            addedAt?: string;
                            drawingNumber?: string | null;
                            drawingRevision?: string | null;
                            categoryId?: string | null;
                            categoryName?: string | null;
                            subcategoryId?: string | null;
                            subcategoryName?: string | null;
                        }) => ({
                            id: doc.documentId,
                            documentName: doc.documentName || 'Unknown Document',
                            revision: doc.revision || 1,
                            date: doc.addedAt || null,
                            drawingNumber: doc.drawingNumber || null,
                            drawingRevision: doc.drawingRevision || null,
                            categoryId: doc.categoryId || null,
                            categoryName: doc.categoryName || null,
                            subcategoryId: doc.subcategoryId || null,
                            subcategoryName: doc.subcategoryName || null,
                        }));
                        setAttachments(attachmentList);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch attachments:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (trrId) {
            fetchAttachments();
        }
    }, [trrId, transmittalCount]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    Attachments
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSaveTransmittal}
                        disabled={!canSaveTransmittal}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <Save className="h-3.5 w-3.5" />
                        Save Attachments
                    </button>
                    <button
                        onClick={onLoadTransmittal}
                        disabled={!hasAttachments}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Recall {(transmittalCount ?? 0) > 0 && `(${transmittalCount})`}
                    </button>
                    <button
                        onClick={onDownloadTransmittal}
                        disabled={!hasAttachments || isDownloading}
                        className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download
                    </button>
                </div>
            </div>
            <div className="overflow-hidden rounded-lg">
                {isLoading ? (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        Loading attachments...
                    </div>
                ) : attachments.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-10">#</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-24">DWG #</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium">Name</th>
                                <th className="text-center text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-16">Rev</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-36">Category</th>
                                <th className="text-left text-[var(--color-text-primary)] px-4 py-1.5 font-medium w-40">Subcategory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attachments.map((attachment, index) => (
                                    <tr
                                        key={attachment.id}
                                        className="hover:bg-[var(--color-bg-tertiary)]"
                                    >
                                        <td className="px-4 py-1.5 text-[var(--color-text-muted)]">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-1.5 text-[var(--color-text-primary)]">
                                            {attachment.drawingNumber ? (
                                                <span title={attachment.drawingNumber}>
                                                    {attachment.drawingNumber}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-1.5 text-[var(--color-text-primary)] truncate max-w-[300px]">
                                            {attachment.documentName}
                                        </td>
                                        <td className="px-4 py-1.5 text-center text-[var(--color-text-primary)]">
                                            {attachment.drawingRevision || <span className="text-[var(--color-text-muted)]">-</span>}
                                        </td>
                                        <td className="px-4 py-1.5">
                                            {attachment.categoryName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Folder
                                                        className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-primary)]"
                                                    />
                                                    <span
                                                        className="text-sm truncate text-[var(--color-text-primary)]"
                                                    >
                                                        {attachment.categoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-1.5">
                                            {attachment.subcategoryName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Folder
                                                        className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-primary)]"
                                                    />
                                                    <span
                                                        className="text-sm truncate text-[var(--color-text-primary)]"
                                                    >
                                                        {attachment.subcategoryName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                    </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        No attachments added
                    </div>
                )}
            </div>
        </div>
    );
}
