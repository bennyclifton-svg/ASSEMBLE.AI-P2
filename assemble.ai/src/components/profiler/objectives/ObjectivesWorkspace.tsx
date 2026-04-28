'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import type { ObjectiveType, ObjectiveSource } from '@/lib/db/objectives-schema';
import { SectionGroup } from './SectionGroup';
import { ObjectivesChatPanel } from './ObjectivesChatPanel';

export interface ObjectiveRow {
  id: string;
  projectId: string;
  objectiveType: ObjectiveType;
  source: ObjectiveSource;
  text: string;
  textPolished?: string | null;
  status: string;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
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

  // Drag-and-drop / paste extract state
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const dragCounterRef = useRef(0);

  // Fetch rows — exposed so handlers can trigger a refresh
  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/objectives`);
      if (!res.ok) throw new Error('Failed to fetch objectives');
      const json = await res.json();
      if (json.success) {
        setRows(json.data as GroupedRows);
      }
    } catch (err) {
      toast({
        title: 'Failed to load objectives',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Fetch on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    load();
    return () => { cancelled = true; };
  }, [projectId, toast]);

  // --- Extract from file or text ---
  const handleExtraction = useCallback(async (input: File | string) => {
    setIsExtracting(true);
    try {
      let response: Response;

      if (input instanceof File) {
        const formData = new FormData();
        formData.append('file', input);
        formData.append('projectId', projectId);
        response = await fetch('/api/planning/extract-objectives', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/planning/extract-objectives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input, projectId }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract objectives');
      }

      const result = await response.json();
      const { confidence } = result;

      // Refresh rows — the API already persisted the new rows
      await fetchRows();
      onUpdate?.();

      if (confidence < 70) {
        toast({
          title: 'Low Confidence Extraction',
          description: `Extracted with ${confidence}% confidence. Please review the objectives.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Objectives Extracted',
          description: `Successfully extracted project objectives (${confidence}% confidence)`,
          variant: 'success',
        });
      }
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Failed to extract objectives',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  }, [projectId, fetchRows, onUpdate, toast]);

  // --- Drag handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    // Check for text content first (Outlook emails drag as text)
    const textContent = e.dataTransfer.getData('text/plain');
    if (textContent && textContent.length > 20) {
      await handleExtraction(textContent);
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      toast({
        title: 'No Content',
        description: 'No file or text content found',
        variant: 'destructive',
      });
      return;
    }

    const file = files[0];
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, Word document, image (JPG/PNG), or text file',
        variant: 'destructive',
      });
      return;
    }

    await handleExtraction(file);
  }, [handleExtraction, toast]);

  // --- Paste handler ---
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    // Don't intercept if user is typing in an input field
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    e.preventDefault();

    // Try HTML first (Outlook emails paste as HTML)
    let content = e.clipboardData.getData('text/html');
    if (!content) {
      content = e.clipboardData.getData('text/plain');
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      content = tempDiv.textContent || tempDiv.innerText || '';
    }

    if (!content || content.length < 20) {
      toast({
        title: 'No Content',
        description: 'Paste some text content to extract project objectives',
        variant: 'destructive',
      });
      return;
    }

    await handleExtraction(content);
  }, [handleExtraction, toast]);

  // Create a new objective
  const createObjective = useCallback(async (type: ObjectiveType, text: string) => {
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistic add — sortOrder derived from current prev state, not closed-over rows
    setRows((prev) => {
      const tempRow: ObjectiveRow = {
        id: tempId,
        projectId,
        objectiveType: type,
        source: 'user_added',
        text,
        textPolished: null,
        status: 'draft',
        sortOrder: prev[type].length,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      return { ...prev, [type]: [...prev[type], tempRow] };
    });

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
  }, [projectId, onUpdate, toast]);

  // Update an existing objective
  const updateObjective = useCallback(async (id: string, patch: Partial<ObjectiveRow>) => {
    // Capture rowType and prevRow from current state inside the optimistic setRows call
    let rowType: ObjectiveType | null = null;
    let prevRow: ObjectiveRow | null = null;

    // Optimistic update — also captures rowType/prevRow for revert
    setRows((prev) => {
      for (const type of SECTION_ORDER) {
        const found = prev[type].find((r) => r.id === id);
        if (found) {
          rowType = type;
          prevRow = found;
          break;
        }
      }
      if (!rowType) return prev;
      return {
        ...prev,
        [rowType]: prev[rowType].map((r) => (r.id === id ? { ...r, ...patch } : r)),
      };
    });

    // rowType/prevRow are now set (synchronously from the setState callback above)
    if (!rowType || !prevRow) return;

    const capturedType = rowType;
    const capturedPrev = prevRow;

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
        [capturedType]: prev[capturedType].map((r) => (r.id === id ? updated : r)),
      }));

      onUpdate?.();
    } catch (err) {
      // Revert
      setRows((prev) => ({
        ...prev,
        [capturedType]: prev[capturedType].map((r) => (r.id === id ? capturedPrev : r)),
      }));
      toast({
        title: 'Failed to update objective',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      throw err; // Re-throw so ObjectiveRow can handle it
    }
  }, [projectId, onUpdate, toast]);

  // Delete an objective
  const deleteObjective = useCallback(async (id: string) => {
    let rowType: ObjectiveType | null = null;
    let deletedRow: ObjectiveRow | null = null;

    // Optimistic remove — also captures rowType/deletedRow for revert
    setRows((prev) => {
      for (const type of SECTION_ORDER) {
        const found = prev[type].find((r) => r.id === id);
        if (found) {
          rowType = type;
          deletedRow = found;
          break;
        }
      }
      if (!rowType) return prev;
      return {
        ...prev,
        [rowType]: prev[rowType].filter((r) => r.id !== id),
      };
    });

    // rowType/deletedRow are now set (synchronously from the setState callback above)
    if (!rowType || !deletedRow) return;

    const capturedType = rowType;
    const capturedDeleted = deletedRow;

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
        [capturedType]: [...prev[capturedType], capturedDeleted].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      toast({
        title: 'Failed to delete objective',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [projectId, onUpdate, toast]);

  // Compute global bullet indices across all sections
  const startIndices = useMemo(() => {
    const indices: Record<ObjectiveType, number> = { planning: 1, functional: 1, quality: 1, compliance: 1 };
    let counter = 1;
    for (const type of SECTION_ORDER) {
      indices[type] = counter;
      counter += rows[type].length;
    }
    return indices;
  }, [rows]);

  const totalRows = SECTION_ORDER.reduce((sum, t) => sum + rows[t].length, 0);

  const toggleCollapse = useCallback((type: ObjectiveType) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ minHeight: 0 }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      {/* Extraction Progress Overlay */}
      {isExtracting && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/80 rounded-lg flex items-center justify-center">
          <div
            className="border border-[var(--color-border)] rounded-lg p-6 flex flex-col items-center gap-3"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-green)]" />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Extracting objectives...
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              This may take a few moments
            </p>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && !isExtracting && (
        <div className="absolute inset-0 z-50 bg-[var(--color-accent-green)]/20 border-2 border-dashed border-[var(--color-accent-green)] rounded-lg flex items-center justify-center pointer-events-none">
          <div
            className="border border-[var(--color-accent-green)] rounded-lg p-6 flex flex-col items-center gap-3"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            <Upload className="w-10 h-10" style={{ color: 'var(--color-accent-green)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Drop to extract objectives
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              PDF, Word, Image, or Text
            </p>
          </div>
        </div>
      )}

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
