'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import type { CoachingModule } from '@/lib/constants/coaching-checklists';

export interface ChecklistItem {
    id: string;
    label: string;
    description: string;
    isChecked: boolean;
    checkedAt: string | null;
    checkedBy: string | null;
}

export interface CoachingChecklist {
    id: string;
    projectId: string;
    templateId: string;
    module: string;
    title: string;
    coachingCategory: string;
    lifecycleStages: string[];
    items: ChecklistItem[];
    source: string;
    isDismissed: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch checklists');
    return res.json();
});

/**
 * SWR hook for coaching checklists.
 * Returns checklists filtered by module, with toggle and dismiss mutations.
 */
export function useCoachingChecklists(projectId: string | undefined, module?: CoachingModule) {
    const cacheKey = projectId
        ? `/api/projects/${projectId}/coaching/checklists${module ? `?module=${module}` : ''}`
        : null;

    const { data, error, isLoading } = useSWR<CoachingChecklist[]>(
        cacheKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    // Filter out dismissed checklists by default
    const activeChecklists = data?.filter((c) => !c.isDismissed) ?? [];
    const dismissedChecklists = data?.filter((c) => c.isDismissed) ?? [];

    const toggleItem = useCallback(
        async (checklistId: string, itemId: string, isChecked: boolean) => {
            if (!projectId || !cacheKey) return;

            // Optimistic update
            mutate(
                cacheKey,
                (current: CoachingChecklist[] | undefined) =>
                    current?.map((c) => {
                        if (c.id !== checklistId) return c;
                        return {
                            ...c,
                            items: c.items.map((item) =>
                                item.id === itemId
                                    ? {
                                          ...item,
                                          isChecked,
                                          checkedAt: isChecked ? new Date().toISOString() : null,
                                      }
                                    : item
                            ),
                        };
                    }),
                false
            );

            try {
                await fetch(`/api/projects/${projectId}/coaching/checklists`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checklistId, itemId, isChecked }),
                });
                // Revalidate to sync
                mutate(cacheKey);
            } catch {
                // Revalidate to rollback on error
                mutate(cacheKey);
            }
        },
        [projectId, cacheKey]
    );

    const dismissChecklist = useCallback(
        async (checklistId: string, isDismissed: boolean) => {
            if (!projectId || !cacheKey) return;

            // Optimistic update
            mutate(
                cacheKey,
                (current: CoachingChecklist[] | undefined) =>
                    current?.map((c) =>
                        c.id === checklistId ? { ...c, isDismissed } : c
                    ),
                false
            );

            try {
                await fetch(
                    `/api/projects/${projectId}/coaching/checklists/${checklistId}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isDismissed }),
                    }
                );
                mutate(cacheKey);
            } catch {
                mutate(cacheKey);
            }
        },
        [projectId, cacheKey]
    );

    return {
        checklists: activeChecklists,
        dismissedChecklists,
        allChecklists: data ?? [],
        toggleItem,
        dismissChecklist,
        isLoading,
        error,
    };
}
