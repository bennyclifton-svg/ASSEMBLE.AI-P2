/**
 * Hook for Managing TRR (Tender Recommendation Report)
 * Feature 012 - TRR Report
 *
 * Automatically gets or creates the TRR for a given project+discipline/trade.
 * There is only one TRR per discipline/trade.
 */

'use client';

import useSWR from 'swr';
import { useCallback, useRef } from 'react';
import { TRR, TRRUpdateData } from '@/types/trr';

interface UseTRROptions {
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
}

interface TRRWithCount extends TRR {
    transmittalCount: number;
}

interface UseTRRReturn {
    trr: TRRWithCount | null;
    isLoading: boolean;
    error: Error | null;
    updateTRR: (data: TRRUpdateData) => Promise<TRR>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<TRRWithCount> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('Failed to fetch TRR');
    }
    return res.json();
};

/**
 * Hook for getting/creating the TRR report for a discipline/trade
 *
 * @param options.projectId - The project ID
 * @param options.disciplineId - Optional discipline ID (for consultant TRR)
 * @param options.tradeId - Optional trade ID (for contractor TRR)
 */
export function useTRR({
    projectId,
    disciplineId,
    tradeId,
}: UseTRROptions): UseTRRReturn {
    // Build the query URL for fetching/creating TRR
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (disciplineId) queryParams.set('disciplineId', disciplineId);
    if (tradeId) queryParams.set('tradeId', tradeId);

    const shouldFetch = projectId && (disciplineId || tradeId);
    const swrKey = shouldFetch ? `/api/trr?${queryParams.toString()}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<TRRWithCount>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    // Debounce timer ref for auto-save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Update the TRR with new data
     */
    const updateTRR = useCallback(async (updateData: TRRUpdateData): Promise<TRR> => {
        if (!data?.id) {
            throw new Error('TRR not loaded');
        }

        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        const response = await fetch(`/api/trr/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            throw new Error('Failed to update TRR');
        }

        const updated = await response.json();

        // Optimistically update local cache
        localMutate((prev) => (prev ? { ...prev, ...updated } : prev), false);

        return updated;
    }, [data?.id, localMutate]);

    /**
     * Manually refetch TRR
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        trr: data ?? null,
        isLoading,
        error: error ?? null,
        updateTRR,
        refetch,
    };
}
