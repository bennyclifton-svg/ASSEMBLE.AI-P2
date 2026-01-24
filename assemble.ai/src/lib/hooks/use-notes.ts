/**
 * Hook for Managing Notes
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides CRUD operations for notes with optimistic updates.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import type {
    Note,
    NoteWithTransmittals,
    CreateNoteRequest,
    UpdateNoteRequest,
    NotesListResponse,
} from '@/types/notes-meetings-reports';

// ============================================================================
// TYPES
// ============================================================================

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface UseNotesOptions {
    projectId: string;
}

interface UseNotesReturn {
    notes: NoteWithCount[];
    total: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface UseNoteOptions {
    noteId: string | null;
}

interface UseNoteReturn {
    note: NoteWithCount | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface TransmittalDocument {
    id: string;
    documentId: string;
    categoryId: string | null;
    subcategoryId: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
    documentName: string;
    revision: number;
    uploadedAt: string | null;
    addedAt: string;
}

interface UseNoteTransmittalReturn {
    documents: TransmittalDocument[];
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<void>;
    refetch: () => void;
}

interface UseNoteMutationsReturn {
    createNote: (data: CreateNoteRequest) => Promise<Note>;
    updateNote: (noteId: string, data: UpdateNoteRequest) => Promise<Note>;
    deleteNote: (noteId: string) => Promise<void>;
    copyNote: (noteId: string) => Promise<Note>;
    toggleStar: (noteId: string, isStarred: boolean) => Promise<Note>;
}

// ============================================================================
// FETCHERS
// ============================================================================

const fetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to fetch');
    }
    return res.json();
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching a list of notes for a project
 */
export function useNotes({ projectId }: UseNotesOptions): UseNotesReturn {
    const swrKey = projectId ? `/api/notes?projectId=${projectId}` : null;

    const { data, error, isLoading, mutate } = useSWR<NotesListResponse>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    return {
        notes: (data?.notes as NoteWithCount[]) ?? [],
        total: data?.total ?? 0,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/**
 * Hook for fetching a single note
 */
export function useNote({ noteId }: UseNoteOptions): UseNoteReturn {
    const swrKey = noteId ? `/api/notes/${noteId}` : null;

    const { data, error, isLoading, mutate } = useSWR<NoteWithCount>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    return {
        note: data ?? null,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/**
 * Hook for managing note mutations (create, update, delete, copy, toggleStar)
 */
export function useNoteMutations(projectId: string): UseNoteMutationsReturn {
    const listKey = `/api/notes?projectId=${projectId}`;

    /**
     * Create a new note
     */
    const createNote = useCallback(async (data: CreateNoteRequest): Promise<Note> => {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to create note' }));
            throw new Error(error.error || 'Failed to create note');
        }

        const created = await response.json();

        // Revalidate the notes list
        globalMutate(listKey);

        return created;
    }, [listKey]);

    /**
     * Update an existing note
     */
    const updateNote = useCallback(async (noteId: string, data: UpdateNoteRequest): Promise<Note> => {
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update note' }));
            throw new Error(error.error || 'Failed to update note');
        }

        const updated = await response.json();

        // Revalidate both list and individual note
        globalMutate(listKey);
        globalMutate(`/api/notes/${noteId}`);

        return updated;
    }, [listKey]);

    /**
     * Soft delete a note
     */
    const deleteNote = useCallback(async (noteId: string): Promise<void> => {
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to delete note' }));
            throw new Error(error.error || 'Failed to delete note');
        }

        // Revalidate the notes list
        globalMutate(listKey);
    }, [listKey]);

    /**
     * Copy a note
     */
    const copyNote = useCallback(async (noteId: string): Promise<Note> => {
        const response = await fetch(`/api/notes/${noteId}/copy`, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to copy note' }));
            throw new Error(error.error || 'Failed to copy note');
        }

        const copied = await response.json();

        // Revalidate the notes list
        globalMutate(listKey);

        return copied;
    }, [listKey]);

    /**
     * Toggle starred status
     */
    const toggleStar = useCallback(async (noteId: string, isStarred: boolean): Promise<Note> => {
        return updateNote(noteId, { isStarred });
    }, [updateNote]);

    return {
        createNote,
        updateNote,
        deleteNote,
        copyNote,
        toggleStar,
    };
}

/**
 * Hook for managing note transmittal (document attachments)
 */
export function useNoteTransmittal(noteId: string | null): UseNoteTransmittalReturn {
    const swrKey = noteId ? `/api/notes/${noteId}/transmittal` : null;

    const { data, error, isLoading, mutate } = useSWR<{ noteId: string; documents: TransmittalDocument[] }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Save document attachments to the note
     */
    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<void> => {
        if (!noteId) {
            throw new Error('Note ID is required');
        }

        const response = await fetch(`/api/notes/${noteId}/transmittal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to save transmittal' }));
            throw new Error(error.error || 'Failed to save transmittal');
        }

        // Revalidate transmittal data and note (for count update)
        mutate();
        globalMutate(`/api/notes/${noteId}`);
    }, [noteId, mutate]);

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    return {
        documents: data?.documents ?? [],
        isLoading,
        error: error ?? null,
        saveTransmittal,
        refetch,
    };
}
