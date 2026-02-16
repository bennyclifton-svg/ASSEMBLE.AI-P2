/**
 * Notes Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Renders multiple SingleNotePanel instances (Note 1, Note 2, Note 3...).
 * Each note is its own collapsible section. "New Note" button creates additional notes.
 */

'use client';

import { useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SingleNotePanel } from './SingleNotePanel';
import { useNotes, useNoteMutations } from '@/lib/hooks/use-notes';
import { cn } from '@/lib/utils';
import type { Note, NoteColor } from '@/types/notes-meetings-reports';

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

export function NotesPanel({
    projectId,
    onSaveTransmittal,
    onLoadTransmittal,
    onExpandedChange,
    className,
}: NotesPanelProps) {
    const { notes, isLoading, error, refetch } = useNotes({ projectId });
    const { createNote, updateNote, deleteNote, copyNote } = useNoteMutations(projectId);

    // Track expanded state for each note independently
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

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

    const handleUpdateNote = useCallback(async (
        noteId: string,
        data: { title?: string; content?: string; isStarred?: boolean; color?: NoteColor }
    ) => {
        await updateNote(noteId, data);
    }, [updateNote]);

    const handleCopyNote = useCallback(async (noteId: string) => {
        await copyNote(noteId);
        // Copied note stays collapsed by default
    }, [copyNote]);

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

    const hasExpanded = expandedNotes.size > 0;

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
                {notes.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Click a sticky note to create your first note.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Collapsed notes in grid */}
                        <div className="grid gap-x-2 gap-y-4 shrink-0" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                            {[...(notes as NoteWithCount[])].sort((a, b) =>
                                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                            ).filter(note => !expandedNotes.has(note.id)).map((note, index) => (
                                <SingleNotePanel
                                    key={note.id}
                                    note={note}
                                    noteNumber={index + 1}
                                    isExpanded={false}
                                    onToggleExpand={() => toggleNoteExpanded(note.id)}
                                    onUpdate={(data) => handleUpdateNote(note.id, data)}
                                    onCopy={() => handleCopyNote(note.id)}
                                    onDelete={() => handleDeleteNote(note.id)}
                                    onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(note.id) : undefined}
                                    onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(note.id) : undefined}
                                />
                            ))}
                        </div>

                        {/* Expanded notes below the grid, each fills remaining space */}
                        {[...(notes as NoteWithCount[])].sort((a, b) =>
                            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        ).filter(note => expandedNotes.has(note.id)).map((note, index) => (
                            <div key={note.id}>
                                <SingleNotePanel
                                    note={note}
                                    noteNumber={index + 1}
                                    isExpanded={true}
                                    onToggleExpand={() => toggleNoteExpanded(note.id)}
                                    onUpdate={(data) => handleUpdateNote(note.id, data)}
                                    onCopy={() => handleCopyNote(note.id)}
                                    onDelete={() => handleDeleteNote(note.id)}
                                    onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(note.id) : undefined}
                                    onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(note.id) : undefined}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotesPanel;
