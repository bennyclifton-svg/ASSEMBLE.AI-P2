/**
 * TRRAttachments Component
 * Displays documents attached to the TRR transmittal
 * Feature 012 - TRR Report
 */

'use client';

import { useState, useEffect } from 'react';
import { TRRAttachment } from '@/types/trr';
import { AttachmentSection } from '@/components/notes-meetings-reports/shared/AttachmentSection';
import type { AttachmentDocument } from '@/components/notes-meetings-reports/shared/AttachmentTable';

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

    const documents: AttachmentDocument[] = attachments.map((attachment) => ({
        id: attachment.id,
        documentId: attachment.id,
        categoryId: attachment.categoryId,
        categoryName: attachment.categoryName ?? null,
        subcategoryId: attachment.subcategoryId,
        subcategoryName: attachment.subcategoryName ?? null,
        documentName: attachment.documentName,
        revision: attachment.revision,
        addedAt: attachment.date ?? '',
        drawingNumber: attachment.drawingNumber,
        drawingRevision: attachment.drawingRevision,
    }));

    return (
        <div className="mt-4 shrink-0 px-4 pb-4">
            <AttachmentSection
                documents={documents}
                isLoading={isLoading}
                onSave={onSaveTransmittal}
                canSave={canSaveTransmittal ?? true}
                onLoad={onLoadTransmittal}
                canLoad={hasAttachments}
                onDownload={onDownloadTransmittal}
                canDownload={hasAttachments && !isDownloading}
                isDownloading={isDownloading}
                headingLabel="Attachments"
                headingClassName="text-sm font-semibold normal-case text-[var(--color-text-primary)]"
                headingStyle={{}}
                compact={true}
            />
        </div>
    );
}
