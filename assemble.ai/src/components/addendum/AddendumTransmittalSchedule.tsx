/**
 * T114: AddendumTransmittalSchedule Component
 * Displays a read-only table of transmittal documents attached to an addendum
 */

'use client';

import { useAddendumTransmittal } from '@/lib/hooks/use-addendum-transmittal';
import { AttachmentSection } from '@/components/notes-meetings-reports/shared/AttachmentSection';
import type { AttachmentDocument } from '@/components/notes-meetings-reports/shared/AttachmentTable';

interface AddendumTransmittalScheduleProps {
    addendumId: string;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    hasTransmittal?: boolean;
    documentCount?: number;
    isDownloading?: boolean;
}

export function AddendumTransmittalSchedule({
    addendumId,
    onSaveTransmittal,
    onLoadTransmittal,
    hasTransmittal: hasTransmittalProp,
}: AddendumTransmittalScheduleProps) {
    const { transmittal, isLoading, hasTransmittal: hasTransmittalHook } = useAddendumTransmittal({
        addendumId,
    });

    // Use props if provided, otherwise fall back to hook values
    const hasTransmittal = hasTransmittalProp !== undefined ? hasTransmittalProp : hasTransmittalHook;
    const documents: AttachmentDocument[] = (transmittal?.documents ?? []).map((doc) => ({
        id: doc.id,
        documentId: doc.documentId,
        categoryId: doc.categoryId,
        categoryName: doc.categoryName,
        subcategoryId: doc.subcategoryId,
        subcategoryName: doc.subcategoryName,
        documentName: doc.originalName,
        revision: doc.versionNumber,
        addedAt: doc.createdAt ?? '',
        drawingNumber: doc.drawingNumber,
        drawingName: doc.drawingName,
        drawingRevision: doc.drawingRevision,
        drawingExtractionStatus: doc.drawingExtractionStatus,
    }));

    return (
        <div className="mt-4 shrink-0 px-4 pb-4">
            <AttachmentSection
                documents={hasTransmittal ? documents : []}
                isLoading={isLoading}
                onSave={onSaveTransmittal}
                onLoad={onLoadTransmittal}
                compact={true}
            />
        </div>
    );
}
