/**
 * TRRAttachments Component
 * Displays documents attached to the TRR transmittal
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect } from 'react';
import { Folder, Save, RotateCcw, Download } from 'lucide-react';
import { TRRAttachment } from '@/types/trr';
import { Button } from '@/components/ui/button';

// Aurora accent button styling - consistent across procurement components
const BUTTON_BG = 'var(--color-accent-copper-tint)';
const BUTTON_TEXT = 'var(--color-accent-copper)';
const BUTTON_BORDER = 'rgba(0, 255, 255, 0.3)';

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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSaveTransmittal}
                        disabled={!canSaveTransmittal}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: BUTTON_BG,
                            color: BUTTON_TEXT,
                            border: `1px solid ${BUTTON_BORDER}`,
                        }}
                    >
                        <Save className="w-3 h-3 mr-1" />
                        Save Attachments
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLoadTransmittal}
                        disabled={!hasAttachments}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: BUTTON_BG,
                            color: BUTTON_TEXT,
                            border: `1px solid ${BUTTON_BORDER}`,
                        }}
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Recall {(transmittalCount ?? 0) > 0 && `(${transmittalCount})`}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDownloadTransmittal}
                        disabled={!hasAttachments || isDownloading}
                        className="h-7 px-2 text-xs font-medium"
                        style={{
                            backgroundColor: BUTTON_BG,
                            color: BUTTON_TEXT,
                            border: `1px solid ${BUTTON_BORDER}`,
                        }}
                    >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                    </Button>
                </div>
            </div>
            <div className="border border-[var(--color-border)] rounded overflow-hidden">
                {isLoading ? (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        Loading attachments...
                    </div>
                ) : attachments.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
                                <th className="text-left px-4 py-1.5 font-medium w-10">#</th>
                                <th className="text-left px-4 py-1.5 font-medium w-24">DWG #</th>
                                <th className="text-left px-4 py-1.5 font-medium">Name</th>
                                <th className="text-center px-4 py-1.5 font-medium w-16">Rev</th>
                                <th className="text-left px-4 py-1.5 font-medium w-36">Category</th>
                                <th className="text-left px-4 py-1.5 font-medium w-40">Subcategory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attachments.map((attachment, index) => (
                                    <tr
                                        key={attachment.id}
                                        className="border-t border-[var(--color-border)] hover:bg-[#2d2d30]/50"
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
