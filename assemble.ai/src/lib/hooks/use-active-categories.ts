import { useState, useEffect, useCallback } from 'react';
import type { ActiveCategory } from '@/lib/constants/categories';
import { useStakeholderRefresh } from '@/lib/contexts/stakeholder-refresh-context';

/**
 * Hook to fetch active categories for a specific project.
 *
 * Automatically refetches when stakeholders are generated/modified,
 * ensuring subcategories (based on consultants/contractors) stay in sync.
 *
 * @param projectId - The ID of the project to fetch categories for.
 * @returns An object containing the categories, loading state, error state, and refetch function.
 */
export function useActiveCategories(projectId: string) {
    const [categories, setCategories] = useState<ActiveCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to stakeholder refresh signals
    const { version } = useStakeholderRefresh();

    const fetchCategories = useCallback(async () => {
        if (!projectId) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/api/categories/active?projectId=${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            setCategories(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    // Fetch on mount and when projectId or stakeholder version changes
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories, version]);

    return { categories, isLoading, error, refetch: fetchCategories };
}
