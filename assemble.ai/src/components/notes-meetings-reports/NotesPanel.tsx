/**
 * Notes Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Renders multiple SingleNotePanel instances (Note 1, Note 2, Note 3...).
 * Each note is its own collapsible section. "New Note" button creates additional notes.
 */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SingleNotePanel } from './SingleNotePanel';
import { NotesToolbar } from './NotesToolbar';
import { useNotes, useNoteMutations } from '@/lib/hooks/use-notes';
import { useUiPreferences, type NotesSortDir, type NotesSortField, type NotesViewMode } from '@/lib/hooks/use-ui-preferences';
import { cn } from '@/lib/utils';
import { getNoteType, NOTE_TYPES, NOTE_TYPE_LABELS, type Note, type NoteColor, type NoteType } from '@/types/notes-meetings-reports';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface NotesPanelProps {
    projectId: string;
    onSaveTransmittal?: (noteId: string) => void;
    onLoadTransmittal?: (noteId: string) => void;
    onExpandedChange?: (hasExpanded: boolean) => void;
    className?: string;
}

const DEFAULT_SORT_DIR_BY_FIELD: Record<NotesSortField, NotesSortDir> = {
    date: 'desc',
    type: 'asc',
};

const TYPE_SORT_ORDER: Record<NoteType, number> = NOTE_TYPES.reduce((acc, type, index) => {
    acc[type] = index;
    return acc;
}, {} as Record<NoteType, number>);

function normaliseView(value: unknown): NotesViewMode {
    return value === 'list' ? 'list' : 'tiles';
}

function normaliseSortField(value: unknown): NotesSortField {
    return value === 'type' ? 'type' : 'date';
}

function normaliseSortDir(value: unknown, field: NotesSortField): NotesSortDir {
    return value === 'asc' || value === 'desc' ? value : DEFAULT_SORT_DIR_BY_FIELD[field];
}

function noteSortTimestamp(note: NoteWithCount): number {
    const date = note.noteDate || note.createdAt;
    const time = date ? new Date(date.includes('T') ? date : `${date}T00:00:00`).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
}

export function NotesPanel({
    projectId,
    onSaveTransmittal,
    onLoadTransmittal,
    onExpandedChange,
    className,
}: NotesPanelProps) {
    const { notes, isLoading, error, refetch } = useNotes({ projectId });
    const { createNote, updateNote, deleteNote, copyNote } = useNoteMutations(projectId);
    const { preferences, updatePreferences } = useUiPreferences(projectId);

    // Track expanded state for each note independently
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
    // Filter pills: empty set = show all types
    const [selectedTypes, setSelectedTypes] = useState<Set<NoteType>>(new Set());
    const prefNotes = preferences.notes ?? {};
    const view = normaliseView(prefNotes.view);
    const sortField = normaliseSortField(prefNotes.sortField);
    const sortDir = normaliseSortDir(prefNotes.sortDir, sortField);
    const [sortDirByField, setSortDirByField] = useState<Record<NotesSortField, NotesSortDir>>(DEFAULT_SORT_DIR_BY_FIELD);
    const effectiveSortDirByField = useMemo(
        () => ({ ...sortDirByField, [sortField]: sortDir }),
        [sortDirByField, sortField, sortDir]
    );

    // Notify parent when expansion state changes
    useEffect(() => {
        onExpandedChange?.(expandedNotes.size > 0);
    }, [expandedNotes.size, onExpandedChange]);

    const toggleNoteExpanded = useCallback((noteId: string) => {
        setExpandedNotes(prev => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
    }, []);

    const handleCreateNote = useCallback(async (color: NoteColor = 'yellow') => {
        await createNote({ projectId, color });
        // Note stays collapsed by default
    }, [createNote, projectId]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        await deleteNote(noteId);
        // Remove from expanded set
        setExpandedNotes(prev => {
            const next = new Set(prev);
            next.delete(noteId);
            return next;
        });
    }, [deleteNote]);

    const handleUpdateNote = useCallback(async (noteId: string, data: Parameters<typeof updateNote>[1]) => {
        await updateNote(noteId, data);
    }, [updateNote]);

    const handleCopyNote = useCallback(async (noteId: string) => {
        await copyNote(noteId);
        // Copied note stays collapsed by default
    }, [copyNote]);

    const handleViewChange = useCallback((nextView: NotesViewMode) => {
        updatePreferences({ notes: { view: nextView } });
    }, [updatePreferences]);

    const handleSortChange = useCallback((field: NotesSortField, dir: NotesSortDir) => {
        setSortDirByField((prev) => ({ ...prev, [field]: dir }));
        updatePreferences({ notes: { sortField: field, sortDir: dir } });
    }, [updatePreferences]);

    const sortedNotes = useMemo(() => {
        const direction = sortDir === 'asc' ? 1 : -1;
        return [...(notes as NoteWithCount[])].sort((a, b) => {
            if (sortField === 'type') {
                const typeDiff = TYPE_SORT_ORDER[getNoteType(a.type)] - TYPE_SORT_ORDER[getNoteType(b.type)];
                if (typeDiff !== 0) return typeDiff * direction;
            } else {
                const dateDiff = noteSortTimestamp(a) - noteSortTimestamp(b);
                if (dateDiff !== 0) return dateDiff * direction;
                if (!!a.noteDate !== !!b.noteDate) return a.noteDate ? -1 : 1;
            }
            return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        });
    }, [notes, sortDir, sortField]);

    const visibleNotes = useMemo(() => {
        if (selectedTypes.size === 0) return sortedNotes;
        return sortedNotes.filter((note) => selectedTypes.has(getNoteType(note.type)));
    }, [sortedNotes, selectedTypes]);

    const handleTypeFilterClick = useCallback((type: NoteType, event: React.MouseEvent) => {
        const additive = event.ctrlKey || event.metaKey;
        setSelectedTypes((prev) => {
            const next = new Set(prev);
            if (additive) {
                if (next.has(type)) next.delete(type);
                else next.add(type);
            } else if (next.size === 1 && next.has(type)) {
                next.clear();
            } else {
                next.clear();
                next.add(type);
            }
            return next;
        });
    }, []);

    // Error state
    if (error) {
        return (
            <div className={cn('mt-6 flex gap-4', className)}>
                {/* Sticky note buttons - vertical column */}
                <div className="flex flex-col gap-1 shrink-0">
                    {[
                        { name: 'sticky_yellow', color: 'yellow' as NoteColor },
                        { name: 'sticky_blue', color: 'blue' as NoteColor },
                        { name: 'sticky_pink', color: 'pink' as NoteColor },
                        { name: 'sticky_green', color: 'green' as NoteColor },
                    ].map(({ name, color }, i) => (
                        <button
                            key={name}
                            onClick={() => handleCreateNote(color)}
                            disabled={isLoading}
                            className="relative cursor-pointer hover:scale-105 transition-transform disabled:opacity-50"
                            title={`Create ${color} note`}
                        >
                            <Image
                                src={`/images/${name}.svg`}
                                alt={`Create ${color} note`}
                                width={100}
                                height={100}
                                priority={i === 0}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pb-3">
                                <span className="text-4xl font-light text-black/40">+</span>
                            </div>
                        </button>
                    ))}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-bg-secondary)] rounded-md">
                    <div className="rounded-full bg-red-500/10 p-4 mb-4">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                        Failed to load notes
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-4 text-center max-w-xs">
                        There was an error loading your notes. Please try again.
                    </p>
                    <Button variant="outline" onClick={refetch}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className={cn('mt-6 flex gap-4', className)}>
                {/* Sticky note buttons - vertical column */}
                <div className="flex flex-col gap-1 shrink-0">
                    {['sticky_yellow', 'sticky_blue', 'sticky_pink', 'sticky_green'].map((name, i) => (
                        <div key={name} className="relative">
                            <Image
                                src={`/images/${name}.svg`}
                                alt="Sticky Notes"
                                width={100}
                                height={100}
                                priority={i === 0}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pb-3">
                                <span className="text-4xl font-light text-black/40">+</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex-1 min-w-0 grid gap-x-2 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                    <Skeleton className="h-[140px]" />
                    <Skeleton className="h-[140px]" />
                    <Skeleton className="h-[140px]" />
                    <Skeleton className="h-[140px]" />
                </div>
            </div>
        );
    }

    const stickyButtons: { name: string; color: NoteColor }[] = [
        { name: 'sticky_yellow', color: 'yellow' },
        { name: 'sticky_blue', color: 'blue' },
        { name: 'sticky_pink', color: 'pink' },
        { name: 'sticky_green', color: 'green' },
    ];

    return (
        <div className={cn('mt-6 flex gap-4', className)}>
            {/* Sticky note buttons - vertical column */}
            <div className="flex flex-col gap-1 shrink-0 sticky top-0 self-start">
                {stickyButtons.map(({ name, color }, i) => (
                    <button
                        key={name}
                        onClick={() => handleCreateNote(color)}
                        disabled={isLoading}
                        className="relative cursor-pointer hover:scale-105 transition-transform disabled:opacity-50"
                        title={`Create ${color} note`}
                    >
                        <Image
                            src={`/images/${name}.svg`}
                            alt={`Create ${color} note`}
                            width={100}
                            height={100}
                            priority={i === 0}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pb-3">
                            <span className="text-4xl font-light text-black/40">+</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Notes grid - to the right of sticky buttons */}
            <div className="flex-1 min-w-0">
                {/* Type filter pills - click to filter, Ctrl/Cmd-click to multi-select */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {NOTE_TYPES.map((type) => {
                        const isSelected = selectedTypes.has(type);
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={(e) => handleTypeFilterClick(type, e)}
                                title={`Filter by ${NOTE_TYPE_LABELS[type]} (Ctrl/Cmd-click to multi-select)`}
                                className={cn(
                                    'h-8 px-2.5 py-1 rounded-lg border text-sm font-medium whitespace-nowrap',
                                    'transition-all duration-200 ease-in-out cursor-pointer',
                                    isSelected
                                        ? 'bg-[var(--color-accent-copper)] border-[var(--color-accent-copper)] text-[var(--color-text-inverse)]'
                                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-copper)]/50 hover:bg-[var(--color-accent-copper-tint)] hover:text-[var(--color-accent-copper)]'
                                )}
                                style={
                                    !isSelected
                                        ? { backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }
                                        : undefined
                                }
                            >
                                {NOTE_TYPE_LABELS[type]}
                            </button>
                        );
                    })}
                </div>

                <NotesToolbar
                    view={view}
                    sortField={sortField}
                    sortDir={sortDir}
                    sortDirByField={effectiveSortDirByField}
                    onViewChange={handleViewChange}
                    onSortChange={handleSortChange}
                    className="mb-3"
                />

                {notes.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Click a sticky note to create your first note.
                        </p>
                    </div>
                ) : visibleNotes.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            No notes match the selected filter{selectedTypes.size > 1 ? 's' : ''}.
                        </p>
                    </div>
                ) : (
                    <div
                        className={cn(view === 'list' ? 'flex flex-col gap-2' : 'grid gap-x-2 gap-y-4')}
                        style={view === 'tiles' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' } : undefined}
                    >
                        {visibleNotes.map((note, index) => {
                            const expanded = expandedNotes.has(note.id);
                            return (
                                <div
                                    key={note.id}
                                    style={view === 'tiles' && expanded ? { gridColumn: '1 / -1' } : undefined}
                                >
                                    <SingleNotePanel
                                        note={note}
                                        noteNumber={index + 1}
                                        projectId={projectId}
                                        isExpanded={expanded}
                                        isListMode={view === 'list'}
                                        onToggleExpand={() => toggleNoteExpanded(note.id)}
                                        onUpdate={(data) => handleUpdateNote(note.id, data)}
                                        onCopy={() => handleCopyNote(note.id)}
                                        onDelete={() => handleDeleteNote(note.id)}
                                        onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(note.id) : undefined}
                                        onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(note.id) : undefined}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotesPanel;
