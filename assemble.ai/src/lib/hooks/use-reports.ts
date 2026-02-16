/**
 * Hook for Managing Reports
 * Feature 021 - Notes, Meetings & Reports
 *
 * Provides CRUD operations for reports with sections and attendees.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useCallback } from 'react';
import type {
    Report,
    ReportWithDetails,
    ReportSection,
    ReportAttendee,
    CreateReportRequest,
    UpdateReportRequest,
    AddAttendeeRequest,
    UpdateAttendeeRequest,
    UpdateSectionRequest,
    ReportContentsType,
    ReportsListResponse,
} from '@/types/notes-meetings-reports';

// ============================================================================
// TYPES
// ============================================================================

interface ReportWithCount extends Report {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
}

interface UseReportsOptions {
    projectId: string;
    groupId?: string;
}

interface UseReportsReturn {
    reports: ReportWithCount[];
    total: number;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

interface UseReportOptions {
    reportId: string | null;
}

interface UseReportReturn {
    report: ReportWithDetails | null;
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

interface UseReportTransmittalReturn {
    documents: TransmittalDocument[];
    isLoading: boolean;
    error: Error | null;
    saveTransmittal: (documentIds: string[]) => Promise<void>;
    refetch: () => void;
}

interface UseReportMutationsReturn {
    createReport: (data: CreateReportRequest) => Promise<ReportWithCount>;
    updateReport: (reportId: string, data: UpdateReportRequest) => Promise<Report>;
    deleteReport: (reportId: string) => Promise<void>;
    copyReport: (reportId: string) => Promise<ReportWithCount>;
}

interface UseReportSectionsReturn {
    sections: ReportSection[];
    isLoading: boolean;
    error: Error | null;
    updateSection: (sectionId: string, data: UpdateSectionRequest) => Promise<ReportSection>;
    reorderSections: (sectionIds: string[]) => Promise<void>;
    generateSections: (contentsType: ReportContentsType) => Promise<ReportSection[]>;
    syncSections: (selectedSectionKeys: string[]) => Promise<void>;
    refetch: () => void;
}

interface AddStakeholderGroupResult {
    added: ReportAttendee[];
    totalInGroup: number;
    alreadyAdded: number;
}

interface UseReportAttendeesReturn {
    attendees: ReportAttendee[];
    isLoading: boolean;
    error: Error | null;
    addAttendee: (data: AddAttendeeRequest) => Promise<ReportAttendee>;
    updateAttendee: (attendeeId: string, data: UpdateAttendeeRequest) => Promise<ReportAttendee>;
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
 * Hook for fetching a list of reports for a project
 */
export function useReports({ projectId, groupId }: UseReportsOptions): UseReportsReturn {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (groupId) params.set('groupId', groupId);
    const swrKey = projectId ? `/api/project-reports?${params.toString()}` : null;

    const { data, error, isLoading, mutate } = useSWR<ReportsListResponse>(
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
        reports: (data?.reports as ReportWithCount[]) ?? [],
        total: data?.total ?? 0,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/**
 * Hook for fetching a single report with full details
 */
export function useReport({ reportId }: UseReportOptions): UseReportReturn {
    const swrKey = reportId ? `/api/project-reports/${reportId}` : null;

    const { data, error, isLoading, mutate } = useSWR<ReportWithDetails>(
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
        report: data ?? null,
        isLoading,
        error: error ?? null,
        refetch,
    };
}

/**
 * Hook for managing report mutations (create, update, delete, copy)
 */
export function useReportMutations(projectId: string, groupId?: string): UseReportMutationsReturn {
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    if (groupId) params.set('groupId', groupId);
    const listKey = `/api/project-reports?${params.toString()}`;

    /**
     * Create a new report
     */
    const createReport = useCallback(async (data: CreateReportRequest): Promise<ReportWithCount> => {
        const response = await fetch('/api/project-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to create report' }));
            throw new Error(error.error || 'Failed to create report');
        }

        const created = await response.json();

        // Revalidate the reports list
        globalMutate(listKey);

        return created;
    }, [listKey]);

    /**
     * Update an existing report
     */
    const updateReport = useCallback(async (reportId: string, data: UpdateReportRequest): Promise<Report> => {
        const response = await fetch(`/api/project-reports/${reportId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update report' }));
            throw new Error(error.error || 'Failed to update report');
        }

        const updated = await response.json();

        // Revalidate both list and individual report
        globalMutate(listKey);
        globalMutate(`/api/project-reports/${reportId}`);

        return updated;
    }, [listKey]);

    /**
     * Soft delete a report
     */
    const deleteReport = useCallback(async (reportId: string): Promise<void> => {
        const response = await fetch(`/api/project-reports/${reportId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to delete report' }));
            throw new Error(error.error || 'Failed to delete report');
        }

        // Revalidate the reports list
        globalMutate(listKey);
    }, [listKey]);

    /**
     * Copy a report
     */
    const copyReport = useCallback(async (reportId: string): Promise<ReportWithCount> => {
        const response = await fetch(`/api/project-reports/${reportId}/copy`, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to copy report' }));
            throw new Error(error.error || 'Failed to copy report');
        }

        const copied = await response.json();

        // Revalidate the reports list
        globalMutate(listKey);

        return copied;
    }, [listKey]);

    return {
        createReport,
        updateReport,
        deleteReport,
        copyReport,
    };
}

/**
 * Hook for managing report sections
 */
export function useReportSections(reportId: string | null): UseReportSectionsReturn {
    const swrKey = reportId ? `/api/project-reports/${reportId}/sections` : null;

    const { data, error, isLoading, mutate } = useSWR<{ reportId: string; sections: ReportSection[]; total: number }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Update a section's content or label
     */
    const updateSection = useCallback(async (sectionId: string, updateData: UpdateSectionRequest): Promise<ReportSection> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/sections/${sectionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to update section' }));
            throw new Error(error.error || 'Failed to update section');
        }

        const updated = await response.json();

        // Revalidate sections and report
        mutate();
        globalMutate(`/api/project-reports/${reportId}`);

        return updated;
    }, [reportId, mutate]);

    /**
     * Reorder sections
     */
    const reorderSections = useCallback(async (sectionIds: string[]): Promise<void> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/sections/reorder`, {
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
    }, [reportId, mutate]);

    /**
     * Generate sections based on contents type
     */
    const generateSections = useCallback(async (contentsType: ReportContentsType): Promise<ReportSection[]> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/generate-sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentsType }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to generate sections' }));
            throw new Error(error.error || 'Failed to generate sections');
        }

        const result = await response.json();

        // Revalidate sections and report
        mutate();
        globalMutate(`/api/project-reports/${reportId}`);

        return result.sections;
    }, [reportId, mutate]);

    /**
     * Sync sections based on user selection (non-destructive)
     * Preserves content for kept sections, adds new ones, removes unchecked.
     */
    const syncSections = useCallback(async (selectedSectionKeys: string[]): Promise<void> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/sync-sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedSectionKeys }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to sync sections' }));
            throw new Error(error.error || 'Failed to sync sections');
        }

        // Revalidate sections and report
        mutate();
        globalMutate(`/api/project-reports/${reportId}`);
    }, [reportId, mutate]);

    const refetch = useCallback(() => {
        mutate();
    }, [mutate]);

    // Flatten nested sections for easier access
    const flattenSections = (sections: ReportSection[] = []): ReportSection[] => {
        const result: ReportSection[] = [];
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
 * Hook for managing report attendees (distribution list)
 */
export function useReportAttendees(reportId: string | null, projectId?: string): UseReportAttendeesReturn {
    const swrKey = reportId ? `/api/project-reports/${reportId}/attendees` : null;

    const { data, error, isLoading, mutate } = useSWR<{ reportId: string; attendees: ReportAttendee[]; total: number }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Add an attendee (stakeholder or ad-hoc)
     */
    const addAttendee = useCallback(async (addData: AddAttendeeRequest): Promise<ReportAttendee> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/attendees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addData),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to add attendee' }));
            throw new Error(error.error || 'Failed to add attendee');
        }

        const added = await response.json();

        // Revalidate attendees and report
        mutate();
        globalMutate(`/api/project-reports/${reportId}`);

        return added;
    }, [reportId, mutate]);

    /**
     * Update attendee flags
     */
    const updateAttendee = useCallback(async (attendeeId: string, updateData: UpdateAttendeeRequest): Promise<ReportAttendee> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        // Optimistic update: update the flag in place without reordering
        mutate(
            (current) => {
                if (!current) return current;
                return {
                    ...current,
                    attendees: current.attendees.map((a: ReportAttendee) =>
                        a.id === attendeeId ? { ...a, ...updateData } : a
                    ),
                };
            },
            { revalidate: false }
        );

        const response = await fetch(`/api/project-reports/${reportId}/attendees/${attendeeId}`, {
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
    }, [reportId, mutate]);

    /**
     * Remove an attendee
     */
    const removeAttendee = useCallback(async (attendeeId: string): Promise<void> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/attendees/${attendeeId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to remove attendee' }));
            throw new Error(error.error || 'Failed to remove attendee');
        }

        // Revalidate attendees and report
        mutate();
        globalMutate(`/api/project-reports/${reportId}`);
    }, [reportId, mutate]);

    /**
     * Add all stakeholders from a group
     * Returns object with added attendees and metadata for UI feedback
     */
    const addStakeholderGroup = useCallback(async (group: string): Promise<AddStakeholderGroupResult> => {
        if (!reportId || !projectId) {
            throw new Error('Report ID and Project ID are required');
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
                .filter((a: ReportAttendee) => a.stakeholderId)
                .map((a: ReportAttendee) => a.stakeholderId)
        );

        // Filter to only stakeholders not already added
        const newStakeholders = stakeholders.filter(
            (s: { id: string }) => !existingStakeholderIds.has(s.id)
        );
        const alreadyAdded = totalInGroup - newStakeholders.length;

        // Add each new stakeholder as an attendee
        const addedAttendees: ReportAttendee[] = [];
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
    }, [reportId, projectId, addAttendee, data?.attendees]);

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
 * Hook for managing report transmittal (document attachments)
 */
export function useReportTransmittal(reportId: string | null): UseReportTransmittalReturn {
    const swrKey = reportId ? `/api/project-reports/${reportId}/transmittal` : null;

    const { data, error, isLoading, mutate } = useSWR<{ reportId: string; documents: TransmittalDocument[] }>(
        swrKey,
        fetcher,
        {
            revalidateOnFocus: false,
        }
    );

    /**
     * Save document attachments to the report
     */
    const saveTransmittal = useCallback(async (documentIds: string[]): Promise<void> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/transmittal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to save transmittal' }));
            throw new Error(error.error || 'Failed to save transmittal');
        }

        // Revalidate transmittal data and report (for count update)
        mutate();
        globalMutate(`/api/project-reports/${reportId}`);
    }, [reportId, mutate]);

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
// EXPORT HOOKS
// ============================================================================

export type ExportFormat = 'pdf' | 'docx';

interface UseReportExportReturn {
    exportReport: (format: ExportFormat) => Promise<void>;
}

/**
 * Hook for exporting a report to PDF or DOCX
 */
export function useReportExport(reportId: string | null): UseReportExportReturn {
    const exportReport = useCallback(async (format: ExportFormat): Promise<void> => {
        if (!reportId) {
            throw new Error('Report ID is required');
        }

        const response = await fetch(`/api/project-reports/${reportId}/export?format=${format}`);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Failed to export report' }));
            throw new Error(error.error || 'Failed to export report');
        }

        // Get the filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `Report.${format}`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
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
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }, [reportId]);

    return { exportReport };
}
