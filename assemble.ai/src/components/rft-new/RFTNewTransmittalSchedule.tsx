/**
 * RFTNewTransmittalSchedule Component
 * Displays a read-only table of transmittal documents attached to an RFT NEW report
 */

'use client';

import { useRftNewTransmittal } from '@/lib/hooks/use-rft-new-transmittal';
import { AttachmentSection } from '@/components/notes-meetings-reports/shared/AttachmentSection';
import type { AttachmentDocument } from '@/components/notes-meetings-reports/shared/AttachmentTable';

interface RFTNewTransmittalScheduleProps {
    rftNewId: string;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onDownloadTransmittal?: () => void;
    canSaveTransmittal?: boolean;
    hasTransmittal?: boolean;
    documentCount?: number;
    isDownloading?: boolean;
}

export function RFTNewTransmittalSchedule({
    rftNewId,
    onSaveTransmittal,
    onLoadTransmittal,
    onDownloadTransmittal,
    canSaveTransmittal,
    hasTransmittal: hasTransmittalProp,
    documentCount: documentCountProp,
    isDownloading,
}: RFTNewTransmittalScheduleProps) {
    const { transmittal, isLoading, hasTransmittal: hasTransmittalHook, documentCount: documentCountHook } = useRftNewTransmittal({
        rftNewId,
    });

    // Use props if provided, otherwise fall back to hook values
    const hasTransmittal = hasTransmittalProp !== undefined ? hasTransmittalProp : hasTransmittalHook;
    const documentCount = documentCountProp !== undefined ? documentCountProp : documentCountHook;
    const documents: AttachmentDocument[] = transmittal.map((doc) => ({
        id: doc.id,
        documentId: doc.documentId,
        categoryId: doc.categoryId,
        categoryName: doc.categoryName,
        subcategoryId: doc.subcategoryId,
        subcategoryName: doc.subcategoryName,
        documentName: doc.fileName,
        revision: doc.versionNumber,
        addedAt: doc.addedAt ?? doc.uploadedAt ?? '',
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
                canSave={canSaveTransmittal ?? true}
                onLoad={onLoadTransmittal}
                canLoad={hasTransmittal}
                onDownload={onDownloadTransmittal}
                canDownload={hasTransmittal && documentCount > 0 && !isDownloading}
                isDownloading={isDownloading}
                headingLabel="Attachments"
                headingClassName="text-sm font-semibold normal-case text-[var(--color-text-primary)]"
                headingStyle={{}}
                compact={true}
            />
        </div>
    );
}
