/**
 * T110: Addendum Transmittal Hook
 *
 * Provides functionality to save and load transmittals per addendum.
 * Transmittals are independent per addendum (separate from RFT transmittals).
 */

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { useToast } from './use-toast';

interface TransmittalDocument {
    id: string;
    documentId: string;
    sortOrder: number;
    createdAt: string | null;
    versionNumber: number;
    originalName: string;
    sizeBytes: number;
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
}

interface AddendumTransmittal {
    addendumId: string;
    documents: TransmittalDocument[];
    count: number;
}

interface UseAddendumTransmittalOptions {
    addendumId: string | null;
}

interface UseAddendumTransmittalReturn {
    transmittal: AddendumTransmittal | null;
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<{ success: boolean; error?: string }>;
    loadTransmittal: () => string[];
    clearTransmittal: () => Promise<boolean>;
    hasTransmittal: boolean;
    documentCount: number;
}

const fetcher = async (url: string): Promise<AddendumTransmittal | null> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch addendum transmittal');
    }
    return res.json();
};

/**
 * Hook for managing addendum-specific transmittals
 *
 * @param options.addendumId - The addendum ID
 */
export function useAddendumTransmittal({
    addendumId,
}: UseAddendumTransmittalOptions): UseAddendumTransmittalReturn {
    const { toast } = useToast();

    const swrKey = addendumId ? `/api/addenda/${addendumId}/transmittal` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<AddendumTransmittal | null>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    /**
     * Save selected documents as the addendum's transmittal
     * Replaces all existing transmittal documents
     */
    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<{ success: boolean; error?: string }> => {
        if (!addendumId) {
            return { success: false, error: 'Addendum ID is required' };
        }

        try {
            const response = await fetch(`/api/addenda/${addendumId}/transmittal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save transmittal');
            }

            const result = await response.json();

            // Revalidate the transmittal data
            await localMutate();

            toast({
                title: 'Transmittal saved',
                description: `Saved ${result.documentCount} document${result.documentCount !== 1 ? 's' : ''} to addendum`,
            });

            return { success: true };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save transmittal';
            toast({
                title: 'Save failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return { success: false, error: errorMessage };
        }
    }, [addendumId, localMutate, toast]);

    /**
     * Load the transmittal's document IDs
     * Returns an array of document IDs that should be used for selection
     */
    const loadTransmittal = useCallback((): string[] => {
        if (!data || data.documents.length === 0) {
            toast({
                title: 'No transmittal',
                description: 'This addendum has no saved transmittal documents',
            });
            return [];
        }

        const documentIds = data.documents.map(doc => doc.documentId);

        toast({
            title: 'Transmittal loaded',
            description: `Loaded ${data.count} document${data.count !== 1 ? 's' : ''} from addendum`,
        });

        return documentIds;
    }, [data, toast]);

    /**
     * Clear all transmittal documents from the addendum
     */
    const clearTransmittal = useCallback(async (): Promise<boolean> => {
        if (!addendumId) {
            return false;
        }

        try {
            const response = await fetch(`/api/addenda/${addendumId}/transmittal`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to clear transmittal');
            }

            // Revalidate the transmittal data
            await localMutate();

            toast({
                title: 'Transmittal cleared',
                description: 'All documents removed from addendum transmittal',
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to clear transmittal';
            toast({
                title: 'Clear failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [addendumId, localMutate, toast]);

    return {
        transmittal: data ?? null,
        isLoading,
        error: error ?? null,
        saveTransmittal,
        loadTransmittal,
        clearTransmittal,
        hasTransmittal: !!data && data.count > 0,
        documentCount: data?.count ?? 0,
    };
}
