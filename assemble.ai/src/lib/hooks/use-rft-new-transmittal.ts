/**
 * Hook for Managing RFT NEW Transmittals
 *
 * Provides functionality to save and load document transmittals for RFT NEW reports.
 */

'use client';

import useSWR from 'swr';
import { useCallback, useMemo } from 'react';
import { useToast } from './use-toast';

export interface TransmittalDocument {
    id: string;
    documentId: string;
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
    fileName: string;
    versionNumber: number;
    uploadedAt: string | null;
    addedAt: string;
    // Drawing extraction fields
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    drawingExtractionStatus: string | null;
}

interface UseRftNewTransmittalOptions {
    rftNewId: string | null;
}

interface UseRftNewTransmittalReturn {
    transmittal: TransmittalDocument[];
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<boolean>;
    loadTransmittal: () => string[];
    hasTransmittal: boolean;
    documentCount: number;
}

const fetcher = async (url: string): Promise<TransmittalDocument[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch transmittal');
    }
    return res.json();
};

/**
 * Hook for managing RFT NEW transmittals
 *
 * @param options.rftNewId - The RFT NEW ID
 */
export function useRftNewTransmittal({
    rftNewId,
}: UseRftNewTransmittalOptions): UseRftNewTransmittalReturn {
    const { toast } = useToast();

    const swrKey = rftNewId ? `/api/rft-new/${rftNewId}/transmittal` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<TransmittalDocument[]>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            fallbackData: [],
        }
    );

    /**
     * Save documents to the transmittal
     */
    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<boolean> => {
        if (!rftNewId) {
            toast({
                title: 'Error',
                description: 'No RFT NEW selected',
                variant: 'destructive',
            });
            return false;
        }

        try {
            const response = await fetch(`/api/rft-new/${rftNewId}/transmittal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save transmittal');
            }

            // Revalidate the transmittal data
            await localMutate();

            toast({
                title: 'Transmittal saved',
                description: `Saved ${documentIds.length} document(s) to transmittal`,
                variant: 'success',
            });

            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save transmittal';
            toast({
                title: 'Save failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [rftNewId, localMutate, toast]);

    /**
     * Load transmittal and return document IDs
     */
    const loadTransmittal = useCallback((): string[] => {
        if (!data || data.length === 0) {
            return [];
        }

        return data.map(item => item.documentId);
    }, [data]);

    /**
     * Check if transmittal has documents
     */
    const hasTransmittal = useMemo(() => {
        return (data?.length || 0) > 0;
    }, [data]);

    /**
     * Get document count
     */
    const documentCount = useMemo(() => {
        return data?.length || 0;
    }, [data]);

    return {
        transmittal: data ?? [],
        isLoading,
        error: error ?? null,
        saveTransmittal,
        loadTransmittal,
        hasTransmittal,
        documentCount,
    };
}
