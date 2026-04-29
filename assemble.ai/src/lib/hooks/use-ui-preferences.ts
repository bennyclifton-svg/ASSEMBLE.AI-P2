'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { toast } from 'sonner';

export type NotesViewMode = 'tiles' | 'list';
export type NotesSortField = 'date' | 'color';
export type NotesSortDir = 'asc' | 'desc';

export interface NotesPreferences {
    view?: NotesViewMode;
    sortField?: NotesSortField;
    sortDir?: NotesSortDir;
}

export interface UiPreferences {
    notes?: NotesPreferences;
    [key: string]: unknown;
}

interface ProjectResponse {
    id: string;
    uiPreferences?: string | null;
}

const fetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to fetch');
    }
    return res.json();
};

function parsePrefs(raw: string | null | undefined): UiPreferences {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as UiPreferences;
        }
    } catch {
        // fall through
    }
    return {};
}

/**
 * Read + write per-project UI preferences (sort, view mode, etc.).
 * Writes are fire-and-forget with optimistic local updates via SWR mutate.
 */
export function useUiPreferences(projectId: string | null) {
    const swrKey = projectId ? `/api/projects/${projectId}` : null;

    const { data, mutate, isLoading } = useSWR<ProjectResponse>(swrKey, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
    });

    const preferences = parsePrefs(data?.uiPreferences);

    const updatePreferences = useCallback(
        async (patch: UiPreferences) => {
            if (!projectId) return;

            // Optimistic update — merge locally first.
            const optimistic = mergeDeep(preferences, patch);
            mutate(
                (current) => ({ ...(current ?? { id: projectId }), uiPreferences: JSON.stringify(optimistic) }),
                { revalidate: false }
            );

            try {
                const res = await fetch(`/api/projects/${projectId}/ui-preferences`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patch),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(err.error || 'Failed to save preferences');
                }
            } catch (err) {
                console.error('[useUiPreferences] failed to save', err);
                toast.error('Could not save your preference. Try again.');
            }
        },
        [projectId, preferences, mutate]
    );

    return { preferences, updatePreferences, isLoading };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep(
    target: UiPreferences,
    source: UiPreferences
): UiPreferences {
    const out: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = out[key];
        if (isPlainObject(existing) && isPlainObject(value)) {
            out[key] = mergeDeep(existing as UiPreferences, value as UiPreferences);
        } else {
            out[key] = value;
        }
    }
    return out as UiPreferences;
}
