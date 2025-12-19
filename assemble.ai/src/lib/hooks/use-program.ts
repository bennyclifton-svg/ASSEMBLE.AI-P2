'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
    ProgramData,
    ProgramActivity,
    ProgramDependency,
    ProgramMilestone,
    CreateActivityRequest,
    UpdateActivityRequest,
    CreateDependencyRequest,
    CreateMilestoneRequest,
    ReorderActivitiesRequest,
    InsertTemplateRequest,
} from '@/types/program';

// Main hook for program data
export function useProgram(projectId: string) {
    const [data, setData] = useState<ProgramData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!projectId) return;

        try {
            setIsLoading(true);
            const res = await fetch(`/api/projects/${projectId}/program`);
            if (!res.ok) throw new Error('Failed to fetch program');
            const result = await res.json();
            setData(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        activities: data?.activities || [],
        dependencies: data?.dependencies || [],
        milestones: data?.milestones || [],
        isLoading,
        error,
        refetch: fetchData,
        setData,
    };
}

// Create activity hook
export function useCreateActivity(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        data: CreateActivityRequest,
        onSuccess?: (activity: ProgramActivity) => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create activity');
            const activity = await res.json();
            onSuccess?.(activity);
            return activity;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Update activity hook with optimistic updates
export function useUpdateActivity(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        { id, ...data }: UpdateActivityRequest & { id: string },
        onSuccess?: (activity: ProgramActivity) => void | Promise<void>
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/activities/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error('API error:', res.status, errorData);
                throw new Error(errorData.error || `Failed to update activity (${res.status})`);
            }
            const activity = await res.json();
            await onSuccess?.(activity);
            return activity;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Delete activity hook
export function useDeleteActivity(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        activityId: string,
        onSuccess?: () => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/activities/${activityId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete activity');
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Create dependency hook
export function useCreateDependency(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        data: CreateDependencyRequest,
        onSuccess?: (dependency: ProgramDependency) => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/dependencies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create dependency');
            const dependency = await res.json();
            onSuccess?.(dependency);
            return dependency;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Delete dependency hook
export function useDeleteDependency(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        dependencyId: string,
        onSuccess?: () => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/dependencies/${dependencyId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete dependency');
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Create milestone hook
export function useCreateMilestone(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        { activityId, ...data }: CreateMilestoneRequest & { activityId: string },
        onSuccess?: (milestone: ProgramMilestone) => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/activities/${activityId}/milestones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create milestone');
            const milestone = await res.json();
            onSuccess?.(milestone);
            return milestone;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Delete milestone hook
export function useDeleteMilestone(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        milestoneId: string,
        onSuccess?: () => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/milestones/${milestoneId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete milestone');
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Reorder activities hook
export function useReorderActivities(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        data: ReorderActivitiesRequest,
        onSuccess?: () => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to reorder activities');
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Insert template hook
export function useInsertTemplate(projectId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (
        data: InsertTemplateRequest,
        onSuccess?: () => void
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch(`/api/projects/${projectId}/program/template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to insert template');
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return { mutate, isLoading, error };
}

// Helper: Build hierarchical structure from flat activities
export function buildActivityTree(activities: ProgramActivity[]): ProgramActivity[] {
    const map = new Map<string, ProgramActivity>();
    const roots: ProgramActivity[] = [];

    // First pass: create map
    for (const activity of activities) {
        map.set(activity.id, { ...activity, children: [] });
    }

    // Second pass: build tree
    for (const activity of activities) {
        const node = map.get(activity.id)!;
        if (activity.parentId && map.has(activity.parentId)) {
            const parent = map.get(activity.parentId)!;
            parent.children = parent.children || [];
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    // Sort by sortOrder
    const sortByOrder = (a: ProgramActivity, b: ProgramActivity) => a.sortOrder - b.sortOrder;
    roots.sort(sortByOrder);
    for (const root of roots) {
        if (root.children) {
            root.children.sort(sortByOrder);
        }
    }

    return roots;
}

// Helper: Flatten hierarchical structure back to flat array
export function flattenActivityTree(tree: ProgramActivity[]): ProgramActivity[] {
    const result: ProgramActivity[] = [];

    function traverse(activities: ProgramActivity[]) {
        for (const activity of activities) {
            result.push(activity);
            if (activity.children && activity.children.length > 0) {
                traverse(activity.children);
            }
        }
    }

    traverse(tree);
    return result;
}
