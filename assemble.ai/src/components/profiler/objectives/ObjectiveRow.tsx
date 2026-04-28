'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  User,
  FileText,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import type { ObjectiveRow } from './ObjectivesWorkspace';

interface ObjectiveRowItemProps {
  row: ObjectiveRow;
  globalIndex: number;
  onUpdate: (id: string, patch: Partial<ObjectiveRow>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function SourceIcon({ source }: { source: string }) {
  const iconClass = 'w-3.5 h-3.5 flex-shrink-0';
  const style = { color: 'var(--color-text-muted)' };

  if (source === 'explicit') {
    return (
      <span title="Explicit">
        <FileText className={iconClass} style={style} />
      </span>
    );
  }
  if (source === 'user_added') {
    return (
      <span title="User added">
        <User className={iconClass} style={style} />
      </span>
    );
  }
  // ai_generated, ai_polished, ai_added, inferred
  return (
    <span title="AI generated">
      <Sparkles className={iconClass} style={style} />
    </span>
  );
}

export function ObjectiveRowItem({ row, globalIndex, onUpdate, onDelete }: ObjectiveRowItemProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayText =
    row.status === 'polished' && row.textPolished ? row.textPolished : row.text;

  const startEdit = () => {
    setEditValue(displayText);
    setIsEditing(true);
    // Focus is handled by autoFocus on the input
  };

  const commitEdit = useCallback(async () => {
    if (!isEditing) return;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayText) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const patch: Partial<ObjectiveRow> =
        row.status === 'polished' && row.textPolished
          ? { textPolished: trimmed }
          : { text: trimmed };
      await onUpdate(row.id, patch);
    } catch {
      toast({
        title: 'Failed to save',
        description: 'Could not save objective. Please try again.',
        variant: 'destructive',
      });
      setEditValue(displayText);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }, [isEditing, editValue, displayText, row, onUpdate, toast]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    await onDelete(row.id);
  };

  // Close menu when clicking outside
  const handleMenuBlur = (e: React.FocusEvent) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      setShowMenu(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 group rounded px-2 py-1.5 transition-colors"
      style={{
        backgroundColor: isHovered
          ? 'var(--color-bg-hover)'
          : 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!isEditing) setShowMenu(false);
      }}
    >
      {/* Global index badge */}
      <span
        className="text-xs font-mono w-6 text-right flex-shrink-0 select-none"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {globalIndex}
      </span>

      {/* Text / Edit input */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-sm"
            style={{
              color: 'var(--color-text-primary)',
              borderBottom: '1px solid var(--color-accent-copper)',
              paddingBottom: '2px',
            }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
          />
        ) : (
          <span
            className="text-sm cursor-text block truncate"
            style={{ color: 'var(--color-text-primary)' }}
            onClick={startEdit}
            title={displayText}
          >
            {displayText}
          </span>
        )}
      </div>

      {/* Right side: source icon + save/cancel (edit mode) or kebab (hover) */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isEditing ? (
          <>
            <button
              className="p-0.5 rounded transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-accent-green)' }}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur firing before click
                commitEdit();
              }}
              title="Save"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-0.5 rounded transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseDown={(e) => {
                e.preventDefault();
                cancelEdit();
              }}
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {/* Source icon — always visible but muted */}
            <SourceIcon source={row.source} />

            {/* Kebab menu — visible on hover */}
            <div className="relative" ref={menuRef} onBlur={handleMenuBlur}>
              <button
                className="p-0.5 rounded transition-opacity"
                style={{
                  color: 'var(--color-text-muted)',
                  opacity: isHovered || showMenu ? 1 : 0,
                }}
                onClick={() => setShowMenu((prev) => !prev)}
                tabIndex={isHovered || showMenu ? 0 : -1}
                title="More options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-6 z-50 rounded-md shadow-lg py-1 min-w-[100px]"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg-hover)]"
                    style={{ color: 'var(--color-error)' }}
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
