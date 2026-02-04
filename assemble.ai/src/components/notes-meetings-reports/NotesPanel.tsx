/**
 * Notes Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Renders multiple SingleNotePanel instances (Note 1, Note 2, Note 3...).
 * Each note is its own collapsible section. "New Note" button creates additional notes.
 */

'use client';

import { useCallback, useState } from 'react';
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
    className?: string;
}

export function NotesPanel({
    projectId,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: NotesPanelProps) {
    const { notes, isLoading, error, refetch } = useNotes({ projectId });
    const { createNote, updateNote, deleteNote, copyNote } = useNoteMutations(projectId);

    // Track expanded state for each note independently
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

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

    const handleCreateNote = useCallback(async () => {
        const newNote = await createNote({ projectId });
        // Auto-expand the newly created note
        setExpandedNotes(prev => new Set(prev).add(newNote.id));
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
        const copied = await copyNote(noteId);
        // Auto-expand the copied note
        setExpandedNotes(prev => new Set(prev).add(copied.id));
    }, [copyNote]);

    // Error state
    if (error) {
        return (
            <div className={cn('mt-6', className)}>
                <div className="mx-2 mb-2">
                    {/* New Note Button - Sticky note pad */}
                    <button
                        onClick={handleCreateNote}
                        disabled={isLoading}
                        className="relative w-[140px] h-[140px] bg-[rgba(255,217,61,0.25)] border border-[rgba(255,217,61,0.4)] hover:bg-[rgba(255,217,61,0.35)] transition-colors disabled:opacity-50 group"
                        title="Create new note"
                    >
                        <div className="absolute -bottom-1 -right-1 w-[140px] h-[140px] bg-[rgba(255,217,61,0.15)] border border-[rgba(255,217,61,0.3)]" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-[140px] h-[140px] bg-[rgba(255,217,61,0.2)] border border-[rgba(255,217,61,0.35)]" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--color-bg-primary)] origin-top-right rotate-0 transform translate-x-2 -translate-y-2"
                                     style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
                                <div className="absolute top-0 right-0 w-6 h-6 bg-[rgba(255,217,61,0.5)] shadow-sm"
                                     style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                            </div>
                            <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-copper)] transition-colors">
                                <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-xs font-medium">New Note</span>
                            </div>
                        </div>
                    </button>
                </div>
                <div className="flex flex-col items-center justify-center p-8 bg-[var(--color-bg-secondary)] rounded-md mx-2">
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
            <div className={cn('mt-6', className)}>
                <div className="flex flex-wrap gap-2 mx-2">
                    <Skeleton className="w-[140px] h-[140px]" />
                    <Skeleton className="w-[140px] h-[140px]" />
                    <Skeleton className="w-[140px] h-[140px]" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn('mt-6', className)}>
            {/* New Note Button - Sticky note pad with peeling corner */}
            <div className="mx-2 mb-2">
                <button
                    onClick={handleCreateNote}
                    disabled={isLoading}
                    className="relative w-[140px] h-[140px] bg-[rgba(255,217,61,0.25)] border border-[rgba(255,217,61,0.4)] hover:bg-[rgba(255,217,61,0.35)] transition-colors disabled:opacity-50 group"
                    title="Create new note"
                >
                    {/* Stacked pages effect - bottom layers */}
                    <div className="absolute -bottom-1 -right-1 w-[140px] h-[140px] bg-[rgba(255,217,61,0.15)] border border-[rgba(255,217,61,0.3)]" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-[140px] h-[140px] bg-[rgba(255,217,61,0.2)] border border-[rgba(255,217,61,0.35)]" />

                    {/* Main note surface */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Peeling corner */}
                        <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-[var(--color-bg-primary)] origin-top-right rotate-0 transform translate-x-2 -translate-y-2"
                                 style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
                            <div className="absolute top-0 right-0 w-6 h-6 bg-[rgba(255,217,61,0.5)] shadow-sm"
                                 style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                        </div>

                        {/* Plus icon and text */}
                        <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-copper)] transition-colors">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span className="text-xs font-medium">New Note</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Render each note vertically */}
            {notes.length === 0 ? (
                <div className="mx-2 p-4 text-center">
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Click the note pad to create your first note.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {(notes as NoteWithCount[]).map((note, index) => (
                        <SingleNotePanel
                            key={note.id}
                            note={note}
                            noteNumber={index + 1}
                            isExpanded={expandedNotes.has(note.id)}
                            onToggleExpand={() => toggleNoteExpanded(note.id)}
                            onUpdate={(data) => handleUpdateNote(note.id, data)}
                            onCopy={() => handleCopyNote(note.id)}
                            onDelete={() => handleDeleteNote(note.id)}
                            onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(note.id) : undefined}
                            onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(note.id) : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default NotesPanel;
