/**
 * Hook for Managing RFT NEW Reports
 *
 * Provides functionality to create, update, and delete RFTs per stakeholder.
 * Supports multiple RFTs per stakeholder with numbered instances.
 */

'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { useToast } from './use-toast';

export interface RftNew {
    id: string;
    projectId: string;
    stakeholderId: string | null;
    rftNumber: number;
    rftDate: string | null;
    transmittalCount: number;
    createdAt: string;
    updatedAt: string;
}

interface UseRftNewOptions {
    projectId: string;
    stakeholderId?: string | null;
}

interface UseRftNewReturn {
    rfts: RftNew[];
    isLoading: boolean;
    error: Error | null;
    createRft: () => Promise<RftNew | null>;
    updateRftDate: (rftId: string, date: string) => Promise<boolean>;
    deleteRft: (rftId: string) => Promise<boolean>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<RftNew[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch RFTs');
    }
    return res.json();
};

/**
 * Hook for managing RFTs per stakeholder
 *
 * @param options.projectId - The project ID
 * @param options.stakeholderId - The stakeholder ID
 */
export function useRftNew({
    projectId,
    stakeholderId,
}: UseRftNewOptions): UseRftNewReturn {
    const { toast } = useToast();

    // Build the query URL for fetching RFTs
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (stakeholderId) queryParams.set('stakeholderId', stakeholderId);

    const shouldFetch = projectId && stakeholderId;
    const swrKey = shouldFetch ? `/api/rft-new?${queryParams.toString()}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<RftNew[]>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            fallbackData: [],
        }
    );

    /**
     * Create a new RFT for the current stakeholder
     */
    const createRft = useCallback(async (): Promise<RftNew | null> => {
        if (!projectId || !stakeholderId) {
            toast({
                title: 'Error',
                description: 'Project and stakeholder are required',
                variant: 'destructive',
            });
            return null;
        }

        try {
            const response = await fetch('/api/rft-new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    stakeholderId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create RFT');
            }

            const newRft: RftNew = await response.json();

            // Revalidate the list
            await localMutate();

            toast({
                title: 'RFT created',
                description: `Created RFT ${String(newRft.rftNumber).padStart(2, '0')}`,
            });

            return newRft;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create RFT';
            toast({
                title: 'Create failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return null;
        }
    }, [projectId, stakeholderId, localMutate, toast]);

    /**
     * Update RFT date
     */
    const updateRftDate = useCallback(async (rftId: string, date: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/rft-new/${rftId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rftDate: date }),
            });

            if (!response.ok) {
                throw new Error('Failed to save');
            }

            // Optimistically update local data
            if (data) {
                const updatedData = data.map(r =>
                    r.id === rftId ? { ...r, rftDate: date } : r
                );
                localMutate(updatedData, false);
            }

            return true;
        } catch (err) {
            console.error('Failed to update RFT date:', err);
            toast({
                title: 'Save failed',
                description: 'Failed to save date',
                variant: 'destructive',
            });
            return false;
        }
    }, [data, localMutate, toast]);

    /**
     * Delete an RFT
     */
    const deleteRft = useCallback(async (rftId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/rft-new/${rftId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete RFT');
            }

            // Revalidate the list
            await localMutate();

            toast({
                title: 'RFT deleted',
                description: 'RFT has been removed',
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete RFT';
            toast({
                title: 'Delete failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [localMutate, toast]);

    /**
     * Manually refetch RFTs
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        rfts: data ?? [],
        isLoading,
        error: error ?? null,
        createRft,
        updateRftDate,
        deleteRft,
        refetch,
    };
}
