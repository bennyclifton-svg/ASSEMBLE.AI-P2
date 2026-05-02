export const DOCUMENT_SELECTION_CHANGED_EVENT = 'assemble:document-selection-changed';

export type DocumentSelectionMode = 'replace' | 'add' | 'remove' | 'clear';

export interface DocumentSelectionChangedDetail {
    projectId: string;
    mode: DocumentSelectionMode;
    documentIds: string[];
}

export function dispatchDocumentSelectionChanged(
    detail: DocumentSelectionChangedDetail
): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<DocumentSelectionChangedDetail>(DOCUMENT_SELECTION_CHANGED_EVENT, {
            detail,
        })
    );
}
