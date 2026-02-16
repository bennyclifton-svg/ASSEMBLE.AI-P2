'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { useToast } from './use-toast';

export interface MeetingGroup {
    id: string;
    projectId: string;
    organizationId: string;
    groupNumber: number;
    title: string;
    createdAt: string;
    updatedAt: string;
}

interface UseMeetingGroupsReturn {
    groups: MeetingGroup[];
    isLoading: boolean;
    error: Error | null;
    createGroup: (title?: string) => Promise<MeetingGroup | null>;
    renameGroup: (groupId: string, title: string) => Promise<boolean>;
    deleteGroup: (groupId: string) => Promise<boolean>;
    refetch: () => void;
}

const fetcher = async (url: string): Promise<MeetingGroup[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch meeting groups');
    }
    return res.json();
};

export function useMeetingGroups(projectId: string): UseMeetingGroupsReturn {
    const { toast } = useToast();

    const swrKey = projectId ? `/api/meeting-groups?projectId=${projectId}` : null;

    const { data, error, isLoading, mutate: localMutate } = useSWR<MeetingGroup[]>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
            fallbackData: [],
        }
    );

    const createGroup = useCallback(async (title?: string): Promise<MeetingGroup | null> => {
        if (!projectId) return null;

        try {
            const response = await fetch('/api/meeting-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, title }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create meeting group');
            }

            const newGroup: MeetingGroup = await response.json();
            await localMutate();
            return newGroup;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create meeting group';
            toast({
                title: 'Create failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return null;
        }
    }, [projectId, localMutate, toast]);

    const renameGroup = useCallback(async (groupId: string, title: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/meeting-groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            });

            if (!response.ok) throw new Error('Failed to rename');

            // Optimistic update
            if (data) {
                const updated = data.map(g =>
                    g.id === groupId ? { ...g, title } : g
                );
                localMutate(updated, false);
            }

            return true;
        } catch (err) {
            console.error('Failed to rename meeting group:', err);
            toast({
                title: 'Rename failed',
                description: 'Failed to rename meeting group',
                variant: 'destructive',
            });
            return false;
        }
    }, [data, localMutate, toast]);

    const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/meeting-groups/${groupId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to delete meeting group');
            }

            await localMutate();
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete meeting group';
            toast({
                title: 'Delete failed',
                description: errorMessage,
                variant: 'destructive',
            });
            return false;
        }
    }, [localMutate, toast]);

    return {
        groups: data || [],
        isLoading,
        error: error || null,
        createGroup,
        renameGroup,
        deleteGroup,
        refetch: () => localMutate(),
    };
}
