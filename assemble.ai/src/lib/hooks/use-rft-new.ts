/**
 * Hook for Managing RFT NEW Report
 *
 * Automatically gets or creates the RFT NEW for a given project+stakeholder.
 * There is only one RFT NEW per stakeholder.
 */

'use client';

import useSWR from 'swr';
import { useCallback } from 'react';

export interface RftNew {
    id: string;
    projectId: string;
    stakeholderId: string | null;
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
    rftNew: RftNew | null;
    isLoading: boolean;
    error: Error | null;
    updateRftDate: (date: string) => Promise<void>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<RftNew> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('Failed to fetch RFT NEW');
    }
    return res.json();
};

/**
 * Hook for getting/creating the RFT NEW report for a stakeholder
 *
 * @param options.projectId - The project ID
 * @param options.stakeholderId - The stakeholder ID
 */
export function useRftNew({
    projectId,
    stakeholderId,
}: UseRftNewOptions): UseRftNewReturn {
    // Build the query URL for fetching/creating RFT NEW
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (stakeholderId) queryParams.set('stakeholderId', stakeholderId);

    const shouldFetch = projectId && stakeholderId;
    const swrKey = shouldFetch ? `/api/rft-new?${queryParams.toString()}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<RftNew>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    /**
     * Update the RFT date
     */
    const updateRftDate = useCallback(async (date: string): Promise<void> => {
        if (!data?.id) return;

        // Optimistically update local cache
        localMutate((prev) => prev ? { ...prev, rftDate: date } : prev, false);

        try {
            const response = await fetch(`/api/rft-new/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rftDate: date }),
            });

            if (!response.ok) {
                throw new Error('Failed to update RFT date');
            }

            // Revalidate to ensure sync with server
            localMutate();
        } catch (error) {
            // Revert on error
            localMutate();
            console.error('Failed to update RFT date:', error);
        }
    }, [data?.id, localMutate]);

    /**
     * Manually refetch RFT NEW
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        rftNew: data ?? null,
        isLoading,
        error: error ?? null,
        updateRftDate,
        refetch,
    };
}
