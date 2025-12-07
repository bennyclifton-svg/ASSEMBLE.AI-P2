/**
 * T059: use-report-generation hook
 * Manages report generation state and SSE events
 */

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import type { TableOfContents } from '@/lib/langgraph/state';
import type { GenerationMode } from '@/lib/db/rag-schema';

// Types
export interface ReportSummary {
    id: string;
    title: string;
    discipline?: string;
    status: string;
    completedSections: number;
    totalSections: number;
    lockedBy?: string;
    lockedByName?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReportSection {
    id: string;
    reportId: string;
    sectionIndex: number;
    title: string;
    content: string | null;
    sourceChunkIds: string[];
    sources: any[];
    status: 'pending' | 'generating' | 'complete' | 'regenerating';
    generatedAt: string | null;
    regenerationCount: number;
}

export interface Report extends ReportSummary {
    projectId: string;
    documentSetIds: string[];
    reportType: 'tender_request';
    tableOfContents: TableOfContents;
    sections: ReportSection[];
    lockedAt?: string;
    currentSectionIndex: number;
    // T133: Phase 11 - Unified Report Editor fields
    viewMode?: 'sections' | 'unified';
    editedContent?: string | null;
    isEdited?: boolean;
    reportChain?: 'short' | 'long';
    parentReportId?: string | null;
    detailLevel?: 'standard' | 'comprehensive' | null;
}

export interface GenerateReportRequest {
    projectId: string;
    reportType: 'tender_request';
    title: string;
    discipline?: string;
    disciplineId?: string;
    tradeId?: string; // Contractor trade ID for filtering
    documentSetIds: string[];
    transmittalId?: string;
    generationMode?: GenerationMode; // T099: Report generation mode
}

// API fetcher
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch');
    }
    return res.json();
};

/**
 * Hook for managing report generation workflow
 */
export function useReportGeneration(projectId: string) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch reports list
    const { data, error: fetchError, isLoading } = useSWR<{ reports: ReportSummary[] }>(
        projectId ? `/api/reports?projectId=${projectId}` : null,
        fetcher
    );

    // Start new report generation
    const startGeneration = useCallback(async (request: GenerateReportRequest) => {
        setIsGenerating(true);
        setError(null);

        try {
            const res = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to start generation');
            }

            const report = await res.json();

            // Refresh reports list
            mutate(`/api/reports?projectId=${projectId}`);

            return report as Report;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, [projectId]);

    // Approve TOC
    const approveToc = useCallback(async (reportId: string, tableOfContents: TableOfContents) => {
        setError(null);

        try {
            const res = await fetch(`/api/reports/${reportId}/approve-toc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableOfContents }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to approve TOC');
            }

            const result = await res.json();

            // Refresh report
            mutate(`/api/reports/${reportId}`);
            mutate(`/api/reports?projectId=${projectId}`);

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [projectId]);

    // Provide section feedback
    const provideFeedback = useCallback(async (
        reportId: string,
        sectionIndex: number,
        action: 'approve' | 'regenerate' | 'skip',
        options?: { feedback?: string; excludeSourceIds?: string[] }
    ) => {
        setError(null);

        try {
            const res = await fetch(`/api/reports/${reportId}/section-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sectionIndex,
                    action,
                    ...options,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to provide feedback');
            }

            const result = await res.json();

            // Refresh report
            mutate(`/api/reports/${reportId}`);
            if (result.isComplete) {
                mutate(`/api/reports?projectId=${projectId}`);
            }

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [projectId]);

    // Delete report
    const deleteReport = useCallback(async (reportId: string) => {
        setError(null);

        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete report');
            }

            // Refresh reports list
            mutate(`/api/reports?projectId=${projectId}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            throw err;
        }
    }, [projectId]);

    return {
        reports: data?.reports ?? [],
        isLoading,
        isGenerating,
        error: error || (fetchError instanceof Error ? fetchError.message : null),
        startGeneration,
        approveToc,
        provideFeedback,
        deleteReport,
    };
}

/**
 * Hook for fetching a single report
 */
export function useReport(reportId: string | null) {
    const { data, error, isLoading, mutate: refresh } = useSWR<Report>(
        reportId ? `/api/reports/${reportId}` : null,
        fetcher,
        {
            refreshInterval: 5000, // Poll every 5 seconds during generation
        }
    );

    return {
        report: data,
        isLoading,
        error: error instanceof Error ? error.message : null,
        refresh,
    };
}
