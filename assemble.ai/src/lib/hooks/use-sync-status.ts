/**
 * T035: Sync Status Hook
 * Poll sync status for documents with SWR
 */

import useSWR from 'swr';
import { useCallback, useMemo } from 'react';

export interface SyncStatus {
    status: 'pending' | 'processing' | 'synced' | 'failed' | null;
    documentSetIds: string[];
    chunksCreated: number;
    errorMessage: string | null;
    syncedAt: string | null;
}

export interface SyncStatusMap {
    [documentId: string]: SyncStatus;
}

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    return res.json();
};

/**
 * Hook for fetching sync status of multiple documents
 * Polls every 5 seconds when there are processing documents
 */
export function useSyncStatus(documentIds: string[]) {
    // Build URL with document IDs
    const url = useMemo(() => {
        if (documentIds.length === 0) return null;
        const params = new URLSearchParams();
        params.set('documentIds', documentIds.join(','));
        return `/api/document-sets/sync-status?${params.toString()}`;
    }, [documentIds]);

    const { data, error, isLoading, mutate: revalidate } = useSWR<{
        statuses: SyncStatusMap;
    }>(
        url,
        fetcher,
        {
            // Poll every 5 seconds if there are processing documents
            refreshInterval: (data) => {
                if (!data?.statuses) return 0;
                const hasProcessing = Object.values(data.statuses).some(
                    (s) => s.status === 'processing' || s.status === 'pending'
                );
                return hasProcessing ? 5000 : 0;
            },
            // Revalidate on focus
            revalidateOnFocus: true,
            // Keep previous data while revalidating
            keepPreviousData: true,
        }
    );

    // Get status for a single document
    const getStatus = useCallback(
        (documentId: string): SyncStatus | null => {
            return data?.statuses?.[documentId] || null;
        },
        [data]
    );

    // Check if any document is currently syncing
    const hasSyncing = useMemo(() => {
        if (!data?.statuses) return false;
        return Object.values(data.statuses).some(
            (s) => s.status === 'processing' || s.status === 'pending'
        );
    }, [data]);

    // Get count of documents by status
    const statusCounts = useMemo(() => {
        const counts = {
            pending: 0,
            processing: 0,
            synced: 0,
            failed: 0,
            notSynced: 0,
        };

        if (!data?.statuses) return counts;

        for (const status of Object.values(data.statuses)) {
            if (status.status === 'pending') counts.pending++;
            else if (status.status === 'processing') counts.processing++;
            else if (status.status === 'synced') counts.synced++;
            else if (status.status === 'failed') counts.failed++;
            else counts.notSynced++;
        }

        return counts;
    }, [data]);

    return {
        statuses: data?.statuses || {},
        getStatus,
        hasSyncing,
        statusCounts,
        isLoading,
        error: error?.message,
        revalidate,
    };
}

/**
 * Hook for a single document's sync status
 */
export function useDocumentSyncStatus(documentId: string | null) {
    const documentIds = useMemo(
        () => (documentId ? [documentId] : []),
        [documentId]
    );

    const { statuses, isLoading, error, revalidate } = useSyncStatus(documentIds);

    const status = documentId ? statuses[documentId] : null;

    return {
        status: status?.status || null,
        documentSetIds: status?.documentSetIds || [],
        chunksCreated: status?.chunksCreated || 0,
        errorMessage: status?.errorMessage || null,
        syncedAt: status?.syncedAt || null,
        isSynced: status?.status === 'synced',
        isSyncing: status?.status === 'processing' || status?.status === 'pending',
        hasFailed: status?.status === 'failed',
        isInSet: (status?.documentSetIds?.length || 0) > 0,
        isLoading,
        error,
        revalidate,
    };
}

/**
 * Hook for batch checking if documents are synced
 */
export function useSyncedDocuments(documentIds: string[]) {
    const { statuses, isLoading, error } = useSyncStatus(documentIds);

    const syncedDocumentIds = useMemo(() => {
        return Object.entries(statuses)
            .filter(([_, status]) => status.status === 'synced')
            .map(([docId]) => docId);
    }, [statuses]);

    const isSynced = useCallback(
        (documentId: string): boolean => {
            return statuses[documentId]?.status === 'synced';
        },
        [statuses]
    );

    return {
        syncedDocumentIds,
        isSynced,
        isLoading,
        error,
    };
}
