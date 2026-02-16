/**
 * useStakeholders Hook
 * Feature: 020-stakeholder
 *
 * Hook for fetching and managing stakeholders
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  StakeholderWithStatus,
  StakeholderGroup,
  StakeholderGroupCounts,
  CreateStakeholderRequest,
  UpdateStakeholderRequest,
  TenderStatusType,
  SubmissionStatus,
  GeneratedStakeholder,
} from '@/types/stakeholder';
import { useStakeholderRefresh } from '@/lib/contexts/stakeholder-refresh-context';

interface UseStakeholdersOptions {
  projectId: string;
  groupFilter?: StakeholderGroup;
}

interface UseStakeholdersReturn {
  stakeholders: StakeholderWithStatus[];
  counts: StakeholderGroupCounts;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createStakeholder: (data: CreateStakeholderRequest) => Promise<StakeholderWithStatus | null>;
  updateStakeholder: (id: string, data: UpdateStakeholderRequest) => Promise<StakeholderWithStatus | null>;
  deleteStakeholder: (id: string) => Promise<boolean>;
  toggleEnabled: (id: string, enabled: boolean) => Promise<boolean>;
  updateTenderStatus: (id: string, statusType: TenderStatusType, isActive: boolean) => Promise<boolean>;
  updateSubmissionStatus: (id: string, status: SubmissionStatus) => Promise<boolean>;
  reorderStakeholders: (group: StakeholderGroup, ids: string[]) => Promise<boolean>;
  generateStakeholders: (options?: GenerateOptions) => Promise<GenerateResult | null>;
  previewGeneration: (options?: GenerateOptions) => Promise<GeneratePreviewResult | null>;
}

interface GenerateOptions {
  mode?: 'merge' | 'replace';
  groups?: StakeholderGroup[];
  includeAuthorities?: boolean;
  includeContractors?: boolean;
  smartMerge?: boolean;
}

interface GenerateResult {
  created: number;
  deleted: number;
  skipped: number;
  generated: GeneratedStakeholder[];
}

interface GeneratePreviewResult {
  generated: GeneratedStakeholder[];
  profileContext: {
    buildingClass: string;
    projectType: string;
    subclass: string[];
    complexityScore: number;
  };
  existingCount: number;
  mode: 'merge' | 'replace';
}

export function useStakeholders({
  projectId,
  groupFilter,
}: UseStakeholdersOptions): UseStakeholdersReturn {
  const [stakeholders, setStakeholders] = useState<StakeholderWithStatus[]>([]);
  const [counts, setCounts] = useState<StakeholderGroupCounts>({
    client: 0,
    authority: 0,
    consultant: 0,
    contractor: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to stakeholder refresh signals for cross-component sync
  const { version, triggerRefresh } = useStakeholderRefresh();

  // Fetch stakeholders
  // showLoading: controls whether to show full loading skeleton (true for initial load, false for background refetch)
  const fetchStakeholders = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const url = groupFilter
        ? `/api/projects/${projectId}/stakeholders?group=${groupFilter}`
        : `/api/projects/${projectId}/stakeholders`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stakeholders');

      const data = await response.json();
      setStakeholders(data.stakeholders);
      setCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [projectId, groupFilter]);

  // Track if we've done the initial load
  const hasInitiallyLoaded = useRef(false);

  // Fetch on mount and when version changes (triggered by stakeholder generation)
  useEffect(() => {
    // Only show loading skeleton on initial mount, not on version-triggered refetches
    fetchStakeholders(!hasInitiallyLoaded.current);
    hasInitiallyLoaded.current = true;
  }, [fetchStakeholders, version]);

  // Create stakeholder
  const createStakeholder = useCallback(
    async (data: CreateStakeholderRequest): Promise<StakeholderWithStatus | null> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to create stakeholder');

        const stakeholder = await response.json();
        await fetchStakeholders(false); // Refetch without full loading
        triggerRefresh(); // Notify other components (StakeholderNav, categories)
        return stakeholder;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      }
    },
    [projectId, fetchStakeholders, triggerRefresh]
  );

  // Update stakeholder
  const updateStakeholder = useCallback(
    async (id: string, data: UpdateStakeholderRequest): Promise<StakeholderWithStatus | null> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to update stakeholder');

        const stakeholder = await response.json();

        // Optimistically update local state
        setStakeholders(prev =>
          prev.map(s => (s.id === id ? { ...s, ...stakeholder } : s))
        );

        triggerRefresh(); // Notify other components (categories, etc.)
        return stakeholder;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      }
    },
    [projectId, triggerRefresh]
  );

  // Delete stakeholder
  const deleteStakeholder = useCallback(
    async (id: string): Promise<boolean> => {
      // Find the stakeholder before deletion for count updates
      const stakeholderToDelete = stakeholders.find(s => s.id === id);

      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete stakeholder');

        // Optimistically update local state
        setStakeholders(prev => prev.filter(s => s.id !== id));

        // Update counts using the captured stakeholder
        if (stakeholderToDelete) {
          setCounts(prev => ({
            ...prev,
            [stakeholderToDelete.stakeholderGroup]: prev[stakeholderToDelete.stakeholderGroup] - 1,
            total: prev.total - 1,
          }));
        }

        triggerRefresh(); // Notify other components (StakeholderNav, categories)
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [projectId, stakeholders, triggerRefresh]
  );

  // Toggle enabled status
  const toggleEnabled = useCallback(
    async (id: string, enabled: boolean): Promise<boolean> => {
      const result = await updateStakeholder(id, { isEnabled: enabled });
      return result !== null;
    },
    [updateStakeholder]
  );

  // Update tender status
  const updateTenderStatus = useCallback(
    async (id: string, statusType: TenderStatusType, isActive: boolean): Promise<boolean> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statusUpdate: {
              type: 'tender',
              data: { statusType, isActive },
            },
          }),
        });

        if (!response.ok) throw new Error('Failed to update tender status');

        // Refetch to get updated statuses without full loading
        await fetchStakeholders(false);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [projectId, fetchStakeholders]
  );

  // Update submission status
  const updateSubmissionStatus = useCallback(
    async (id: string, status: SubmissionStatus): Promise<boolean> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statusUpdate: {
              type: 'submission',
              data: { status },
            },
          }),
        });

        if (!response.ok) throw new Error('Failed to update submission status');

        // Refetch to get updated statuses without full loading
        await fetchStakeholders(false);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [projectId, fetchStakeholders]
  );

  // Reorder stakeholders
  const reorderStakeholders = useCallback(
    async (group: StakeholderGroup, ids: string[]): Promise<boolean> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group, stakeholderIds: ids }),
        });

        if (!response.ok) throw new Error('Failed to reorder stakeholders');

        // Optimistically update local order
        setStakeholders(prev => {
          const inGroup = prev.filter(s => s.stakeholderGroup === group);
          const outOfGroup = prev.filter(s => s.stakeholderGroup !== group);
          const reordered = ids.map(id => inGroup.find(s => s.id === id)!).filter(Boolean);
          return [...outOfGroup, ...reordered];
        });

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    },
    [projectId]
  );

  // Generate stakeholders
  const generateStakeholders = useCallback(
    async (options: GenerateOptions = {}): Promise<GenerateResult | null> => {
      try {
        // Don't set isLoading here - let the UI handle per-group loading state
        // to avoid replacing the entire table with skeletons
        const response = await fetch(`/api/projects/${projectId}/stakeholders/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...options,
            preview: false,
            smartMerge: options.smartMerge ?? true, // Default to smart merge
          }),
        });

        if (!response.ok) throw new Error('Failed to generate stakeholders');

        const result = await response.json();
        await fetchStakeholders(false); // Refetch without showing full loading skeleton

        // Notify all other components (StakeholderNav, DocumentRepository categories, etc.)
        // to refetch their stakeholder-dependent data
        triggerRefresh();

        return {
          created: result.created,
          deleted: result.deleted,
          skipped: result.skipped || 0,
          generated: result.generated,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      }
    },
    [projectId, fetchStakeholders, triggerRefresh]
  );

  // Preview generation
  const previewGeneration = useCallback(
    async (options: GenerateOptions = {}): Promise<GeneratePreviewResult | null> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stakeholders/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...options,
            preview: true,
          }),
        });

        if (!response.ok) throw new Error('Failed to preview generation');

        const result = await response.json();
        return {
          generated: result.generated,
          profileContext: result.profileContext,
          existingCount: result.existingCount,
          mode: result.mode,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      }
    },
    [projectId]
  );

  return {
    stakeholders,
    counts,
    isLoading,
    error,
    refetch: fetchStakeholders,
    createStakeholder,
    updateStakeholder,
    deleteStakeholder,
    toggleEnabled,
    updateTenderStatus,
    updateSubmissionStatus,
    reorderStakeholders,
    generateStakeholders,
    previewGeneration,
  };
}
