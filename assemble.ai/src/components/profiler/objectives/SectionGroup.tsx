'use client';

import { useState } from 'react';
import {
  Target,
  Zap,
  Star,
  Shield,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from './ObjectivesWorkspace';
import { ObjectiveRowItem } from './ObjectiveRow';

interface SectionGroupProps {
  type: ObjectiveType;
  label: string;
  rows: ObjectiveRow[];
  startIndex: number;
  onUpdate: (id: string, patch: Partial<ObjectiveRow>) => Promise<void>;
  onCreate: (type: ObjectiveType, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TYPE_ICONS: Record<ObjectiveType, React.ElementType> = {
  planning: Target,
  functional: Zap,
  quality: Star,
  compliance: Shield,
};

export function SectionGroup({
  type,
  label,
  rows,
  startIndex,
  onUpdate,
  onCreate,
  onDelete,
  isCollapsed = false,
  onToggleCollapse,
}: SectionGroupProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [addText, setAddText] = useState('');

  const Icon = TYPE_ICONS[type];

  const handleAdd = () => {
    setIsAdding(true);
    setAddText('');
  };

  const commitAdd = async () => {
    const trimmed = addText.trim();
    if (trimmed) {
      await onCreate(type, trimmed);
    }
    setIsAdding(false);
    setAddText('');
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setAddText('');
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelAdd();
    }
  };

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* Segmented ribbon header */}
      <div
        className="flex items-stretch gap-0.5 p-2 cursor-pointer select-none"
        onClick={onToggleCollapse}
        role="button"
        aria-expanded={!isCollapsed}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse?.();
          }
        }}
      >
        {/* Left segment: collapse icon + type icon + label + count */}
        <div
          className="flex items-center gap-2 px-3 py-2 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-l-md flex-1"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          )}
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent-copper)' }} />
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {label}
          </span>
          {/* Count badge */}
          <span
            className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--color-accent-copper-tint)',
              color: 'var(--color-accent-copper)',
            }}
          >
            {rows.length}
          </span>
        </div>

        {/* Right segment: + Add button */}
        <div
          className="flex items-center px-3 py-2 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-r-md"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
          onClick={(e) => e.stopPropagation()} // Don't toggle collapse when clicking add
        >
          <button
            className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-accent-copper)' }}
            onClick={handleAdd}
            title={`Add ${label} objective`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Body — hidden when collapsed */}
      {!isCollapsed && (
        <div
          className="px-3 pb-3 pt-1 space-y-1"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 60%, transparent)' }}
        >
          {rows.length === 0 && !isAdding && (
            <p
              className="text-xs py-2 px-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No {label.toLowerCase()} objectives yet
            </p>
          )}

          {rows.map((row, index) => (
            <ObjectiveRowItem
              key={row.id}
              row={row}
              globalIndex={startIndex + index}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}

          {/* Inline add input */}
          {isAdding && (
            <div
              className="flex items-center gap-2 rounded px-2 py-1.5 mt-1"
              style={{
                border: '1px solid var(--color-accent-copper)',
                backgroundColor: 'color-mix(in srgb, var(--color-accent-copper-tint) 50%, transparent)',
              }}
            >
              <span
                className="text-xs font-mono w-6 text-right flex-shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {startIndex + rows.length}
              </span>
              <input
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{ color: 'var(--color-text-primary)' }}
                placeholder="New objective..."
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onBlur={commitAdd}
                onKeyDown={handleAddKeyDown}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
