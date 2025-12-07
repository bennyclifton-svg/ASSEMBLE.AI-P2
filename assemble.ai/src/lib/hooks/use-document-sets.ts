/**
 * T034: Document Sets Hook
 * CRUD operations for document sets
 */

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';

export interface DocumentSetMember {
    documentId: string;
    syncStatus: 'pending' | 'processing' | 'synced' | 'failed';
    errorMessage: string | null;
    syncedAt: string | null;
    chunksCreated: number;
    addedAt: string;
}

export interface DocumentSet {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    discipline: string | null;
    isDefault: boolean;
    memberCount?: number;
    syncedCount?: number;
    members?: DocumentSetMember[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateDocumentSetInput {
    projectId: string;
    name: string;
    description?: string;
    discipline?: string;
}

export interface UpdateDocumentSetInput {
    name?: string;
    description?: string;
    discipline?: string;
    isDefault?: boolean;
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
 * Hook for listing document sets
 */
export function useDocumentSets(projectId?: string, discipline?: string) {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (discipline) params.set('discipline', discipline);

    const queryString = params.toString();
    const url = `/api/document-sets${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate: revalidate } = useSWR<{
        documentSets: DocumentSet[];
    }>(url, fetcher);

    return {
        documentSets: data?.documentSets || [],
        isLoading,
        error: error?.message,
        revalidate,
    };
}

/**
 * Hook for getting a single document set with members
 */
export function useDocumentSet(id: string | null) {
    const { data, error, isLoading, mutate: revalidate } = useSWR<DocumentSet>(
        id ? `/api/document-sets/${id}` : null,
        fetcher
    );

    return {
        documentSet: data,
        isLoading,
        error: error?.message,
        revalidate,
    };
}

/**
 * Hook for document set mutations (create, update, delete)
 */
export function useDocumentSetMutations() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createDocumentSet = useCallback(async (input: CreateDocumentSetInput): Promise<DocumentSet | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/document-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Create failed' }));
                throw new Error(err.error || 'Create failed');
            }

            const created = await res.json();

            // Revalidate list
            mutate((key) => typeof key === 'string' && key.startsWith('/api/document-sets'));

            return created;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Create failed';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateDocumentSet = useCallback(async (id: string, input: UpdateDocumentSetInput): Promise<DocumentSet | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/document-sets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Update failed' }));
                throw new Error(err.error || 'Update failed');
            }

            const updated = await res.json();

            // Revalidate
            mutate(`/api/document-sets/${id}`);
            mutate((key) => typeof key === 'string' && key.startsWith('/api/document-sets'));

            return updated;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Update failed';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deleteDocumentSet = useCallback(async (id: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/document-sets/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok && res.status !== 204) {
                const err = await res.json().catch(() => ({ error: 'Delete failed' }));
                throw new Error(err.error || 'Delete failed');
            }

            // Revalidate list
            mutate((key) => typeof key === 'string' && key.startsWith('/api/document-sets'));

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Delete failed';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addDocuments = useCallback(async (setId: string, documentIds: string[]): Promise<{
        added: Array<{ documentId: string; syncStatus: string }>;
        skipped: string[];
    } | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/document-sets/${setId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Add failed' }));
                throw new Error(err.error || 'Add failed');
            }

            const result = await res.json();

            // Revalidate
            mutate(`/api/document-sets/${setId}`);
            mutate((key) => typeof key === 'string' && key.includes('sync-status'));

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Add failed';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const removeDocuments = useCallback(async (setId: string, documentIds: string[]): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/document-sets/${setId}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Remove failed' }));
                throw new Error(err.error || 'Remove failed');
            }

            // Revalidate
            mutate(`/api/document-sets/${setId}`);
            mutate((key) => typeof key === 'string' && key.includes('sync-status'));

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Remove failed';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const retryDocument = useCallback(async (setId: string, documentId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/document-sets/${setId}/members/${documentId}/retry`, {
                method: 'POST',
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Retry failed' }));
                throw new Error(err.error || 'Retry failed');
            }

            // Revalidate
            mutate(`/api/document-sets/${setId}`);
            mutate((key) => typeof key === 'string' && key.includes('sync-status'));

            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Retry failed';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        createDocumentSet,
        updateDocumentSet,
        deleteDocumentSet,
        addDocuments,
        removeDocuments,
        retryDocument,
        isLoading,
        error,
    };
}
