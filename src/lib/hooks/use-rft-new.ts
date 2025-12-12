/**
 * Hook for Managing RFT NEW Report
 *
 * Automatically gets or creates the RFT NEW for a given project+discipline/trade.
 * There is only one RFT NEW per discipline/trade.
 */

'use client';

import useSWR from 'swr';
import { useCallback } from 'react';

export interface RftNew {
    id: string;
    projectId: string;
    disciplineId: string | null;
    tradeId: string | null;
    transmittalCount: number;
    createdAt: string;
    updatedAt: string;
}

interface UseRftNewOptions {
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
}

interface UseRftNewReturn {
    rftNew: RftNew | null;
    isLoading: boolean;
    error: Error | null;
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
 * Hook for getting/creating the RFT NEW report for a discipline/trade
 *
 * @param options.projectId - The project ID
 * @param options.disciplineId - Optional discipline ID (for consultant RFT NEW)
 * @param options.tradeId - Optional trade ID (for contractor RFT NEW)
 */
export function useRftNew({
    projectId,
    disciplineId,
    tradeId,
}: UseRftNewOptions): UseRftNewReturn {
    // Build the query URL for fetching/creating RFT NEW
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (disciplineId) queryParams.set('disciplineId', disciplineId);
    if (tradeId) queryParams.set('tradeId', tradeId);

    const shouldFetch = projectId && (disciplineId || tradeId);
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
     * Manually refetch RFT NEW
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        rftNew: data ?? null,
        isLoading,
        error: error ?? null,
        refetch,
    };
}
