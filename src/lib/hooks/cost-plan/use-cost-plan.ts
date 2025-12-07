import { useState, useEffect, useCallback } from 'react';
import type { CostPlan, CostLineWithCalculations, CostPlanTotals } from '@/types/cost-plan';

// Stable empty array reference to prevent infinite re-renders
const EMPTY_COST_LINES: CostLineWithCalculations[] = [];

export function useCostPlan(
  projectId: string,
  reportMonth?: { year: number; month: number }
) {
  const [costPlan, setCostPlan] = useState<CostPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCostPlan = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);

      // Build URL with optional reportMonth query parameter
      const queryString = reportMonth
        ? `?reportMonth=${reportMonth.year}-${String(reportMonth.month).padStart(2, '0')}`
        : '';
      const response = await fetch(`/api/projects/${projectId}/cost-plan${queryString}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Project not found is ok - just means no cost plan yet
          setCostPlan(null);
          setError(null);
          return;
        }
        throw new Error('Failed to fetch cost plan');
      }

      const data: CostPlan = await response.json();
      setCostPlan(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, reportMonth]);

  useEffect(() => {
    fetchCostPlan();
  }, [fetchCostPlan]);

  // Poll for updates every 10 seconds (simple realtime alternative)
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(() => {
      fetchCostPlan();
    }, 10000);

    return () => clearInterval(interval);
  }, [projectId, fetchCostPlan]);

  return {
    costPlan,
    costLines: costPlan?.costLines ?? EMPTY_COST_LINES,
    totals: costPlan?.totals ?? null,
    project: costPlan?.project ?? null,
    isLoading,
    error,
    refetch: fetchCostPlan,
  };
}

// Selector hooks for specific data
export function useCostPlanTotals(projectId: string) {
  const { totals, isLoading, error, refetch } = useCostPlan(projectId);
  return { totals, isLoading, error, refetch };
}

export function useCostLines(projectId: string) {
  const { costLines, isLoading, error, refetch } = useCostPlan(projectId);
  return { costLines, isLoading, error, refetch };
}
