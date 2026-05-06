'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Upload } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { useProjectEvents } from '@/lib/hooks/use-project-events';
import type { ObjectiveType, ObjectiveSource } from '@/lib/db/objectives-schema';
import { SectionGroup, type ViewMode } from './SectionGroup';
import { computeRowOps, type EditorItem } from './save-section-diff';
import { hasManualEdits } from '@/lib/services/objectives-edit-detection';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { getSectionConfig, isAdvisory } from '@/lib/constants/objective-section-config';

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

function LoadingSkeleton() {
  return (
    <div className="p-4">
      <div
        className="rounded border border-[var(--color-border)]/50 overflow-hidden animate-pulse"
      >
        {SECTION_ORDER.map((type, idx) => (
          <div
            key={type}
            className={idx === SECTION_ORDER.length - 1 ? '' : 'border-b border-[var(--color-border)]/50'}
          >
            {/* Header skeleton */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)]/50"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 60%, transparent)' }}
            >
              <div
                className="h-6 w-6 rounded"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 80%, transparent)' }}
              />
              <div
                className="h-4 w-32 rounded"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 80%, transparent)' }}
              />
            </div>
            {/* Row skeletons */}
            <div
              className="px-4 py-3"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
            >
              <div
                className="h-4 w-48 rounded"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 60%, transparent)' }}
              />
            </div>
          </div>
        ))}
      </div>
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
  const [groupToDelete, setGroupToDelete] = useState<ObjectiveType | null>(null);
  const [generatingSection, setGeneratingSection] = useState<ObjectiveType | null>(null);
  const [viewModes, setViewModes] = useState<Record<ObjectiveType, ViewMode>>({
    planning: 'short',
    functional: 'short',
    quality: 'short',
    compliance: 'short',
  });
  const [snapshots, setSnapshots] = useState<Record<ObjectiveType, string[] | null>>({
    planning: null,
    functional: null,
    quality: null,
    compliance: null,
  });
  const [pendingRegenerate, setPendingRegenerate] = useState<{ type: ObjectiveType; mode: ViewMode } | null>(null);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [hasAttachedDocuments, setHasAttachedDocuments] = useState<boolean>(false);

  // Per-project-type section labels — drives both UI and (via the same lookup
  // table) the AI prompt section definitions, so the two cannot drift apart.
  const sectionLabels = useMemo<Record<ObjectiveType, string>>(() => {
    const config = getSectionConfig(projectType);
    return {
      planning: config.sections.planning.label,
      functional: config.sections.functional.label,
      quality: config.sections.quality.label,
      compliance: config.sections.compliance.label,
    };
  }, [projectType]);

  const showAdvisoryDraftBanner = isAdvisory(projectType) && !hasAttachedDocuments;

  // Drag-and-drop / paste extract state
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const dragCounterRef = useRef(0);

  // Fetch rows — single source of truth; used on mount and after extraction
  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/objectives`);
      if (!res.ok) throw new Error('Failed to load objectives');
      const json = await res.json();
      if (json.success) {
        setRows(json.data as GroupedRows);
        if (json.snapshots) {
          setSnapshots(json.snapshots as Record<ObjectiveType, string[] | null>);
        }
        setProjectType(typeof json.projectType === 'string' ? json.projectType : null);
        setHasAttachedDocuments(Boolean(json.hasAttachedDocuments));
      }
    } catch {
      toast({
        title: 'Load Failed',
        description: 'Could not load objectives',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  // Fetch on mount
  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Derive each section's initial view mode from its rows: a section that has
  // any polished rows opens in Long view; otherwise Short.
  useEffect(() => {
    setViewModes((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const type of SECTION_ORDER) {
        const anyPolished = rows[type].some((r) => r.status === 'polished');
        const want: ViewMode = anyPolished ? 'long' : 'short';
        if (next[type] !== want) {
          next[type] = want;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // Run only when the rows shape changes from the server fetch — not on every
    // optimistic in-memory edit. Keying on isLoading transitions covers that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useProjectEvents(projectId, (event) => {
    if (event.entity === 'objective') {
      fetchRows();
      onUpdate?.();
    }
  });

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

  // --- Run the regenerate API call (used by handleRegenerate and by the
  // confirmation modal's "Replace" button after the user has acknowledged the
  // destructive prompt). ---
  const runRegenerate = useCallback(async (type: ObjectiveType, mode: ViewMode) => {
    if (generatingSection) return;
    setGeneratingSection(type);
    try {
      const url = mode === 'short'
        ? `/api/projects/${projectId}/objectives/generate`
        : `/api/projects/${projectId}/objectives/polish`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: type }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const message =
          errBody?.error?.message ||
          (res.status === 404
            ? 'Complete the building profile first.'
            : 'Failed to regenerate');
        throw new Error(message);
      }
      // Long-mode regenerate produces polished content — flip the view to Long
      // so the user sees what they just generated.
      if (mode === 'long') {
        setViewModes((prev) => ({ ...prev, [type]: 'long' }));
      }
      await fetchRows();
      onUpdate?.();
      toast({
        title: mode === 'short' ? 'Short bullets generated' : 'Long bullets generated',
        description: `${sectionLabels[type]} content is ready`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Regeneration Failed',
        description: error instanceof Error ? error.message : 'Failed to regenerate',
        variant: 'destructive',
      });
    } finally {
      setGeneratingSection(null);
    }
  }, [projectId, generatingSection, fetchRows, onUpdate, toast]);

  // --- Entry point from the ↻ button. Short-mode regenerate is destructive,
  // so when the section has manual edits we pop a confirmation modal first.
  // Long-mode regenerate is non-destructive (polish preserves the short text)
  // and runs immediately. ---
  const handleRegenerate = useCallback((type: ObjectiveType, mode: ViewMode) => {
    if (generatingSection) return;

    if (mode === 'short' && rows[type].length > 0) {
      const dirty = hasManualEdits({
        rows: rows[type].map((r) => ({ id: r.id, text: r.text })),
        snapshot: snapshots[type],
      });
      if (dirty) {
        setPendingRegenerate({ type, mode });
        return;
      }
    }

    void runRegenerate(type, mode);
  }, [generatingSection, rows, snapshots, runRegenerate]);

  // --- View toggle ---
  const handleViewModeChange = useCallback(async (type: ObjectiveType, mode: ViewMode) => {
    setViewModes((prev) => ({ ...prev, [type]: mode }));
    try {
      await fetch(`/api/projects/${projectId}/objectives/view-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: type, viewMode: mode }),
      });
      await fetchRows();
    } catch (err) {
      toast({
        title: 'View change failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [projectId, fetchRows, toast]);

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

  // Bulk delete all objectives in a single section
  const handleDeleteGroup = useCallback(async () => {
    if (!groupToDelete) return;
    const idsToDelete = rows[groupToDelete].map((r) => r.id);
    setGroupToDelete(null);
    for (const id of idsToDelete) {
      await deleteObjective(id);
    }
  }, [groupToDelete, rows, deleteObjective]);

  // Keep a ref to the latest rows so bulk-save uses fresh state without
  // forcing the callback identity to change on every render.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // ID-based diff: items from the editor carry the row id (or null for new
  // bullets); compare against the current rows to derive create/update/delete
  // ops. Plain text is a valid HTML payload, so AI-written text round-trips
  // without modification.
  const saveSection = useCallback(async (type: ObjectiveType, items: EditorItem[]) => {
    const currentRows = rowsRef.current[type];
    const ops = computeRowOps({ currentRows, editorItems: items });

    for (const update of ops.updates) {
      const row = currentRows.find((r) => r.id === update.id);
      if (!row) continue;
      const patch: Partial<ObjectiveRow> = {};
      if (update.html !== undefined) {
        // Write to whichever column the row is currently sourced from.
        if (row.status === 'polished' && row.textPolished) {
          patch.textPolished = update.html;
        } else {
          patch.text = update.html;
        }
      }
      if (update.sortOrder !== undefined) patch.sortOrder = update.sortOrder;
      await updateObjective(update.id, patch);
    }

    for (const create of ops.creates) {
      const trimmed = create.html.replace(/^<p>([\s\S]*?)<\/p>$/i, '$1').trim();
      if (trimmed.length === 0) continue;
      await createObjective(type, trimmed);
    }

    for (const id of ops.deletes) {
      await deleteObjective(id);
    }
  }, [updateObjective, createObjective, deleteObjective]);

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
        ) : (
          <div className="p-4 space-y-3">
            {showAdvisoryDraftBanner && (
              <div
                className="rounded border border-[var(--color-border)]/50 px-3 py-2 text-xs"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)',
                  color: 'var(--color-text-muted)',
                }}
                role="note"
              >
                Draft from your scope selections — refine after attaching reference material.
              </div>
            )}
            {/* Single outer card containing all four sections */}
            <div className="rounded border border-[var(--color-border)]/50 overflow-hidden">
              {(() => {
                // Continuous numbering across sections — each section's editor
                // starts where the previous section ended.
                let runningCounter = 1;
                return SECTION_ORDER.map((type, idx) => {
                  const sectionStart = runningCounter;
                  runningCounter += rows[type].length;
                  return (
                    <SectionGroup
                      key={type}
                      type={type}
                      label={sectionLabels[type]}
                      rows={rows[type]}
                      onSave={saveSection}
                      onDeleteAll={setGroupToDelete}
                      onRegenerate={handleRegenerate}
                      viewMode={viewModes[type]}
                      onViewModeChange={handleViewModeChange}
                      hasLongContent={rows[type].some((r) => !!r.textPolished)}
                      isGenerating={generatingSection === type}
                      isAnyGenerating={generatingSection !== null}
                      isLastSection={idx === SECTION_ORDER.length - 1}
                      startIndex={sectionStart}
                    />
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Group Delete Confirmation Modal */}
      <Modal
        isOpen={groupToDelete !== null}
        onClose={() => setGroupToDelete(null)}
        title={`Delete All ${groupToDelete ? sectionLabels[groupToDelete] : ''} Objectives`}
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-primary)]">
            Are you sure you want to delete all {groupToDelete ? rows[groupToDelete].length : 0}{' '}
            {groupToDelete ? sectionLabels[groupToDelete].toLowerCase() : ''} objective
            {groupToDelete && rows[groupToDelete].length !== 1 ? 's' : ''}?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGroupToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>

      {/* Destructive ↻ Short confirmation modal — only shown when manual edits
          (text divergence from the last AI snapshot or HTML markup) are
          detected. Long-mode ↻ is non-destructive and skips this gate. */}
      <Modal
        isOpen={pendingRegenerate !== null}
        onClose={() => setPendingRegenerate(null)}
        title={`Replace ${pendingRegenerate ? sectionLabels[pendingRegenerate.type] : ''} content?`}
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-primary)]">
            This section has manual edits or formatting that will be lost.
            Regenerating will replace all bullets with fresh AI content.
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Tip: switch to Long view and click ↻ instead — that preserves your short bullets.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingRegenerate(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const p = pendingRegenerate;
                setPendingRegenerate(null);
                if (p) void runRegenerate(p.type, p.mode);
              }}
            >
              Replace
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
