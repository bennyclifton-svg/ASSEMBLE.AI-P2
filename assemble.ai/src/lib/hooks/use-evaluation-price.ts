/**
 * Hook for Managing Evaluation Price Instances
 *
 * Provides functionality to create, update, and delete evaluation price instances per stakeholder.
 * Supports multiple instances per stakeholder with numbered tabs (01, 02, etc.).
 */

'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { useToast } from './use-toast';

export interface EvaluationPriceInstance {
    id: string;
    projectId: string;
    stakeholderId: string | null;
    evaluationPriceNumber: number;
    rowCount: number;
    createdAt: string;
    updatedAt: string;
}

interface UseEvaluationPriceOptions {
    projectId: string;
    stakeholderId?: string | null;
}

interface UseEvaluationPriceReturn {
    evaluationPrices: EvaluationPriceInstance[];
    isLoading: boolean;
    error: Error | null;
    createEvaluationPrice: () => Promise<EvaluationPriceInstance | null>;
    deleteEvaluationPrice: (id: string) => Promise<boolean>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<EvaluationPriceInstance[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch evaluation prices');
    }
    return res.json();
};

/**
 * Hook for managing evaluation price instances per stakeholder
 *
 * @param options.projectId - The project ID
 * @param options.stakeholderId - The stakeholder ID
 */
export function useEvaluationPrice({
    projectId,
    stakeholderId,
}: UseEvaluationPriceOptions): UseEvaluationPriceReturn {
    const { toast } = useToast();

    // Build the query URL for fetching evaluation prices
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (stakeholderId) queryParams.set('stakeholderId', stakeholderId);

    const shouldFetch = projectId && stakeholderId;
    const swrKey = shouldFetch ? `/api/evaluation-price?${queryParams.toString()}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<EvaluationPriceInstance[]>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            fallbackData: [],
        }
    );

    /**
     * Create a new evaluation price instance for the current stakeholder
     */
    const createEvaluationPrice = useCallback(async (): Promise<EvaluationPriceInstance | null> => {
        if (!projectId || !stakeholderId) {
            toast({
                title: 'Error',
                description: 'Project and stakeholder are required',
                variant: 'destructive',
            });
            return null;
        }

        try {
            const response = await fetch('/api/evaluation-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    stakeholderId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create evaluation price');
            }

            const newInstance: EvaluationPriceInstance = await response.json();

            // Revalidate the list
            await localMutate();

            toast({
                title: 'Evaluation created',
                description: `Created Evaluation ${String(newInstance.evaluationPriceNumber).padStart(2, '0')}`,
                variant: 'success',
            });

            return newInstance;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create evaluation price';
            toast({
                title: 'Create failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return null;
        }
    }, [projectId, stakeholderId, localMutate, toast]);

    /**
     * Delete an evaluation price instance
     */
    const deleteEvaluationPrice = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/evaluation-price/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete evaluation price');
            }

            // Revalidate the list
            await localMutate();

            toast({
                title: 'Evaluation deleted',
                description: 'Evaluation has been removed',
                variant: 'success',
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete evaluation price';
            toast({
                title: 'Delete failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [localMutate, toast]);

    /**
     * Manually refetch evaluation prices
     */
    const refetch = useCallback(() => {
        localMutate();
    }, [localMutate]);

    return {
        evaluationPrices: data ?? [],
        isLoading,
        error: error ?? null,
        createEvaluationPrice,
        deleteEvaluationPrice,
        refetch,
    };
}
