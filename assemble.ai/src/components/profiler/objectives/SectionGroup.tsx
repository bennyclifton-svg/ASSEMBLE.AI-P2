'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Trash, RotateCw } from 'lucide-react';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from './ObjectivesWorkspace';
import { ObjectivesEditor, type EditorItem, type EditorRow } from './ObjectivesEditor';
import { cn } from '@/lib/utils';

export type ViewMode = 'short' | 'long';

interface SectionGroupProps {
  type: ObjectiveType;
  label: string;
  rows: ObjectiveRow[];
  onSave: (type: ObjectiveType, items: EditorItem[]) => Promise<void>;
  onDeleteAll: (type: ObjectiveType) => void;
  onRegenerate: (type: ObjectiveType, mode: ViewMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (type: ObjectiveType, mode: ViewMode) => void;
  hasLongContent: boolean;
  isGenerating?: boolean;
  isAnyGenerating?: boolean;
  isLastSection?: boolean;
  /** 1-based starting number for this section's items in the global sequence. */
  startIndex?: number;
}

function itemsKey(items: EditorItem[]): string {
  return items.map((i) => `${i.id ?? '∅'}:${i.html}`).join('|');
}

export function SectionGroup({
  type,
  label,
  rows,
  onSave,
  onDeleteAll,
  onRegenerate,
  viewMode,
  onViewModeChange,
  hasLongContent,
  isGenerating = false,
  isAnyGenerating = false,
  isLastSection = false,
  startIndex = 1,
}: SectionGroupProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Derive editor rows from the current section rows. Use textPolished when the
  // row is in polished state, otherwise the short text.
  const editorRows = useMemo<EditorRow[]>(
    () =>
      rows.map((r) => ({
        id: r.id,
        text: r.status === 'polished' && r.textPolished ? r.textPolished : r.text,
      })),
    [rows],
  );

  const latestItemsRef = useRef<EditorItem[]>(
    editorRows.map((r) => ({ id: r.id, html: r.text })),
  );
  const lastSavedKeyRef = useRef<string>(itemsKey(latestItemsRef.current));

  // Whenever the props update from the server (e.g. after AI generation),
  // refresh the "lastSaved" baseline so we don't trigger a redundant save.
  useEffect(() => {
    const baseline = editorRows.map((r) => ({ id: r.id as string | null, html: r.text }));
    latestItemsRef.current = baseline;
    lastSavedKeyRef.current = itemsKey(baseline);
  }, [editorRows]);

  // Debounced autosave: fire 1.5s after the user stops typing. The blur
  // handler below is a backstop — if focus leaves before the timer fires, the
  // save still happens. Both paths skip the call when the editor content
  // matches the last saved baseline.
  const debouncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async (items: EditorItem[]) => {
    const key = itemsKey(items);
    if (key === lastSavedKeyRef.current) return;
    setIsSaving(true);
    try {
      await onSave(type, items);
      lastSavedKeyRef.current = key;
    } finally {
      setIsSaving(false);
    }
  }, [onSave, type]);

  const handleEditorChange = useCallback((items: EditorItem[]) => {
    latestItemsRef.current = items;
    if (debouncedTimerRef.current) clearTimeout(debouncedTimerRef.current);
    debouncedTimerRef.current = setTimeout(() => {
      void flushSave(latestItemsRef.current);
    }, 1500);
  }, [flushSave]);

  const handleEditorBlur = useCallback(async () => {
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
      debouncedTimerRef.current = null;
    }
    await flushSave(latestItemsRef.current);
  }, [flushSave]);

  // Shared helper: cancel any pending debounce and persist the latest editor
  // state synchronously. Used before regenerate or view-mode toggle so those
  // server calls don't race the create-POST.
  const flushPending = useCallback(async () => {
    if (debouncedTimerRef.current) {
      clearTimeout(debouncedTimerRef.current);
      debouncedTimerRef.current = null;
    }
    await flushSave(latestItemsRef.current);
  }, [flushSave]);

  const handleRegenerateClick = useCallback(async () => {
    await flushPending();
    onRegenerate(type, viewMode);
  }, [flushPending, onRegenerate, type, viewMode]);

  const handleViewToggle = useCallback(async (mode: ViewMode) => {
    await flushPending();
    onViewModeChange(type, mode);
  }, [flushPending, onViewModeChange, type]);

  // Clean up the debounce timer on unmount so we don't fire a save against a
  // dead component.
  useEffect(() => {
    return () => {
      if (debouncedTimerRef.current) clearTimeout(debouncedTimerRef.current);
    };
  }, []);

  const hasRows = rows.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col',
        !isLastSection && 'border-b border-[var(--color-border)]/50',
      )}
    >
      {/* Header bar — matches Stakeholders/Knowledge styling */}
      <div
        className="flex items-center justify-between px-4 py-2.5 backdrop-blur-md border-b border-[var(--color-border)]/50"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 60%, transparent)' }}
      >
        <span className="text-[var(--color-text-primary)] font-bold text-sm uppercase tracking-wide">
          {label} ({rows.length})
          {isSaving && (
            <span
              className="ml-2 text-xs font-normal normal-case"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Saving…
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {/* Segmented Short/Long view toggle */}
          <div
            className="inline-flex items-center rounded border border-[var(--color-border)]/50 overflow-hidden text-xs font-medium"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => handleViewToggle('short')}
              className={cn(
                'px-2.5 py-1 transition-colors',
                viewMode === 'short'
                  ? 'bg-[var(--color-accent-copper)]/20 text-[var(--color-accent-copper)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              )}
            >
              Short
            </button>
            <button
              type="button"
              onClick={() => handleViewToggle('long')}
              title={!hasLongContent && hasRows ? 'Long view is empty — click ↻ to polish' : undefined}
              className={cn(
                'px-2.5 py-1 transition-colors',
                viewMode === 'long'
                  ? 'bg-[var(--color-accent-copper)]/20 text-[var(--color-accent-copper)]'
                  : !hasLongContent && hasRows
                    ? 'text-[var(--color-text-muted)]/60 hover:text-[var(--color-text-primary)] italic'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              )}
            >
              Long
            </button>
          </div>

          {/* Regenerate (↻) — operates on the column currently in view.
              Flushes any pending edit save first so newly-typed bullets are
              part of the AI's input. */}
          <button
            type="button"
            onClick={handleRegenerateClick}
            disabled={isAnyGenerating}
            title={`Regenerate ${viewMode} content`}
            className={cn(
              'p-1 rounded transition-colors',
              isAnyGenerating
                ? 'text-[var(--color-text-muted)]/40 cursor-not-allowed'
                : 'text-[var(--color-accent-copper)] hover:bg-[var(--color-bg-tertiary)]',
            )}
          >
            <RotateCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
          </button>

          {/* Bulk delete */}
          <button
            onClick={() => onDeleteAll(type)}
            className={cn(
              'p-1 rounded transition-colors',
              hasRows
                ? 'text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10'
                : 'text-[var(--color-text-muted)]/30 cursor-not-allowed',
            )}
            title={`Delete all ${label} objectives`}
            disabled={!hasRows}
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div
        className="backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
      >
        <ObjectivesEditor
          rows={editorRows}
          onChange={handleEditorChange}
          onBlur={handleEditorBlur}
          placeholder={`Type ${label.toLowerCase()} objectives — one per line`}
          startIndex={startIndex}
        />
      </div>
    </div>
  );
}
