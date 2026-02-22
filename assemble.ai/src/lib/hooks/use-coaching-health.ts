'use client';

import useSWR from 'swr';
import type { CoachingChecklist } from './use-coaching-checklists';

interface ModuleHealth {
    module: string;
    checked: number;
    total: number;
    complete: boolean;
}

interface CoachingHealth {
    percentage: number;
    modules: ModuleHealth[];
    totalChecked: number;
    totalItems: number;
}

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch checklists');
    return res.json();
});

/**
 * Hook that aggregates checklist completion across all modules for a project.
 * Returns overall health percentage and per-module breakdown.
 */
export function useCoachingHealth(projectId: string | undefined) {
    const cacheKey = projectId
        ? `/api/projects/${projectId}/coaching/checklists`
        : null;

    const { data, error, isLoading } = useSWR<CoachingChecklist[]>(
        cacheKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 10000,
        }
    );

    if (!data || data.length === 0) {
        return {
            health: null,
            isLoading,
            error,
        };
    }

    // Filter out dismissed checklists
    const active = data.filter((c: CoachingChecklist) => !c.isDismissed);

    // Group by module
    const moduleMap = new Map<string, { checked: number; total: number }>();
    for (const checklist of active) {
        const items = typeof checklist.items === 'string'
            ? JSON.parse(checklist.items)
            : checklist.items;

        const existing = moduleMap.get(checklist.module) || { checked: 0, total: 0 };
        const checked = items.filter((i: any) => i.isChecked).length;
        moduleMap.set(checklist.module, {
            checked: existing.checked + checked,
            total: existing.total + items.length,
        });
    }

    const modules: ModuleHealth[] = [];
    let totalChecked = 0;
    let totalItems = 0;

    for (const [module, { checked, total }] of moduleMap) {
        modules.push({
            module,
            checked,
            total,
            complete: checked === total && total > 0,
        });
        totalChecked += checked;
        totalItems += total;
    }

    const percentage = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

    const health: CoachingHealth = {
        percentage,
        modules,
        totalChecked,
        totalItems,
    };

    return {
        health,
        isLoading,
        error,
    };
}
