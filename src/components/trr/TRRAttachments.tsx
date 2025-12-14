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
            <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                Attachments
            </h3>
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                {isLoading ? (
                    <div className="px-4 py-3 text-[#858585] text-sm">
                        Loading attachments...
                    </div>
                ) : attachments.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-[#2d2d30]">
                            <tr className="border-b border-[#3e3e42]">
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[60%]">
                                    Document
                                </th>
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[15%]">
                                    Rev
                                </th>
                                <th className="px-4 py-2.5 text-left text-[#858585] font-medium w-[25%]">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {attachments.map((attachment) => (
                                <tr key={attachment.id} className="border-b border-[#3e3e42] last:border-0">
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {attachment.documentName}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {attachment.revision}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#cccccc]">
                                        {formatDate(attachment.date)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="px-4 py-3 text-[#858585] text-sm">
                        No attachments added
                    </div>
                )}
            </div>
        </div>
    );
}
