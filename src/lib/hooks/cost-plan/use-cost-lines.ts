import { useState, useCallback } from 'react';
import type { CostLine, CreateCostLineInput, UpdateCostLineInput } from '@/types/cost-plan';

export function useCostLineMutations(projectId: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCostLine = useCallback(async (data: Omit<CreateCostLineInput, 'projectId'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/cost-lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create cost line');
      }

      const created = await response.json();
      onSuccess?.();
      return created as CostLine;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const updateCostLine = useCallback(async (id: string, data: UpdateCostLineInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/cost-lines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update cost line');
      }

      const updated = await response.json();
      onSuccess?.();
      return updated as CostLine;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const deleteCostLine = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/cost-lines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete cost line');
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const reorderCostLines = useCallback(async (updates: Array<{ id: string; sortOrder: number }>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/cost-lines/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder cost lines');
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  return {
    createCostLine,
    updateCostLine,
    deleteCostLine,
    reorderCostLines,
    isSubmitting,
    error,
  };
}
