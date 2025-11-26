import { DocumentRepository } from '@/components/documents/DocumentRepository';

interface DocumentCardProps {
    projectId: string;
}

export function DocumentCard({ projectId }: DocumentCardProps) {
    return <DocumentRepository projectId={projectId} />;
}
