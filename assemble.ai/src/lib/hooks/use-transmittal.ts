/**
 * T030e: Transmittal Hook for Discipline-based Document Management
 *
 * Provides functionality to save and load transmittals per discipline/trade.
 * Transmittals are named "{Discipline/Trade Name} Transmittal" and support upsert.
 */

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback } from 'react';
import { useToast } from './use-toast';

interface Transmittal {
    id: string;
    name: string;
    projectId: string | null;
    disciplineId: string | null;
    tradeId: string | null;
    status: 'DRAFT' | 'ISSUED';
    documentIds: string[];
    documentCount: number;
    createdAt: string;
    updatedAt: string;
}

interface TransmittalResponse {
    id: string;
    name: string;
    projectId: string | null;
    disciplineId: string | null;
    tradeId: string | null;
    status: 'DRAFT' | 'ISSUED';
    issuedAt: string | null;
    createdAt: string;
    updatedAt: string;
    items: Array<{
        id: string;
        versionId: string;
        documentId: string;
        versionNumber: number;
        originalName: string;
        sizeBytes: number;
        addedAt: string;
    }>;
}

interface UseTransmittalOptions {
    projectId: string;
    disciplineId?: string | null;
    tradeId?: string | null;
    contextName?: string; // The display name (e.g., "Fire Services")
}

interface UseTransmittalReturn {
    transmittal: Transmittal | null;
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<{ success: boolean; id?: string; error?: string }>;
    loadTransmittal: () => string[];
    hasTransmittal: boolean;
}

const fetcher = async (url: string): Promise<Transmittal | null> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch transmittal');
    }
    const data: TransmittalResponse = await res.json();

    // Transform response to our interface
    return {
        id: data.id,
        name: data.name,
        projectId: data.projectId,
        disciplineId: data.disciplineId,
        tradeId: data.tradeId,
        status: data.status,
        documentIds: data.items.map(item => item.documentId),
        documentCount: data.items.length,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
};

/**
 * Hook for managing discipline/trade-based transmittals
 *
 * @param options.projectId - The project ID
 * @param options.disciplineId - Optional discipline ID (for consultant transmittals)
 * @param options.tradeId - Optional trade ID (for contractor transmittals)
 * @param options.contextName - Display name for the discipline/trade
 */
export function useTransmittal({
    projectId,
    disciplineId,
    tradeId,
    contextName,
}: UseTransmittalOptions): UseTransmittalReturn {
    const { toast } = useToast();

    // Build the query URL for fetching transmittal
    const queryParams = new URLSearchParams();
    queryParams.set('projectId', projectId);
    if (disciplineId) queryParams.set('disciplineId', disciplineId);
    if (tradeId) queryParams.set('tradeId', tradeId);

    const shouldFetch = projectId && (disciplineId || tradeId);
    const swrKey = shouldFetch ? `/api/transmittals?${queryParams.toString()}` : null;

    const { data, error, isLoading } = useSWR<Transmittal | null>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    /**
     * Save selected documents as a transmittal for the current discipline/trade
     * Upserts (creates or replaces) the transmittal
     */
    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<{ success: boolean; id?: string; error?: string }> => {
        if (!projectId || (!disciplineId && !tradeId)) {
            return { success: false, error: 'Project and discipline/trade are required' };
        }

        if (documentIds.length === 0) {
            return { success: false, error: 'No documents selected' };
        }

        try {
            const name = contextName
                ? `${contextName} Transmittal`
                : `${disciplineId ? 'Discipline' : 'Trade'} Transmittal`;

            const response = await fetch('/api/transmittals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    disciplineId: disciplineId || null,
                    tradeId: tradeId || null,
                    name,
                    documentIds,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save transmittal');
            }

            const result = await response.json();

            // Revalidate the transmittal data
            await mutate(swrKey);

            toast({
                title: 'Transmittal saved',
                description: `Saved ${name} (${documentIds.length} documents)`,
            });

            return { success: true, id: result.id };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save transmittal';
            toast({
                title: 'Save failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return { success: false, error: errorMessage };
        }
    }, [projectId, disciplineId, tradeId, contextName, swrKey, toast]);

    /**
     * Load the transmittal's document IDs
     * Returns an array of document IDs that should replace the current selection
     */
    const loadTransmittal = useCallback((): string[] => {
        if (!data) {
            return [];
        }

        const name = contextName
            ? `${contextName} Transmittal`
            : data.name;

        toast({
            title: 'Transmittal loaded',
            description: `Loaded ${name} (${data.documentCount} documents)`,
        });

        return data.documentIds;
    }, [data, contextName, toast]);

    return {
        transmittal: data ?? null,
        isLoading,
        error: error ?? null,
        saveTransmittal,
        loadTransmittal,
        hasTransmittal: !!data && data.documentCount > 0,
    };
}
