'use client';

import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useProjectEvents } from '@/lib/hooks/use-project-events';
import type {
    AddRfiEvidenceRequest,
    CreateRfiRequest,
    GenerateRfiExportRequest,
    PromoteNoteToRfiRequest,
    RecordRfiResponseRequest,
    RfiIssuedArtefact,
    RfiIssuedArtefactListResponse,
    RfiFilter,
    RfiListResponse,
    RfiRecord,
    UpdateRfiRequest,
} from '@/types/rfi';

interface UseRfisOptions {
    projectId: string;
    filter?: RfiFilter;
}

interface UseRfisReturn {
    rfis: RfiRecord[];
    total: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface UseRfiMutationsReturn {
    createRfi: (data: CreateRfiRequest) => Promise<RfiRecord>;
    updateRfi: (rfiId: string, data: UpdateRfiRequest) => Promise<RfiRecord>;
    recordResponse: (rfiId: string, data: RecordRfiResponseRequest) => Promise<RfiRecord>;
    closeRfi: (rfiId: string) => Promise<RfiRecord>;
    reopenRfi: (rfiId: string) => Promise<RfiRecord>;
    addEvidence: (rfiId: string, data: AddRfiEvidenceRequest) => Promise<RfiRecord>;
    removeEvidence: (rfiId: string, linkId: string) => Promise<RfiRecord>;
    promoteNote: (data: PromoteNoteToRfiRequest) => Promise<RfiRecord>;
}

interface UseRfiExportsOptions {
    projectId: string;
    rfiId: string | null;
}

interface UseRfiExportsReturn {
    issuedArtefacts: RfiIssuedArtefact[];
    latestIssuedArtefact: RfiIssuedArtefact | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface UseRfiExportMutationsReturn {
    generateExport: (rfiId: string, data?: GenerateRfiExportRequest) => Promise<RfiIssuedArtefact>;
}

async function fetcher<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}

function listKey(projectId: string, filter: RfiFilter): string {
    return `/api/projects/${projectId}/rfis?filter=${filter}`;
}

function exportsKey(projectId: string, rfiId: string): string {
    return `/api/projects/${projectId}/rfis/${rfiId}/exports`;
}

export function useRfis({ projectId, filter = 'all' }: UseRfisOptions): UseRfisReturn {
    const swrKey = projectId ? listKey(projectId, filter) : null;

    const { data, error, isLoading, mutate } = useSWR<RfiListResponse>(swrKey, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 3000,
    });

    useProjectEvents(
        projectId || null,
        useCallback(
            (event) => {
                if (event.type !== 'entity_updated' || event.entity !== 'rfi') return;
                mutate();
                globalMutate(`/api/projects/${projectId}/rfis/${event.id}`);
            },
            [mutate, projectId]
        )
    );

    return {
        rfis: data?.rfis ?? [],
        total: data?.total ?? 0,
        isLoading,
        error: error ?? null,
        refetch: () => {
            mutate();
        },
    };
}

export function useRfiMutations(projectId: string, filter: RfiFilter = 'all'): UseRfiMutationsReturn {
    const mutateLists = useCallback(() => {
        globalMutate(listKey(projectId, filter));
        if (filter !== 'all') globalMutate(listKey(projectId, 'all'));
    }, [filter, projectId]);

    const createRfi = useCallback(async (data: CreateRfiRequest): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to create RFI' }));
            throw new Error(error.error || 'Failed to create RFI');
        }
        const created = await response.json();
        mutateLists();
        return created;
    }, [mutateLists, projectId]);

    const updateRfi = useCallback(async (rfiId: string, data: UpdateRfiRequest): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update RFI' }));
            throw new Error(error.error || 'Failed to update RFI');
        }
        const updated = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        return updated;
    }, [mutateLists, projectId]);

    const addEvidence = useCallback(async (rfiId: string, data: AddRfiEvidenceRequest): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to add RFI evidence' }));
            throw new Error(error.error || 'Failed to add RFI evidence');
        }
        const updated = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        return updated;
    }, [mutateLists, projectId]);

    const recordResponse = useCallback(async (
        rfiId: string,
        data: RecordRfiResponseRequest
    ): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to record RFI response' }));
            throw new Error(error.error || 'Failed to record RFI response');
        }
        const updated = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        return updated;
    }, [mutateLists, projectId]);

    const closeRfi = useCallback(async (rfiId: string): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}/close`, {
            method: 'POST',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to close RFI' }));
            throw new Error(error.error || 'Failed to close RFI');
        }
        const updated = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        return updated;
    }, [mutateLists, projectId]);

    const reopenRfi = useCallback(async (rfiId: string): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}/reopen`, {
            method: 'POST',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to reopen RFI' }));
            throw new Error(error.error || 'Failed to reopen RFI');
        }
        const updated = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        return updated;
    }, [mutateLists, projectId]);

    const removeEvidence = useCallback(async (rfiId: string, linkId: string): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/${rfiId}/evidence/${linkId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to remove RFI evidence' }));
            throw new Error(error.error || 'Failed to remove RFI evidence');
        }
        const updated = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        return updated;
    }, [mutateLists, projectId]);

    const promoteNote = useCallback(async (data: PromoteNoteToRfiRequest): Promise<RfiRecord> => {
        const response = await fetch(`/api/projects/${projectId}/rfis/promote-note`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to promote RFI note' }));
            throw new Error(error.error || 'Failed to promote RFI note');
        }
        const promoted = await response.json();
        mutateLists();
        globalMutate(`/api/projects/${projectId}/rfis/${promoted.id}`);
        return promoted;
    }, [mutateLists, projectId]);

    return { createRfi, updateRfi, recordResponse, closeRfi, reopenRfi, addEvidence, removeEvidence, promoteNote };
}

export function useRfiExports({ projectId, rfiId }: UseRfiExportsOptions): UseRfiExportsReturn {
    const swrKey = projectId && rfiId ? exportsKey(projectId, rfiId) : null;

    const { data, error, isLoading, mutate } = useSWR<RfiIssuedArtefactListResponse>(swrKey, fetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 3000,
    });

    useProjectEvents(
        projectId || null,
        useCallback(
            (event) => {
                if (!rfiId || event.type !== 'entity_updated' || event.entity !== 'rfi' || event.id !== rfiId) return;
                mutate();
            },
            [mutate, rfiId]
        )
    );

    return {
        issuedArtefacts: data?.issuedArtefacts ?? [],
        latestIssuedArtefact: data?.latestIssuedArtefact ?? null,
        isLoading,
        error: error ?? null,
        refetch: () => {
            mutate();
        },
    };
}

export function useRfiExportMutations(projectId: string): UseRfiExportMutationsReturn {
    const generateExport = useCallback(async (
        rfiId: string,
        data: GenerateRfiExportRequest = {}
    ): Promise<RfiIssuedArtefact> => {
        const response = await fetch(exportsKey(projectId, rfiId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to generate RFI export' }));
            throw new Error(error.error || 'Failed to generate RFI export');
        }
        const issuedArtefact = await response.json();
        globalMutate(exportsKey(projectId, rfiId));
        globalMutate(`/api/projects/${projectId}/rfis/${rfiId}`);
        globalMutate(listKey(projectId, 'all'));
        return issuedArtefact;
    }, [projectId]);

    return { generateExport };
}
