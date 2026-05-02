'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash } from 'lucide-react';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from './ObjectivesWorkspace';
import { cn } from '@/lib/utils';
import { DiamondIcon } from '@/components/ui/diamond-icon';

interface SectionGroupProps {
  type: ObjectiveType;
  label: string;
  rows: ObjectiveRow[];
  onSave: (type: ObjectiveType, lines: string[]) => Promise<void>;
  onDeleteAll: (type: ObjectiveType) => void;
  onGenerate: (type: ObjectiveType) => void;
  isGenerating?: boolean;
  isAnyGenerating?: boolean;
  isLastSection?: boolean;
}

const MIN_VISIBLE_LINES = 4;

function rowsToText(rows: ObjectiveRow[]): string {
  return rows
    .map((r) => (r.status === 'polished' && r.textPolished ? r.textPolished : r.text))
    .join('\n');
}

export function SectionGroup({
  type,
  label,
  rows,
  onSave,
  onDeleteAll,
  onGenerate,
  isGenerating = false,
  isAnyGenerating = false,
  isLastSection = false,
}: SectionGroupProps) {
  const initial = rowsToText(rows);
  const [value, setValue] = useState(initial);
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(initial);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external row updates (AI extraction, deletes, etc.) into the textarea
  // — but only when the user isn't actively editing it.
  useEffect(() => {
    if (isFocused) return;
    const incoming = rowsToText(rows);
    if (incoming !== lastSavedRef.current) {
      setValue(incoming);
      lastSavedRef.current = incoming;
    }
  }, [rows, isFocused]);

  const handleBlur = async () => {
    setIsFocused(false);
    if (value === lastSavedRef.current) return;
    const lines = value.split('\n');
    setIsSaving(true);
    try {
      await onSave(type, lines);
      lastSavedRef.current = value;
    } finally {
      setIsSaving(false);
    }
  };

  const hasRows = rows.length > 0;
  const lineCount = value.length === 0 ? 0 : value.split('\n').length;
  const visibleRows = Math.max(MIN_VISIBLE_LINES, lineCount + 1);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => onGenerate(type)}
            disabled={isAnyGenerating}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium transition-all',
              isGenerating
                ? 'text-[var(--color-accent-copper)] cursor-wait'
                : isAnyGenerating
                  ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                  : 'text-[var(--color-accent-copper)] hover:opacity-80',
            )}
            title={isGenerating ? 'Generating...' : `Generate ${label} objectives`}
          >
            <DiamondIcon
              className={cn('w-4 h-4', isGenerating && 'animate-diamond-spin')}
              variant="empty"
            />
            <span className={isGenerating ? 'animate-text-aurora' : ''}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </span>
          </button>
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

      {/* Textarea body */}
      <div
        className="backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          rows={visibleRows}
          spellCheck={true}
          placeholder={`Type ${label.toLowerCase()} objectives — one per line`}
          className={cn(
            'w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none',
            'px-4 py-3 text-sm leading-relaxed',
            'text-[var(--color-text-primary)]',
            'placeholder:text-[var(--color-text-muted)]',
            'selection:bg-[var(--color-accent-copper)]/20',
          )}
        />
      </div>
    </div>
  );
}
