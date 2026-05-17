'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import type {
    Clarification,
    ClarificationMateriality,
    ClarificationStatus,
} from '@/types/evaluation';
import { useToast } from './use-toast';

interface UseClarificationsOptions {
    projectId: string;
    stakeholderId?: string | null;
}

interface CreateClarificationInput {
    firmId: string;
    firmType: 'consultant' | 'contractor';
    questionText: string;
    category?: string | null;
    materiality?: ClarificationMateriality;
    linkedRowIds?: string[];
}

interface UpdateClarificationInput {
    questionText?: string;
    category?: string | null;
    materiality?: ClarificationMateriality;
    status?: ClarificationStatus;
    responseText?: string | null;
    linkedRowIds?: string[];
}

const fetcher = async (url: string): Promise<Clarification[]> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to load clarifications');
    }
    return response.json();
};

export function useClarifications({ projectId, stakeholderId }: UseClarificationsOptions) {
    const { toast } = useToast();
    const params = new URLSearchParams({ projectId });
    if (stakeholderId) params.set('stakeholderId', stakeholderId);
    const key = projectId && stakeholderId ? `/api/clarifications?${params.toString()}` : null;

    const { data, error, isLoading, mutate } = useSWR<Clarification[]>(key, fetcher, {
        revalidateOnFocus: false,
        fallbackData: [],
    });

    const createClarification = useCallback(async (input: CreateClarificationInput) => {
        if (!projectId || !stakeholderId) return null;

        try {
            const response = await fetch('/api/clarifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    stakeholderId,
                    ...input,
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to create clarification');
            }

            const created = await response.json();
            await mutate();
            return created as Clarification;
        } catch (err) {
            toast({
                title: 'Clarification not created',
                description: err instanceof Error ? err.message : 'Failed to create clarification',
                variant: 'destructive',
            });
            return null;
        }
    }, [projectId, stakeholderId, mutate, toast]);

    const updateClarification = useCallback(async (id: string, input: UpdateClarificationInput) => {
        try {
            const response = await fetch(`/api/clarifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to update clarification');
            }

            const updated = await response.json();
            await mutate();
            return updated as Clarification;
        } catch (err) {
            toast({
                title: 'Clarification not saved',
                description: err instanceof Error ? err.message : 'Failed to update clarification',
                variant: 'destructive',
            });
            return null;
        }
    }, [mutate, toast]);

    const promoteToAddendum = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/clarifications/${id}/promote-to-addendum`, {
                method: 'POST',
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to promote clarification');
            }

            const result = await response.json();
            await mutate();
            return result;
        } catch (err) {
            toast({
                title: 'Addendum candidate not created',
                description: err instanceof Error ? err.message : 'Failed to promote clarification',
                variant: 'destructive',
            });
            return null;
        }
    }, [mutate, toast]);

    return {
        clarifications: data ?? [],
        isLoading,
        error: error ?? null,
        createClarification,
        updateClarification,
        promoteToAddendum,
        refetch: mutate,
    };
}
