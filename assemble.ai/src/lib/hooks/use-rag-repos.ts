/**
 * T108: RAG Repos Hook
 * Manages global and project RAG repos with save/load functionality
 */

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import type { RepoType } from '@/lib/db/rag-schema';

export interface RAGRepo {
    id: string;
    projectId: string | null;
    name: string;
    description: string | null;
    discipline: string | null;
    repoType: RepoType;
    organizationId: string | null;
    isGlobal: boolean;
    memberCount: number;
    syncedCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface RAGReposResponse {
    globalRepos: RAGRepo[];
    projectRepo: RAGRepo | null;
    needsInitialization: boolean;
    missingTypes: string[];
}

export interface LoadRepoResponse {
    repoId: string;
    repoName: string;
    repoType: string;
    isGlobal: boolean;
    documentIds: string[];
    documentCount: number;
    syncInfo: {
        pending: number;
        processing: number;
        synced: number;
        failed: number;
    };
}

export interface SyncRepoResponse {
    success: boolean;
    repoId: string;
    repoName: string;
    repoType: string;
    documentCount: number;
    message: string;
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
 * Hook for managing RAG repos (global + project)
 */
export function useRAGRepos(projectId: string | null, organizationId: string | null) {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Build query URL
    const hasRequiredParams = projectId && organizationId;
    const url = hasRequiredParams
        ? `/api/rag-repos?projectId=${projectId}&organizationId=${organizationId}`
        : null;

    const {
        data,
        error: fetchError,
        isLoading: isFetching,
        mutate: revalidate,
    } = useSWR<RAGReposResponse>(url, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
    });

    /**
     * Initialize repos for an organization and/or project
     * Creates missing global repos (6) and project repo if needed
     */
    const initializeRepos = useCallback(async (): Promise<boolean> => {
        if (!organizationId) {
            setError('organizationId is required');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/rag-repos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId, projectId }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Initialize failed' }));
                throw new Error(err.error || 'Initialize failed');
            }

            // Revalidate to show new repos
            await revalidate();
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Initialize failed';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, projectId, revalidate]);

    /**
     * Save selected documents to a specific repo
     * Replaces existing documents (full sync)
     */
    const saveToRepo = useCallback(async (
        repoId: string,
        documentIds: string[]
    ): Promise<SyncRepoResponse | null> => {
        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/rag-repos/${repoId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Save failed' }));
                throw new Error(err.error || 'Save failed');
            }

            const result = await res.json();

            // Revalidate repos list to update counts
            await revalidate();
            mutate((key) => typeof key === 'string' && key.includes('sync-status'));

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Save failed';
            setError(message);
            return null;
        } finally {
            setIsSaving(false);
        }
    }, [revalidate]);

    /**
     * Load document IDs from a repo
     * Used to restore selection in DocumentRepository
     */
    const loadFromRepo = useCallback(async (repoId: string): Promise<string[] | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/rag-repos/${repoId}/load`);

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Load failed' }));
                throw new Error(err.error || 'Load failed');
            }

            const result: LoadRepoResponse = await res.json();
            return result.documentIds;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Load failed';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Get detailed info about a repo's contents
     */
    const getRepoInfo = useCallback(async (repoId: string): Promise<LoadRepoResponse | null> => {
        try {
            const res = await fetch(`/api/rag-repos/${repoId}/load`);

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Load failed' }));
                throw new Error(err.error || 'Load failed');
            }

            return await res.json();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Load failed';
            setError(message);
            return null;
        }
    }, []);

    return {
        // Data
        globalRepos: data?.globalRepos || [],
        projectRepo: data?.projectRepo || null,
        needsInitialization: data?.needsInitialization || false,
        missingTypes: data?.missingTypes || [],

        // State
        isFetching,
        isSaving,
        isLoading,
        error: fetchError?.message || error,

        // Actions
        initializeRepos,
        saveToRepo,
        loadFromRepo,
        getRepoInfo,
        revalidate,
    };
}

/**
 * Hook for repo selection in report generation
 * Manages which repos are selected for RAG context
 */
export function useRepoSelection(initialSelectedIds: string[] = []) {
    const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(
        new Set(initialSelectedIds)
    );

    const toggleRepo = useCallback((repoId: string) => {
        setSelectedRepoIds((prev) => {
            const next = new Set(prev);
            if (next.has(repoId)) {
                next.delete(repoId);
            } else {
                next.add(repoId);
            }
            return next;
        });
    }, []);

    const selectRepo = useCallback((repoId: string) => {
        setSelectedRepoIds((prev) => new Set(prev).add(repoId));
    }, []);

    const deselectRepo = useCallback((repoId: string) => {
        setSelectedRepoIds((prev) => {
            const next = new Set(prev);
            next.delete(repoId);
            return next;
        });
    }, []);

    const selectAll = useCallback((repoIds: string[]) => {
        setSelectedRepoIds(new Set(repoIds));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedRepoIds(new Set());
    }, []);

    const isSelected = useCallback((repoId: string) => {
        return selectedRepoIds.has(repoId);
    }, [selectedRepoIds]);

    return {
        selectedRepoIds: Array.from(selectedRepoIds),
        toggleRepo,
        selectRepo,
        deselectRepo,
        selectAll,
        clearSelection,
        isSelected,
        selectionCount: selectedRepoIds.size,
    };
}
