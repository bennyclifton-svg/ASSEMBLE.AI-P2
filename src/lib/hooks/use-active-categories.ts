import { useState, useEffect } from 'react';
import type { ActiveCategory } from '@/lib/constants/categories';

/**
 * Hook to fetch active categories for a specific project.
 *
 * @param projectId - The ID of the project to fetch categories for.
 * @returns An object containing the categories, loading state, and error state.
 */
export function useActiveCategories(projectId: string) {
    const [categories, setCategories] = useState<ActiveCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;

        const fetchCategories = async () => {
            try {
                const response = await fetch(`/api/categories/active?projectId=${projectId}`);
                if (!response.ok) throw new Error('Failed to fetch categories');
                const data = await response.json();
                setCategories(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, [projectId]);

    return { categories, isLoading, error };
}
