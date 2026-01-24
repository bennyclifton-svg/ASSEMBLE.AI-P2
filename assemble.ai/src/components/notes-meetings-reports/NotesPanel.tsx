/**
 * Notes Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container for the Notes sub-module with list and create functionality.
 * Phase 9: Added loading skeletons, enhanced empty state, delete confirmation.
 */

'use client';

import { useState, useCallback } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteCard } from './NoteCard';
import { DeleteConfirmDialog } from './shared/DeleteConfirmDialog';
import { useNotes, useNoteMutations } from '@/lib/hooks/use-notes';
import { cn } from '@/lib/utils';

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

    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; noteId: string; noteTitle: string }>({
        open: false,
        noteId: '',
        noteTitle: '',
    });

    const handleCreateNote = useCallback(async () => {
        setIsCreating(true);
        try {
            const newNote = await createNote({ projectId });
            setExpandedNoteId(newNote.id);
        } finally {
            setIsCreating(false);
        }
    }, [createNote, projectId]);

    const handleToggleExpand = useCallback((noteId: string) => {
        setExpandedNoteId((prev) => (prev === noteId ? null : noteId));
    }, []);

    const handleUpdateNote = useCallback(async (
        noteId: string,
        data: { title?: string; content?: string; isStarred?: boolean }
    ) => {
        await updateNote(noteId, data);
    }, [updateNote]);

    const handleCopyNote = useCallback(async (noteId: string) => {
        const copied = await copyNote(noteId);
        setExpandedNoteId(copied.id);
    }, [copyNote]);

    const handleDeleteClick = useCallback((noteId: string, noteTitle: string) => {
        setDeleteDialog({ open: true, noteId, noteTitle });
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        const { noteId } = deleteDialog;
        if (expandedNoteId === noteId) {
            setExpandedNoteId(null);
        }
        await deleteNote(noteId);
    }, [deleteNote, expandedNoteId, deleteDialog]);

    // Error state
    if (error) {
        return (
            <div className={cn('flex flex-col h-full', className)}>
                <PanelHeader notesCount={0} isCreating={isCreating} onCreateNote={handleCreateNote} />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
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

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <PanelHeader
                notesCount={isLoading ? 0 : notes.length}
                isCreating={isCreating}
                onCreateNote={handleCreateNote}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <NotesPanelSkeleton />
                ) : notes.length === 0 ? (
                    <EmptyState onCreateNote={handleCreateNote} isCreating={isCreating} />
                ) : (
                    <div className="space-y-3">
                        {notes.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isExpanded={expandedNoteId === note.id}
                                onToggleExpand={() => handleToggleExpand(note.id)}
                                onUpdate={(data) => handleUpdateNote(note.id, data)}
                                onCopy={() => handleCopyNote(note.id)}
                                onDelete={async () => handleDeleteClick(note.id, note.title)}
                                onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(note.id) : undefined}
                                onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(note.id) : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
                onConfirm={handleConfirmDelete}
                itemName={deleteDialog.noteTitle}
                itemType="note"
            />
        </div>
    );
}

// Panel Header Component
interface PanelHeaderProps {
    notesCount: number;
    isCreating: boolean;
    onCreateNote: () => void;
}

function PanelHeader({ notesCount, isCreating, onCreateNote }: PanelHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Notes
                </h2>
                {notesCount > 0 && (
                    <span className="text-sm text-[var(--color-text-muted)]">
                        ({notesCount})
                    </span>
                )}
            </div>

            <Button
                variant="copper"
                size="sm"
                onClick={onCreateNote}
                disabled={isCreating}
                title="Create new note"
            >
                {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4 mr-1" />
                )}
                New Note
            </Button>
        </div>
    );
}

// Loading Skeleton Component
function NotesPanelSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden"
                >
                    {/* Header skeleton */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                        <div className="flex items-center gap-2 flex-1">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Empty State Component
interface EmptyStateProps {
    onCreateNote: () => void;
    isCreating: boolean;
}

function EmptyState({ onCreateNote, isCreating }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-[var(--color-bg-tertiary)] p-4 mb-4">
                <StickyNote className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                No notes yet
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-xs">
                Create your first note to capture quick thoughts, research findings, or meeting observations.
            </p>
            <Button
                variant="copper"
                onClick={onCreateNote}
                disabled={isCreating}
            >
                {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4 mr-2" />
                )}
                Create Note
            </Button>
        </div>
    );
}

export default NotesPanel;
