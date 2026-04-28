'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import { SectionGroup } from './SectionGroup';
import { ObjectivesChatPanel } from './ObjectivesChatPanel';

export interface ObjectiveRow {
  id: string;
  projectId: string;
  objectiveType: ObjectiveType;
  source: string;
  text: string;
  textPolished?: string | null;
  status: string;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

type GroupedRows = Record<ObjectiveType, ObjectiveRow[]>;

interface ObjectivesWorkspaceProps {
  projectId: string;
  onUpdate?: () => void;
}

const SECTION_ORDER: ObjectiveType[] = ['planning', 'functional', 'quality', 'compliance'];

const SECTION_LABELS: Record<ObjectiveType, string> = {
  planning: 'Planning',
  functional: 'Functional',
  quality: 'Quality',
  compliance: 'Compliance',
};

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 animate-pulse">
      {SECTION_ORDER.map((type) => (
        <div
          key={type}
          className="rounded-md overflow-hidden"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
        >
          {/* Header skeleton */}
          <div className="flex items-stretch gap-0.5 p-2">
            <div
              className="h-10 w-48 rounded-l-md"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 80%, transparent)' }}
            />
            <div
              className="h-10 flex-1 rounded-r-md"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 80%, transparent)' }}
            />
          </div>
          {/* Row skeletons */}
          <div className="px-3 pb-3 space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-8 rounded"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 60%, transparent)' }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        No objectives yet. Use &ldquo;+ Add&rdquo; in any section to get started.
      </p>
    </div>
  );
}

export function ObjectivesWorkspace({ projectId, onUpdate }: ObjectivesWorkspaceProps) {
  const { toast } = useToast();

  const [rows, setRows] = useState<GroupedRows>({
    planning: [],
    functional: [],
    quality: [],
    compliance: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Partial<Record<ObjectiveType, boolean>>>({});

  // Fetch on mount
  useEffect(() => {
    let cancelled = false;

    async function fetch_rows() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/objectives`);
        if (!res.ok) throw new Error('Failed to fetch objectives');
        const json = await res.json();
        if (!cancelled && json.success) {
          setRows(json.data as GroupedRows);
        }
      } catch (err) {
        if (!cancelled) {
          toast({
            title: 'Failed to load objectives',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetch_rows();
    return () => { cancelled = true; };
  }, [projectId, toast]);

  // Create a new objective
  const createObjective = useCallback(async (type: ObjectiveType, text: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempRow: ObjectiveRow = {
      id: tempId,
      projectId,
      objectiveType: type,
      source: 'user_added',
      text,
      textPolished: null,
      status: 'draft',
      sortOrder: rows[type].length,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic add
    setRows((prev) => ({
      ...prev,
      [type]: [...prev[type], tempRow],
    }));

    try {
      const res = await fetch(`/api/projects/${projectId}/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text }),
      });
      if (!res.ok) throw new Error('Failed to create objective');
      const json = await res.json();
      const created: ObjectiveRow = json.data;

      // Replace temp row with real row
      setRows((prev) => ({
        ...prev,
        [type]: prev[type].map((r) => (r.id === tempId ? created : r)),
      }));

      onUpdate?.();
    } catch (err) {
      // Revert optimistic add
      setRows((prev) => ({
        ...prev,
        [type]: prev[type].filter((r) => r.id !== tempId),
      }));
      toast({
        title: 'Failed to create objective',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [projectId, rows, onUpdate, toast]);

  // Update an existing objective
  const updateObjective = useCallback(async (id: string, patch: Partial<ObjectiveRow>) => {
    // Find which type this row belongs to
    let rowType: ObjectiveType | null = null;
    let prevRow: ObjectiveRow | null = null;

    for (const type of SECTION_ORDER) {
      const found = rows[type].find((r) => r.id === id);
      if (found) {
        rowType = type;
        prevRow = found;
        break;
      }
    }

    if (!rowType || !prevRow) return;

    // Optimistic update
    setRows((prev) => ({
      ...prev,
      [rowType!]: prev[rowType!].map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));

    try {
      const res = await fetch(`/api/projects/${projectId}/objectives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed to update objective');
      const json = await res.json();
      const updated: ObjectiveRow = json.data;

      setRows((prev) => ({
        ...prev,
        [rowType!]: prev[rowType!].map((r) => (r.id === id ? updated : r)),
      }));

      onUpdate?.();
    } catch (err) {
      // Revert
      setRows((prev) => ({
        ...prev,
        [rowType!]: prev[rowType!].map((r) => (r.id === id ? prevRow! : r)),
      }));
      toast({
        title: 'Failed to update objective',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      throw err; // Re-throw so ObjectiveRow can handle it
    }
  }, [projectId, rows, onUpdate, toast]);

  // Delete an objective
  const deleteObjective = useCallback(async (id: string) => {
    let rowType: ObjectiveType | null = null;
    let deletedRow: ObjectiveRow | null = null;

    for (const type of SECTION_ORDER) {
      const found = rows[type].find((r) => r.id === id);
      if (found) {
        rowType = type;
        deletedRow = found;
        break;
      }
    }

    if (!rowType || !deletedRow) return;

    // Optimistic remove
    setRows((prev) => ({
      ...prev,
      [rowType!]: prev[rowType!].filter((r) => r.id !== id),
    }));

    try {
      const res = await fetch(`/api/projects/${projectId}/objectives/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete objective');
      onUpdate?.();
    } catch (err) {
      // Revert
      setRows((prev) => ({
        ...prev,
        [rowType!]: [...prev[rowType!], deletedRow!].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      toast({
        title: 'Failed to delete objective',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [projectId, rows, onUpdate, toast]);

  // Reorder objectives
  const reorderObjectives = useCallback(async (
    updates: { id: string; objectiveType: ObjectiveType; sortOrder: number }[]
  ) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/objectives/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Failed to reorder objectives');
      onUpdate?.();
    } catch (err) {
      toast({
        title: 'Failed to reorder objectives',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [projectId, onUpdate, toast]);

  // Compute global bullet indices across all sections
  const computeStartIndices = (): Record<ObjectiveType, number> => {
    const indices: Record<ObjectiveType, number> = {
      planning: 1,
      functional: 1,
      quality: 1,
      compliance: 1,
    };
    let counter = 1;
    for (const type of SECTION_ORDER) {
      indices[type] = counter;
      counter += rows[type].length;
    }
    return indices;
  };

  const startIndices = computeStartIndices();

  const totalRows = SECTION_ORDER.reduce((sum, t) => sum + rows[t].length, 0);

  const toggleCollapse = useCallback((type: ObjectiveType) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Main scrollable list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : totalRows === 0 ? (
          <div className="flex flex-col gap-3 p-4">
            {SECTION_ORDER.map((type) => (
              <SectionGroup
                key={type}
                type={type}
                label={SECTION_LABELS[type]}
                rows={[]}
                startIndex={startIndices[type]}
                onUpdate={updateObjective}
                onCreate={createObjective}
                onDelete={deleteObjective}
                isCollapsed={!!collapsed[type]}
                onToggleCollapse={() => toggleCollapse(type)}
              />
            ))}
            <EmptyState />
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {SECTION_ORDER.map((type) => (
              <SectionGroup
                key={type}
                type={type}
                label={SECTION_LABELS[type]}
                rows={rows[type]}
                startIndex={startIndices[type]}
                onUpdate={updateObjective}
                onCreate={createObjective}
                onDelete={deleteObjective}
                isCollapsed={!!collapsed[type]}
                onToggleCollapse={() => toggleCollapse(type)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chat panel anchored at bottom */}
      <ObjectivesChatPanel projectId={projectId} />
    </div>
  );
}
