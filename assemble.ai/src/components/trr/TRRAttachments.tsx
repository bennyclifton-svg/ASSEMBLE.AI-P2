/**
 * TRRAttachments Component
 * Displays documents attached to the TRR transmittal
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect } from 'react';
import { Folder } from 'lucide-react';
import { TRRAttachment } from '@/types/trr';

interface TRRAttachmentsProps {
    trrId: string;
    transmittalCount?: number;
}

export function TRRAttachments({ trrId, transmittalCount }: TRRAttachmentsProps) {
    const [attachments, setAttachments] = useState<TRRAttachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                Attachments
            </h3>
            <div className="border border-[var(--color-border)] rounded overflow-hidden">
                {isLoading ? (
                    <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
                        Loading attachments...
                    </div>
                ) : attachments.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                                <th className="text-left px-4 py-2.5 font-medium w-10">#</th>
                                <th className="text-left px-4 py-2.5 font-medium w-24">DWG #</th>
                                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                                <th className="text-center px-4 py-2.5 font-medium w-16">Rev</th>
                                <th className="text-left px-4 py-2.5 font-medium w-36">Category</th>
                                <th className="text-left px-4 py-2.5 font-medium w-40">Subcategory</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attachments.map((attachment, index) => (
                                    <tr
                                        key={attachment.id}
                                        className="border-t border-[var(--color-border)] hover:bg-[#2d2d30]/50"
                                    >
                                        <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                            {attachment.drawingNumber ? (
                                                <span title={attachment.drawingNumber}>
                                                    {attachment.drawingNumber}
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-[var(--color-text-primary)] truncate max-w-[300px]">
                                            {attachment.documentName}
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-[var(--color-text-primary)]">
                                            {attachment.drawingRevision || <span className="text-[var(--color-text-muted)]">-</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
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
                                        <td className="px-4 py-2.5">
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
