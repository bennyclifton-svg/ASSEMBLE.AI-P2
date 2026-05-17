'use client';

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useProjectEvents } from '@/lib/hooks/use-project-events';
import type {
    AiMemoryEntry,
    AiMemoryListResponse,
    CreateAiMemoryEntryRequest,
    UpdateAiMemoryEntryRequest,
} from '@/types/ai-memory';

interface UseAiMemoryReturn {
    entries: AiMemoryEntry[];
    activeCount: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface UseAiMemoryMutationsReturn {
    createEntry: (data: CreateAiMemoryEntryRequest) => Promise<AiMemoryEntry>;
    updateEntry: (entryId: string, data: UpdateAiMemoryEntryRequest) => Promise<AiMemoryEntry>;
    deleteEntry: (entryId: string) => Promise<AiMemoryEntry>;
}

async function fetcher<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}

function listKey(projectId: string): string {
    return `/api/projects/${projectId}/ai-memory`;
}

export function useAiMemory(projectId: string): UseAiMemoryReturn {
    const swrKey = projectId ? listKey(projectId) : null;
    const { data, error, isLoading, mutate } = useSWR<AiMemoryListResponse>(swrKey, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 3000,
    });

    useProjectEvents(
        projectId || null,
        useCallback(
            (event) => {
                if (event.type !== 'entity_updated' || event.entity !== 'ai_memory') return;
                mutate();
            },
            [mutate]
        )
    );

    return {
        entries: data?.entries ?? [],
        activeCount: data?.activeCount ?? 0,
        isLoading,
        error: error ?? null,
        refetch: () => {
            mutate();
        },
    };
}

export function useAiMemoryMutations(projectId: string): UseAiMemoryMutationsReturn {
    const mutateList = useCallback(() => {
        globalMutate(listKey(projectId));
    }, [projectId]);

    const createEntry = useCallback(async (data: CreateAiMemoryEntryRequest): Promise<AiMemoryEntry> => {
        const response = await fetch(listKey(projectId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to create memory entry' }));
            throw new Error(error.error || 'Failed to create memory entry');
        }
        const created = await response.json();
        mutateList();
        return created;
    }, [mutateList, projectId]);

    const updateEntry = useCallback(async (
        entryId: string,
        data: UpdateAiMemoryEntryRequest
    ): Promise<AiMemoryEntry> => {
        const response = await fetch(`/api/projects/${projectId}/ai-memory/${entryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update memory entry' }));
            throw new Error(error.error || 'Failed to update memory entry');
        }
        const updated = await response.json();
        mutateList();
        return updated;
    }, [mutateList, projectId]);

    const deleteEntry = useCallback(async (entryId: string): Promise<AiMemoryEntry> => {
        const response = await fetch(`/api/projects/${projectId}/ai-memory/${entryId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to delete memory entry' }));
            throw new Error(error.error || 'Failed to delete memory entry');
        }
        const deleted = await response.json();
        mutateList();
        return deleted;
    }, [mutateList, projectId]);

    return { createEntry, updateEntry, deleteEntry };
}
