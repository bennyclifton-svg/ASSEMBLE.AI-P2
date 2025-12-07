import { DocumentRepository } from '@/components/documents/DocumentRepository';

interface DocumentCardProps {
    projectId: string;
    selectedDocumentIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
}

export function DocumentCard({ projectId, selectedDocumentIds, onSelectionChange }: DocumentCardProps) {
    return (
        <DocumentRepository
            projectId={projectId}
            selectedIds={selectedDocumentIds}
            onSelectionChange={onSelectionChange}
        />
    );
}
