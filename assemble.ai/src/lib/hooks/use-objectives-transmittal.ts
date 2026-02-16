/**
 * Hook for managing objectives transmittal (document attachments)
 */

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

interface TransmittalDocument {
    id: string;
    documentId: string;
    documentName: string;
    categoryName: string | null;
    subcategoryName: string | null;
    fileName: string | null;
    versionNumber: number | null;
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    addedAt: string | null;
}

interface UseObjectivesTransmittalReturn {
    documents: TransmittalDocument[];
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<void>;
    refetch: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export function useObjectivesTransmittal(projectId: string | null): UseObjectivesTransmittalReturn {
    const swrKey = projectId ? `/api/projects/${projectId}/objectives/transmittal` : null;

    const { data, error, isLoading, mutate } = useSWR<{ projectId: string; documents: TransmittalDocument[] }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<void> => {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const response = await fetch(`/api/projects/${projectId}/objectives/transmittal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to save transmittal' }));
            throw new Error(error.error || 'Failed to save transmittal');
        }

        mutate();
    }, [projectId, mutate]);

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    return {
        documents: data?.documents ?? [],
        isLoading,
        error: error ?? null,
        saveTransmittal,
        refetch,
    };
}
