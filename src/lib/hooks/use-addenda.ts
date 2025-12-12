/**
 * T109: Addenda Hook for Managing Addendum Reports
 *
 * Provides functionality to create, update, and delete addenda per discipline/trade.
 * Supports auto-save with debouncing.
 */

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback, useRef } from 'react';
import { useToast } from './use-toast';

export interface Addendum {
    id: string;
    projectId: string;
    disciplineId: string | null;
    tradeId: string | null;
    addendumNumber: number;
    content: string | null;
    transmittalCount: number;
    createdAt: string;
    updatedAt: string;
}

interface UseAddendaOptions {
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
}

interface UseAddendaReturn {
    addenda: Addendum[];
    isLoading: boolean;
    error: Error | null;
    createAddendum: () => Promise<Addendum | null>;
    updateContent: (addendumId: string, content: string) => Promise<boolean>;
    deleteAddendum: (addendumId: string) => Promise<boolean>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<Addendum[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch addenda');
    }
    return res.json();
};

/**
 * Hook for managing addenda per discipline/trade
 *
 * @param options.projectId - The project ID
 * @param options.disciplineId - Optional discipline ID (for consultant addenda)
 * @param options.tradeId - Optional trade ID (for contractor addenda)
 */
export function useAddenda({
    projectId,
    disciplineId,
    tradeId,
}: UseAddendaOptions): UseAddendaReturn {
    const { toast } = useToast();
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Build the query URL for fetching addenda
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (disciplineId) queryParams.set('disciplineId', disciplineId);
    if (tradeId) queryParams.set('tradeId', tradeId);

    const shouldFetch = projectId && (disciplineId || tradeId);
    const swrKey = shouldFetch ? `/api/addenda?${queryParams.toString()}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<Addendum[]>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            fallbackData: [],
        }
    );

    /**
     * Create a new addendum for the current discipline/trade
     */
    const createAddendum = useCallback(async (): Promise<Addendum | null> => {
        if (!projectId || (!disciplineId && !tradeId)) {
            toast({
                title: 'Error',
                description: 'Project and discipline/trade are required',
                variant: 'destructive',
            });
            return null;
        }

        try {
            const response = await fetch('/api/addenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    disciplineId: disciplineId || null,
                    tradeId: tradeId || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create addendum');
            }

            const newAddendum: Addendum = await response.json();

            // Revalidate the list
            await localMutate();

            toast({
                title: 'Addendum created',
                description: `Created Addendum ${String(newAddendum.addendumNumber).padStart(2, '0')}`,
            });

            return newAddendum;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create addendum';
            toast({
                title: 'Create failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return null;
        }
    }, [projectId, disciplineId, tradeId, localMutate, toast]);

    /**
     * Update addendum content with debouncing for auto-save
     */
    const updateContent = useCallback(async (addendumId: string, content: string): Promise<boolean> => {
        // Clear existing debounce timer
        const existingTimer = debounceTimers.current.get(addendumId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new debounce timer
        return new Promise((resolve) => {
            const timer = setTimeout(async () => {
                try {
                    const response = await fetch(`/api/addenda/${addendumId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to save');
                    }

                    // Optimistically update local data
                    if (data) {
                        const updatedData = data.map(a =>
                            a.id === addendumId ? { ...a, content } : a
                        );
                        localMutate(updatedData, false);
                    }

                    resolve(true);
                } catch (err) {
                    console.error('Failed to update addendum content:', err);
                    toast({
                        title: 'Auto-save failed',
                        description: 'Changes may not have been saved',
                        variant: 'destructive',
                    });
                    resolve(false);
                }
            }, 1000); // 1 second debounce

            debounceTimers.current.set(addendumId, timer);
        });
    }, [data, localMutate, toast]);

    /**
     * Delete an addendum
     */
    const deleteAddendum = useCallback(async (addendumId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/addenda/${addendumId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete addendum');
            }

            // Revalidate the list
            await localMutate();

            toast({
                title: 'Addendum deleted',
                description: 'Addendum has been removed',
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete addendum';
            toast({
                title: 'Delete failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [localMutate, toast]);

    /**
     * Manually refetch addenda
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        addenda: data ?? [],
        isLoading,
        error: error ?? null,
        createAddendum,
        updateContent,
        deleteAddendum,
        refetch,
    };
}
