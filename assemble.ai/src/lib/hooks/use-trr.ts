/**
 * Hook for Managing TRR (Tender Recommendation Report)
 * Feature 012 - TRR Report
 *
 * Provides functionality to create, update, and delete TRRs per stakeholder.
 * Supports multiple TRRs per stakeholder with numbered instances.
 */

'use client';

import useSWR from 'swr';
import { useCallback, useRef } from 'react';
import { TRR, TRRUpdateData } from '@/types/trr';
import { useToast } from './use-toast';

interface UseTRROptions {
    projectId: string;
    stakeholderId?: string | null;
}

interface TRRWithCount extends TRR {
    transmittalCount: number;
}

interface UseTRRReturn {
    trrs: TRRWithCount[];
    isLoading: boolean;
    error: Error | null;
    createTrr: () => Promise<TRRWithCount | null>;
    updateTRR: (trrId: string, data: TRRUpdateData) => Promise<TRR | null>;
    deleteTrr: (trrId: string) => Promise<boolean>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<TRRWithCount[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch TRRs');
    }
    return res.json();
};

/**
 * Hook for managing TRRs per stakeholder
 *
 * @param options.projectId - The project ID
 * @param options.stakeholderId - The stakeholder ID
 */
export function useTRR({
    projectId,
    stakeholderId,
}: UseTRROptions): UseTRRReturn {
    const { toast } = useToast();

    // Build the query URL for fetching TRRs
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (stakeholderId) queryParams.set('stakeholderId', stakeholderId);

    const shouldFetch = projectId && stakeholderId;
    const swrKey = shouldFetch ? `/api/trr?${queryParams.toString()}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<TRRWithCount[]>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            fallbackData: [],
        }
    );

    // Debounce timer ref for auto-save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Create a new TRR for the current stakeholder
     */
    const createTrr = useCallback(async (): Promise<TRRWithCount | null> => {
        if (!projectId || !stakeholderId) {
            toast({
                title: 'Error',
                description: 'Project and stakeholder are required',
                variant: 'destructive',
            });
            return null;
        }

        try {
            const response = await fetch('/api/trr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    stakeholderId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create TRR');
            }

            const newTrr: TRRWithCount = await response.json();

            // Revalidate the list
            await localMutate();

            toast({
                title: 'TRR created',
                description: `Created TRR ${String(newTrr.trrNumber).padStart(2, '0')}`,
                variant: 'success',
            });

            return newTrr;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create TRR';
            toast({
                title: 'Create failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return null;
        }
    }, [projectId, stakeholderId, localMutate, toast]);

    /**
     * Update a TRR with new data
     */
    const updateTRR = useCallback(async (trrId: string, updateData: TRRUpdateData): Promise<TRR | null> => {
        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        try {
            const response = await fetch(`/api/trr/${trrId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                throw new Error('Failed to update TRR');
            }

            const updated = await response.json();

            // Optimistically update local cache
            if (data) {
                const updatedData = data.map(t =>
                    t.id === trrId ? { ...t, ...updated } : t
                );
                localMutate(updatedData, false);
            }

            return updated;
        } catch (err) {
            console.error('Failed to update TRR:', err);
            toast({
                title: 'Save failed',
                description: 'Failed to save changes',
                variant: 'destructive',
            });
            return null;
        }
    }, [data, localMutate, toast]);

    /**
     * Delete a TRR
     */
    const deleteTrr = useCallback(async (trrId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/trr/${trrId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete TRR');
            }

            // Revalidate the list
            await localMutate();

            toast({
                title: 'TRR deleted',
                description: 'TRR has been removed',
                variant: 'success',
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete TRR';
            toast({
                title: 'Delete failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [localMutate, toast]);

    /**
     * Manually refetch TRRs
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        trrs: data ?? [],
        isLoading,
        error: error ?? null,
        createTrr,
        updateTRR,
        deleteTrr,
        refetch,
    };
}
