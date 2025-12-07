import { useState, useEffect, useCallback } from 'react';
import type { Variation, VariationWithCostLine, CreateVariationInput, UpdateVariationInput } from '@/types/variation';

export function useVariations(projectId: string, filters?: {
  costLineId?: string;
  status?: string;
  category?: string;
}) {
  const [variations, setVariations] = useState<VariationWithCostLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVariations = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters?.costLineId) params.set('costLineId', filters.costLineId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.category) params.set('category', filters.category);

      const url = `/api/projects/${projectId}/variations${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch variations');

      const data = await response.json();
      setVariations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filters?.costLineId, filters?.status, filters?.category]);

  useEffect(() => {
    fetchVariations();
  }, [fetchVariations]);

  return {
    variations,
    isLoading,
    error,
    refetch: fetchVariations,
  };
}

export function useVariationMutations(projectId: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVariation = useCallback(async (data: Omit<CreateVariationInput, 'projectId'>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create variation');
      }

      const created = await response.json();
      onSuccess?.();
      return created as Variation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const updateVariation = useCallback(async (id: string, data: UpdateVariationInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/variations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update variation');
      }

      const updated = await response.json();
      onSuccess?.();
      return updated as Variation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, onSuccess]);

  const deleteVariation = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/variations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete variation');
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
    createVariation,
    updateVariation,
    deleteVariation,
    isSubmitting,
    error,
  };
}
