/**
 * Hook for Managing Notes
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides CRUD operations for notes with optimistic updates.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
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

// ============================================================================
// DROP UPLOAD HOOK
// ============================================================================

interface UploadProgress {
    current: number;
    total: number;
}

interface UseNoteDropUploadOptions {
    currentTitle?: string;
    onUpdateTitle?: (title: string) => Promise<void>;
    onSuccess?: () => void;
}

/**
 * Derive a human-readable title from a filename.
 * e.g. "mechanical_specification_summary_v2.pdf" → "Mechanical Specification Summary"
 */
function titleFromFilename(filename: string): string {
    // Strip extension
    let name = filename.replace(/\.[^.]+$/, '');
    // Strip version/revision suffixes (v1, V2, rev-A, _final, _draft, -1)
    name = name.replace(/[-_ ]*(v\d+|rev[-_ ]?[a-z0-9]+|final|draft|copy)$/i, '');
    // Strip leading date patterns (2024-01-15-, 20240115_)
    name = name.replace(/^\d{4}[-_]?\d{2}[-_]?\d{2}[-_ ]*/, '');
    // Replace separators with spaces
    name = name.replace(/[-_]+/g, ' ');
    // Title case each word
    name = name.replace(/\b\w/g, c => c.toUpperCase()).trim();
    return name || filename;
}

interface UseNoteDropUploadReturn {
    isUploading: boolean;
    uploadProgress: UploadProgress | null;
    isDragOver: boolean;
    getRootProps: ReturnType<typeof useDropzone>['getRootProps'];
    getInputProps: ReturnType<typeof useDropzone>['getInputProps'];
}

/**
 * Hook for drag-and-drop file upload onto a note.
 * Uploads the file, triggers RAG ingestion, and attaches it to the note.
 */
export function useNoteDropUpload(
    noteId: string,
    projectId: string,
    options?: UseNoteDropUploadOptions
): UseNoteDropUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress({ current: 0, total: acceptedFiles.length });

        let successCount = 0;

        for (let i = 0; i < acceptedFiles.length; i++) {
            const file = acceptedFiles[i];
            setUploadProgress({ current: i + 1, total: acceptedFiles.length });

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', projectId);

                const response = await fetch(`/api/notes/${noteId}/upload-attachment`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({ error: 'Upload failed' }));
                    throw new Error(err.error || 'Upload failed');
                }

                successCount++;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Upload failed';
                toast.error(`Failed to upload ${file.name}: ${message}`);
            }
        }

        // Revalidate note data
        globalMutate(`/api/notes?projectId=${projectId}`);
        globalMutate(`/api/notes/${noteId}/transmittal`);

        if (successCount > 0) {
            if (successCount === 1) {
                toast.success(`${acceptedFiles[0].name} attached to note`);
            } else {
                toast.success(`${successCount} files attached to note`);
            }

            // Auto-name the note from the first file if title is still default
            if (options?.onUpdateTitle && (!options.currentTitle || options.currentTitle === 'New Note')) {
                const autoTitle = titleFromFilename(acceptedFiles[0].name);
                if (autoTitle) {
                    options.onUpdateTitle(autoTitle);
                }
            }

            options?.onSuccess?.();

            // Notify document repository to refresh its list
            window.dispatchEvent(new CustomEvent('documents-changed'));
        }

        setIsUploading(false);
        setUploadProgress(null);
    }, [noteId, projectId, options]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        disabled: isUploading,
    });

    return {
        isUploading,
        uploadProgress,
        isDragOver: isDragActive,
        getRootProps,
        getInputProps,
    };
}

// ============================================================================
// EXPORT HOOKS
// ============================================================================

export type ExportFormat = 'pdf' | 'docx';

interface UseNoteExportReturn {
    exportNote: (format: ExportFormat) => Promise<void>;
}

/**
 * Hook for exporting a note to PDF or DOCX
 */
export function useNoteExport(noteId: string | null): UseNoteExportReturn {
    const exportNote = useCallback(async (format: ExportFormat): Promise<void> => {
        if (!noteId) {
            throw new Error('Note ID is required');
        }

        const response = await fetch(`/api/notes/${noteId}/export?format=${format}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to export note' }));
            throw new Error(error.error || 'Failed to export note');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `Note.${format}`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
            if (match) {
                filename = match[1];
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, [noteId]);

    return { exportNote };
}
