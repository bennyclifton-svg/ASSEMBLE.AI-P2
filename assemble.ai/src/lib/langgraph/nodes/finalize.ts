/**
 * T045: Finalize Node
 * Marks report as complete and prepares for optional transmittal appendix
 *
 * This node:
 * 1. Validates all sections are generated
 * 2. Calculates final statistics
 * 3. Routes to transmittal section if transmittal exists
 */

import type { ReportStateType, ReportStatus } from '../state';
import { ragDb } from '@/lib/db/rag-client';
import { reportTemplates } from '@/lib/db/rag-schema';
import { eq } from 'drizzle-orm';

export interface FinalizeResult {
    status: ReportStatus;
}

/**
 * Finalize node
 * Marks report generation as complete
 */
export async function finalizeNode(
    state: ReportStateType
): Promise<FinalizeResult> {
    console.log('[finalize] Finalizing report:', state.reportId);

    // Validate all sections are complete
    const totalSections = state.toc?.sections.length ?? 0;
    const completedSections = state.sections.filter(s => s.status === 'complete').length;

    console.log('[finalize] Sections:', completedSections, '/', totalSections);

    if (completedSections < totalSections) {
        console.warn('[finalize] Not all sections complete:', completedSections, 'of', totalSections);
    }

    // Log statistics
    const totalWords = state.sections.reduce((sum, s) => {
        return sum + (s.content?.split(/\s+/).length ?? 0);
    }, 0);

    const totalSources = new Set(
        state.sections.flatMap(s => s.sourceChunkIds)
    ).size;

    console.log('[finalize] Report statistics:', {
        sections: completedSections,
        words: totalWords,
        uniqueSources: totalSources,
        hasTransmittal: state.transmittal !== null,
    });

    // Update report status to complete in database
    if (state.reportId) {
        await ragDb.update(reportTemplates)
            .set({ status: 'complete', updatedAt: new Date() })
            .where(eq(reportTemplates.id, state.reportId));
        console.log('[finalize] Report status updated to complete in database');
    }

    return {
        status: 'complete',
    };
}

/**
 * Determine routing after finalize
 * Routes to transmittal section if transmittal exists
 */
export function routeAfterFinalize(
    state: ReportStateType
): 'generate_transmittal_section' | '__end__' {
    if (state.transmittal && state.transmittal.documents.length > 0) {
        console.log('[finalize] Routing to transmittal section');
        return 'generate_transmittal_section';
    }

    console.log('[finalize] No transmittal - ending report');
    return '__end__';
}

/**
 * Get report summary for final display
 */
export function getReportSummary(state: ReportStateType): {
    title: string;
    discipline: string | null;
    totalSections: number;
    completedSections: number;
    totalWords: number;
    uniqueSources: number;
    hasTransmittal: boolean;
    transmittalDocuments: number;
} {
    const completedSections = state.sections.filter(s => s.status === 'complete').length;

    const totalWords = state.sections.reduce((sum, s) => {
        return sum + (s.content?.split(/\s+/).length ?? 0);
    }, 0);

    const uniqueSources = new Set(
        state.sections.flatMap(s => s.sourceChunkIds)
    ).size;

    return {
        title: state.title,
        discipline: state.discipline,
        totalSections: state.toc?.sections.length ?? 0,
        completedSections,
        totalWords,
        uniqueSources,
        hasTransmittal: state.transmittal !== null,
        transmittalDocuments: state.transmittal?.documents.length ?? 0,
    };
}
