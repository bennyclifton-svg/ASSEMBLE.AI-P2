import { useState, useEffect, useCallback } from 'react';
import { useKnowledgeSubcategoryRefresh } from '@/lib/contexts/knowledge-subcategory-refresh-context';

export interface KnowledgeSubcategory {
  id: string;
  categoryId: string;
  projectId: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
}

type GroupedSubcategories = Record<string, KnowledgeSubcategory[]>;

interface UseKnowledgeSubcategoriesReturn {
  subcategories: GroupedSubcategories;
  isLoading: boolean;
  error: string | null;
  createSubcategory: (categoryId: string, name: string) => Promise<KnowledgeSubcategory | null>;
  updateSubcategory: (id: string, name: string) => Promise<KnowledgeSubcategory | null>;
  deleteSubcategory: (id: string) => Promise<boolean>;
  bulkDeleteSubcategories: (ids: string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const EMPTY_GROUPS: GroupedSubcategories = {
  planning: [],
  procurement: [],
  delivery: [],
  authorities: [],
  'scheme-design': [],
  'detail-design': [],
  'ifc-design': [],
};

export function useKnowledgeSubcategories(projectId: string): UseKnowledgeSubcategoriesReturn {
  const [subcategories, setSubcategories] = useState<GroupedSubcategories>(EMPTY_GROUPS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { version, triggerRefresh } = useKnowledgeSubcategoryRefresh();

  const fetchSubcategories = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/knowledge-subcategories`);
      if (!response.ok) throw new Error('Failed to fetch knowledge subcategories');
      const data = await response.json();
      setSubcategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories, version]);

  const createSubcategory = useCallback(async (categoryId: string, name: string): Promise<KnowledgeSubcategory | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/knowledge-subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, name }),
      });

      if (!response.ok) throw new Error('Failed to create subcategory');

      const newItem: KnowledgeSubcategory = await response.json();

      // Optimistic update
      setSubcategories(prev => ({
        ...prev,
        [categoryId]: [...(prev[categoryId] || []), newItem],
      }));

      triggerRefresh();
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      return null;
    }
  }, [projectId, triggerRefresh]);

  const updateSubcategory = useCallback(async (id: string, name: string): Promise<KnowledgeSubcategory | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/knowledge-subcategories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error('Failed to update subcategory');

      const updated: KnowledgeSubcategory = await response.json();

      // Optimistic update
      setSubcategories(prev => {
        const newGroups = { ...prev };
        for (const key of Object.keys(newGroups)) {
          newGroups[key] = newGroups[key].map(item =>
            item.id === id ? { ...item, name } : item
          );
        }
        return newGroups;
      });

      triggerRefresh();
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      return null;
    }
  }, [projectId, triggerRefresh]);

  const deleteSubcategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/knowledge-subcategories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete subcategory');

      // Optimistic update
      setSubcategories(prev => {
        const newGroups = { ...prev };
        for (const key of Object.keys(newGroups)) {
          newGroups[key] = newGroups[key].filter(item => item.id !== id);
        }
        return newGroups;
      });

      triggerRefresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      return false;
    }
  }, [projectId, triggerRefresh]);

  const bulkDeleteSubcategories = useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;

    try {
      const response = await fetch(`/api/projects/${projectId}/knowledge-subcategories/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Failed to bulk delete subcategories');

      // Optimistic update
      const idSet = new Set(ids);
      setSubcategories(prev => {
        const newGroups = { ...prev };
        for (const key of Object.keys(newGroups)) {
          newGroups[key] = newGroups[key].filter(item => !idSet.has(item.id));
        }
        return newGroups;
      });

      triggerRefresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk delete');
      return false;
    }
  }, [projectId, triggerRefresh]);

  return {
    subcategories,
    isLoading,
    error,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    bulkDeleteSubcategories,
    refetch: fetchSubcategories,
  };
}
