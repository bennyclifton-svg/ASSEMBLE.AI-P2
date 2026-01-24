/**
 * TRRAttachments Component
 * Displays documents attached to the TRR transmittal
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect } from 'react';
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
                        }) => ({
                            id: doc.documentId,
                            documentName: doc.documentName || 'Unknown Document',
                            revision: doc.revision || 1,
                            date: doc.addedAt || null,
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

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-AU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

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
                        <thead className="bg-[var(--color-bg-tertiary)]">
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="px-4 py-2.5 text-left text-[var(--color-text-muted)] font-medium w-[60%]">
                                    Document
                                </th>
                                <th className="px-4 py-2.5 text-left text-[var(--color-text-muted)] font-medium w-[15%]">
                                    Rev
                                </th>
                                <th className="px-4 py-2.5 text-left text-[var(--color-text-muted)] font-medium w-[25%]">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {attachments.map((attachment) => (
                                <tr key={attachment.id} className="border-b border-[var(--color-border)] last:border-0">
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {attachment.documentName}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {attachment.revision}
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                                        {formatDate(attachment.date)}
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
