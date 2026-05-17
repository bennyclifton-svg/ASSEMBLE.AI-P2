'use client';

import { useCallback, useEffect, useState } from 'react';
import { AttachmentSection, type AttachmentDocument } from '@/components/notes-meetings-reports/shared';
import { useToast } from '@/components/ui/use-toast';

interface BriefAttachment {
    attachmentId: string;
    documentId: string;
    title: string;
    type: string | null;
    ocrStatus: string | null;
    ragStatus: string | null;
    attachedAt: string | null;
}

interface BriefAttachmentsSectionProps {
    projectId: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    onAttachmentsChanged?: () => void;
}

function toAttachmentDocument(doc: BriefAttachment): AttachmentDocument {
    return {
        id: doc.attachmentId,
        documentId: doc.documentId,
        categoryName: doc.type,
        subcategoryName: null,
        documentName: doc.title,
        revision: 0,
        addedAt: doc.attachedAt ?? '',
        ingestStatus: doc.ragStatus ?? doc.ocrStatus ?? 'pending',
    };
}

export function BriefAttachmentsSection({
    projectId,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    onAttachmentsChanged,
}: BriefAttachmentsSectionProps) {
    const { toast } = useToast();
    const [documents, setDocuments] = useState<AttachmentDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAttachments = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/briefing/attachments`);
            if (!res.ok) throw new Error(`Failed to load (${res.status})`);
            const json = await res.json();
            const docs = Array.isArray(json.documents)
                ? json.documents.map((doc: BriefAttachment) => toAttachmentDocument(doc))
                : [];
            setDocuments(docs);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        void fetchAttachments();
    }, [fetchAttachments]);

    const attachSelected = useCallback(async () => {
        if (selectedDocumentIds.length === 0) {
            toast({
                title: 'Select documents first',
                description: 'Choose documents in the repository panel, then attach them here.',
            });
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/briefing/attachments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: selectedDocumentIds }),
            });
            if (!res.ok) throw new Error(`Attach failed (${res.status})`);
            const json = await res.json();
            const docs = Array.isArray(json.documents)
                ? json.documents.map((doc: BriefAttachment) => toAttachmentDocument(doc))
                : [];
            setDocuments(docs);
            onAttachmentsChanged?.();
            toast({
                title: 'Briefing documents attached',
                description: `${selectedDocumentIds.length} selected document${selectedDocumentIds.length === 1 ? '' : 's'} available to the agent.`,
            });
        } catch (error) {
            toast({
                title: 'Attach failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [onAttachmentsChanged, projectId, selectedDocumentIds, toast]);

    const loadSelection = useCallback(() => {
        onSetSelectedDocumentIds?.(documents.map((doc) => doc.documentId));
    }, [documents, onSetSelectedDocumentIds]);

    const detach = useCallback(async (documentId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/projects/${projectId}/briefing/attachments?documentId=${encodeURIComponent(documentId)}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error(`Detach failed (${res.status})`);
            await fetchAttachments();
            onAttachmentsChanged?.();
        } finally {
            setIsLoading(false);
        }
    }, [fetchAttachments, onAttachmentsChanged, projectId]);

    return (
        <div className="px-3 py-3">
            <AttachmentSection
                documents={documents}
                isLoading={isLoading}
                headingLabel="attach documents"
                accentColor="var(--sw-rose)"
                onSave={attachSelected}
                canSave={selectedDocumentIds.length > 0}
                saveLabel="Attach selected"
                onLoad={onSetSelectedDocumentIds ? loadSelection : undefined}
                loadLabel="Load selection"
                onRemove={detach}
                showRemove
                compact
                emptyMessage="No briefing documents attached. Select documents in the repository, then attach them here."
            />
        </div>
    );
}
