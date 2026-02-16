/**
 * Hook for Managing Meetings
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides CRUD operations for meetings with sections and attendees.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import type {
    Meeting,
    MeetingWithDetails,
    MeetingSection,
    MeetingAttendee,
    CreateMeetingRequest,
    UpdateMeetingRequest,
    AddAttendeeRequest,
    UpdateAttendeeRequest,
    UpdateSectionRequest,
    MeetingAgendaType,
    MeetingsListResponse,
} from '@/types/notes-meetings-reports';

// ============================================================================
// TYPES
// ============================================================================

interface MeetingWithCount extends Meeting {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
}

interface UseMeetingsOptions {
    projectId: string;
    groupId?: string;
}

interface UseMeetingsReturn {
    meetings: MeetingWithCount[];
    total: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface UseMeetingOptions {
    meetingId: string | null;
}

interface UseMeetingReturn {
    meeting: MeetingWithDetails | null;
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
    addedAt: string;
}

interface UseMeetingTransmittalReturn {
    documents: TransmittalDocument[];
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<void>;
    refetch: () => void;
}

interface UseMeetingMutationsReturn {
    createMeeting: (data: CreateMeetingRequest) => Promise<MeetingWithCount>;
    updateMeeting: (meetingId: string, data: UpdateMeetingRequest) => Promise<Meeting>;
    deleteMeeting: (meetingId: string) => Promise<void>;
    copyMeeting: (meetingId: string) => Promise<MeetingWithCount>;
}

interface UseMeetingSectionsReturn {
    sections: MeetingSection[];
    isLoading: boolean;
    error: Error | null;
    updateSection: (sectionId: string, data: UpdateSectionRequest) => Promise<MeetingSection>;
    reorderSections: (sectionIds: string[]) => Promise<void>;
    generateSections: (agendaType: MeetingAgendaType) => Promise<MeetingSection[]>;
    syncSections: (selectedSectionKeys: string[]) => Promise<void>;
    refetch: () => void;
}

interface AddStakeholderGroupResult {
    added: MeetingAttendee[];
    totalInGroup: number;
    alreadyAdded: number;
}

interface UseMeetingAttendeesReturn {
    attendees: MeetingAttendee[];
    isLoading: boolean;
    error: Error | null;
    addAttendee: (data: AddAttendeeRequest) => Promise<MeetingAttendee>;
    updateAttendee: (attendeeId: string, data: UpdateAttendeeRequest) => Promise<MeetingAttendee>;
    removeAttendee: (attendeeId: string) => Promise<void>;
    addStakeholderGroup: (group: string) => Promise<AddStakeholderGroupResult>;
    refetch: () => void;
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
 * Hook for fetching a list of meetings for a project
 */
export function useMeetings({ projectId, groupId }: UseMeetingsOptions): UseMeetingsReturn {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (groupId) params.set('groupId', groupId);
    const swrKey = projectId ? `/api/meetings?${params.toString()}` : null;

    const { data, error, isLoading, mutate } = useSWR<MeetingsListResponse>(
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
        meetings: (data?.meetings as MeetingWithCount[]) ?? [],
        total: data?.total ?? 0,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/**
 * Hook for fetching a single meeting with full details
 */
export function useMeeting({ meetingId }: UseMeetingOptions): UseMeetingReturn {
    const swrKey = meetingId ? `/api/meetings/${meetingId}` : null;

    const { data, error, isLoading, mutate } = useSWR<MeetingWithDetails>(
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
        meeting: data ?? null,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/**
 * Hook for managing meeting mutations (create, update, delete, copy)
 */
export function useMeetingMutations(projectId: string, groupId?: string): UseMeetingMutationsReturn {
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    if (groupId) params.set('groupId', groupId);
    const listKey = `/api/meetings?${params.toString()}`;

    /**
     * Create a new meeting
     */
    const createMeeting = useCallback(async (data: CreateMeetingRequest): Promise<MeetingWithCount> => {
        const response = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to create meeting' }));
            throw new Error(error.error || 'Failed to create meeting');
        }

        const created = await response.json();

        // Revalidate the meetings list
        globalMutate(listKey);

        return created;
    }, [listKey]);

    /**
     * Update an existing meeting
     */
    const updateMeeting = useCallback(async (meetingId: string, data: UpdateMeetingRequest): Promise<Meeting> => {
        const response = await fetch(`/api/meetings/${meetingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update meeting' }));
            throw new Error(error.error || 'Failed to update meeting');
        }

        const updated = await response.json();

        // Revalidate both list and individual meeting
        globalMutate(listKey);
        globalMutate(`/api/meetings/${meetingId}`);

        return updated;
    }, [listKey]);

    /**
     * Soft delete a meeting
     */
    const deleteMeeting = useCallback(async (meetingId: string): Promise<void> => {
        const response = await fetch(`/api/meetings/${meetingId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to delete meeting' }));
            throw new Error(error.error || 'Failed to delete meeting');
        }

        // Revalidate the meetings list
        globalMutate(listKey);
    }, [listKey]);

    /**
     * Copy a meeting
     */
    const copyMeeting = useCallback(async (meetingId: string): Promise<MeetingWithCount> => {
        const response = await fetch(`/api/meetings/${meetingId}/copy`, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to copy meeting' }));
            throw new Error(error.error || 'Failed to copy meeting');
        }

        const copied = await response.json();

        // Revalidate the meetings list
        globalMutate(listKey);

        return copied;
    }, [listKey]);

    return {
        createMeeting,
        updateMeeting,
        deleteMeeting,
        copyMeeting,
    };
}

/**
 * Hook for managing meeting sections
 */
export function useMeetingSections(meetingId: string | null): UseMeetingSectionsReturn {
    const swrKey = meetingId ? `/api/meetings/${meetingId}/sections` : null;

    const { data, error, isLoading, mutate } = useSWR<{ meetingId: string; sections: MeetingSection[]; total: number }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Update a section's content or label
     */
    const updateSection = useCallback(async (sectionId: string, updateData: UpdateSectionRequest): Promise<MeetingSection> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/sections/${sectionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update section' }));
            throw new Error(error.error || 'Failed to update section');
        }

        const updated = await response.json();

        // Revalidate sections and meeting
        mutate();
        globalMutate(`/api/meetings/${meetingId}`);

        return updated;
    }, [meetingId, mutate]);

    /**
     * Reorder sections
     */
    const reorderSections = useCallback(async (sectionIds: string[]): Promise<void> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/sections/reorder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to reorder sections' }));
            throw new Error(error.error || 'Failed to reorder sections');
        }

        // Revalidate sections
        mutate();
    }, [meetingId, mutate]);

    /**
     * Generate sections based on agenda type
     */
    const generateSections = useCallback(async (agendaType: MeetingAgendaType): Promise<MeetingSection[]> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/generate-sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agendaType }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to generate sections' }));
            throw new Error(error.error || 'Failed to generate sections');
        }

        const result = await response.json();

        // Await revalidation so UI gets new section IDs before loading state clears
        await mutate();
        globalMutate(`/api/meetings/${meetingId}`);

        return result.sections;
    }, [meetingId, mutate]);

    /**
     * Sync sections based on user selection (non-destructive)
     * Preserves content for kept sections, adds new ones, removes unchecked.
     */
    const syncSections = useCallback(async (selectedSectionKeys: string[]): Promise<void> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/sync-sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedSectionKeys }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to sync sections' }));
            throw new Error(error.error || 'Failed to sync sections');
        }

        // Await revalidation so UI gets new section IDs before loading state clears
        await mutate();
        globalMutate(`/api/meetings/${meetingId}`);
    }, [meetingId, mutate]);

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    // Flatten nested sections for easier access
    const flattenSections = (sections: MeetingSection[] = []): MeetingSection[] => {
        const result: MeetingSection[] = [];
        for (const section of sections) {
            result.push(section);
            if (section.childSections) {
                result.push(...section.childSections);
            }
        }
        return result;
    };

    return {
        sections: flattenSections(data?.sections),
        isLoading,
        error: error ?? null,
        updateSection,
        reorderSections,
        generateSections,
        syncSections,
        refetch,
    };
}

/**
 * Hook for managing meeting attendees
 */
export function useMeetingAttendees(meetingId: string | null, projectId?: string): UseMeetingAttendeesReturn {
    const swrKey = meetingId ? `/api/meetings/${meetingId}/attendees` : null;

    const { data, error, isLoading, mutate } = useSWR<{ meetingId: string; attendees: MeetingAttendee[]; total: number }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Add an attendee (stakeholder or ad-hoc)
     */
    const addAttendee = useCallback(async (addData: AddAttendeeRequest): Promise<MeetingAttendee> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/attendees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addData),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to add attendee' }));
            throw new Error(error.error || 'Failed to add attendee');
        }

        const added = await response.json();

        // Revalidate attendees and meeting
        mutate();
        globalMutate(`/api/meetings/${meetingId}`);

        return added;
    }, [meetingId, mutate]);

    /**
     * Update attendee flags
     */
    const updateAttendee = useCallback(async (attendeeId: string, updateData: UpdateAttendeeRequest): Promise<MeetingAttendee> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        // Optimistic update: update the flag in place without reordering
        mutate(
            (current) => {
                if (!current) return current;
                return {
                    ...current,
                    attendees: current.attendees.map((a: MeetingAttendee) =>
                        a.id === attendeeId ? { ...a, ...updateData } : a
                    ),
                };
            },
            { revalidate: false }
        );

        const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            // Revert on error
            mutate();
            const error = await response.json().catch(() => ({ error: 'Failed to update attendee' }));
            throw new Error(error.error || 'Failed to update attendee');
        }

        const updated = await response.json();

        return updated;
    }, [meetingId, mutate]);

    /**
     * Remove an attendee
     */
    const removeAttendee = useCallback(async (attendeeId: string): Promise<void> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/attendees/${attendeeId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to remove attendee' }));
            throw new Error(error.error || 'Failed to remove attendee');
        }

        // Revalidate attendees and meeting
        mutate();
        globalMutate(`/api/meetings/${meetingId}`);
    }, [meetingId, mutate]);

    /**
     * Add all stakeholders from a group
     * Returns object with added attendees and metadata for UI feedback
     */
    const addStakeholderGroup = useCallback(async (group: string): Promise<{
        added: MeetingAttendee[];
        totalInGroup: number;
        alreadyAdded: number;
    }> => {
        if (!meetingId || !projectId) {
            throw new Error('Meeting ID and Project ID are required');
        }

        // Fetch stakeholders from the group
        const stakeholdersResponse = await fetch(
            `/api/projects/${projectId}/stakeholders?group=${group}`
        );

        if (!stakeholdersResponse.ok) {
            throw new Error('Failed to fetch stakeholders');
        }

        const { stakeholders } = await stakeholdersResponse.json();
        const totalInGroup = stakeholders.length;

        // Get existing attendee stakeholder IDs to avoid duplicates
        const existingStakeholderIds = new Set(
            (data?.attendees ?? [])
                .filter((a: MeetingAttendee) => a.stakeholderId)
                .map((a: MeetingAttendee) => a.stakeholderId)
        );

        // Filter to only stakeholders not already added
        const newStakeholders = stakeholders.filter(
            (s: { id: string }) => !existingStakeholderIds.has(s.id)
        );
        const alreadyAdded = totalInGroup - newStakeholders.length;

        // Add each new stakeholder as an attendee
        const addedAttendees: MeetingAttendee[] = [];
        for (const stakeholder of newStakeholders) {
            try {
                const attendee = await addAttendee({ stakeholderId: stakeholder.id });
                addedAttendees.push(attendee);
            } catch (e) {
                // Skip if already added (race condition)
                console.warn(`Stakeholder ${stakeholder.id} may already be added`);
            }
        }

        return { added: addedAttendees, totalInGroup, alreadyAdded };
    }, [meetingId, projectId, addAttendee, data?.attendees]);

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    return {
        attendees: data?.attendees ?? [],
        isLoading,
        error: error ?? null,
        addAttendee,
        updateAttendee,
        removeAttendee,
        addStakeholderGroup,
        refetch,
    };
}

/**
 * Hook for managing meeting transmittal (document attachments)
 */
export function useMeetingTransmittal(meetingId: string | null): UseMeetingTransmittalReturn {
    const swrKey = meetingId ? `/api/meetings/${meetingId}/transmittal` : null;

    const { data, error, isLoading, mutate } = useSWR<{ meetingId: string; documents: TransmittalDocument[] }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Save document attachments to the meeting
     */
    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<void> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/transmittal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to save transmittal' }));
            throw new Error(error.error || 'Failed to save transmittal');
        }

        // Revalidate transmittal data and meeting (for count update)
        mutate();
        globalMutate(`/api/meetings/${meetingId}`);
    }, [meetingId, mutate]);

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
// EXPORT & EMAIL HOOKS (Feature 021 - Phase 7)
// ============================================================================

export type ExportFormat = 'pdf' | 'docx';

interface UseMeetingExportReturn {
    exportMeeting: (format: ExportFormat) => Promise<void>;
}

interface MeetingEmailResult {
    mailtoUrl: string;
    recipientCount: number;
}

interface UseMeetingEmailReturn {
    sendEmail: () => Promise<MeetingEmailResult>;
}

/**
 * Hook for exporting a meeting to PDF or DOCX
 */
export function useMeetingExport(meetingId: string | null): UseMeetingExportReturn {
    const exportMeeting = useCallback(async (format: ExportFormat): Promise<void> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/export?format=${format}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to export meeting' }));
            throw new Error(error.error || 'Failed to export meeting');
        }

        // Get the filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `meeting.${format}`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/);
            if (match) {
                filename = match[1];
            }
        }

        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, [meetingId]);

    return { exportMeeting };
}

/**
 * Hook for emailing a meeting to distribution list
 */
export function useMeetingEmail(meetingId: string | null): UseMeetingEmailReturn {
    const sendEmail = useCallback(async (): Promise<MeetingEmailResult> => {
        if (!meetingId) {
            throw new Error('Meeting ID is required');
        }

        const response = await fetch(`/api/meetings/${meetingId}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to generate email' }));
            throw new Error(error.error || 'Failed to generate email');
        }

        const data = await response.json();

        return {
            mailtoUrl: data.email.mailtoUrl,
            recipientCount: data.meta.recipientCount,
        };
    }, [meetingId]);

    return { sendEmail };
}
