'use client';

import { ArrowDown, ArrowUp, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotesSortDir, NotesSortField, NotesViewMode } from '@/lib/hooks/use-ui-preferences';

interface NotesToolbarProps {
    view: NotesViewMode;
    sortField: NotesSortField;
    sortDir: NotesSortDir;
    onViewChange: (view: NotesViewMode) => void;
    /** Called when a sort button is pressed. Direction is the new direction to apply. */
    onSortChange: (field: NotesSortField, dir: NotesSortDir) => void;
    /** Per-field remembered direction (used when switching to an inactive field). */
    sortDirByField: Record<NotesSortField, NotesSortDir>;
    className?: string;
}

const SORT_FIELDS: { key: NotesSortField; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
];

export function NotesToolbar({
    view,
    sortField,
    sortDir,
    onViewChange,
    onSortChange,
    sortDirByField,
    className,
}: NotesToolbarProps) {
    const handleSortClick = (field: NotesSortField) => {
        if (field === sortField) {
            // Active field — flip direction.
            onSortChange(field, sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            // Switching field — use its remembered direction.
            onSortChange(field, sortDirByField[field]);
        }
    };

    return (
        <div className={cn('flex items-center justify-between gap-3', className)}>
            {/* View toggle */}
            <div className="flex items-center gap-1.5">
                <ToolbarButton
                    active={view === 'tiles'}
                    onClick={() => onViewChange('tiles')}
                    title="Tile view"
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Tiles
                </ToolbarButton>
                <ToolbarButton
                    active={view === 'list'}
                    onClick={() => onViewChange('list')}
                    title="List view"
                >
                    <List className="h-3.5 w-3.5" />
                    List
                </ToolbarButton>
            </div>

            {/* Sort buttons */}
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--color-text-muted)] mr-0.5">Sort:</span>
                {SORT_FIELDS.map(({ key, label }) => {
                    const isActive = key === sortField;
                    return (
                        <ToolbarButton
                            key={key}
                            active={isActive}
                            onClick={() => handleSortClick(key)}
                            title={
                                isActive
                                    ? `Sorted by ${label.toLowerCase()} (${sortDir === 'asc' ? 'ascending' : 'descending'}). Click to flip.`
                                    : `Sort by ${label.toLowerCase()}`
                            }
                        >
                            {label}
                            {isActive &&
                                (sortDir === 'asc' ? (
                                    <ArrowUp className="h-3 w-3" />
                                ) : (
                                    <ArrowDown className="h-3 w-3" />
                                ))}
                        </ToolbarButton>
                    );
                })}
            </div>
        </div>
    );
}

interface ToolbarButtonProps {
    active: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                active
                    ? 'bg-[var(--color-accent-copper-tint)] text-[var(--color-accent-copper)] hover:bg-[var(--color-accent-copper-tint)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
            )}
        >
            {children}
        </button>
    );
}

export default NotesToolbar;
