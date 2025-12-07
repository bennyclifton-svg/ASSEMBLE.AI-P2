/**
 * T045a: Generate Transmittal Section Node
 * Renders transmittal as data-driven appendix (no AI generation)
 *
 * This node:
 * 1. Only executes if transmittal exists (conditional edge)
 * 2. Renders HTML table: Doc Name | Version | Category
 * 3. Appends as final section in report
 */

import type { ReportStateType, GeneratedSection } from '../state';
import { formatTransmittalAsHTML } from '../../utils/report-formatting';
import { v4 as uuidv4 } from 'uuid';

export interface GenerateTransmittalSectionResult {
    sections: GeneratedSection[];
}

/**
 * Generate transmittal section node
 * Creates transmittal appendix as HTML table
 */
export async function generateTransmittalSectionNode(
    state: ReportStateType
): Promise<GenerateTransmittalSectionResult> {
    console.log('[generate-transmittal-section] Generating transmittal appendix');

    if (!state.transmittal) {
        console.warn('[generate-transmittal-section] No transmittal in state - skipping');
        return { sections: state.sections };
    }

    if (state.transmittal.documents.length === 0) {
        console.warn('[generate-transmittal-section] Transmittal has no documents - skipping');
        return { sections: state.sections };
    }

    // Generate HTML table content
    const content = formatTransmittalAsHTML(
        state.transmittal.documents.map(doc => ({
            name: doc.name,
            version: doc.version,
            category: doc.category,
        }))
    );

    console.log('[generate-transmittal-section] Generated transmittal with', state.transmittal.documents.length, 'documents');

    // Create transmittal section
    const transmittalSection: GeneratedSection = {
        id: 'transmittal',
        title: 'Transmittal',
        content,
        sourceChunkIds: [], // No RAG sources - purely data-driven
        sourceRelevance: {},
        sources: [],
        status: 'complete',
        generatedAt: new Date().toISOString(),
        regenerationCount: 0,
        isAppendix: true,
    };

    // Append to sections
    return {
        sections: [...state.sections, transmittalSection],
    };
}

/**
 * Format transmittal documents as simple list
 * Alternative format for smaller transmittals
 */
export function formatTransmittalAsList(state: ReportStateType): string {
    if (!state.transmittal || state.transmittal.documents.length === 0) {
        return '';
    }

    const items = state.transmittal.documents.map((doc, index) =>
        `${index + 1}. **${doc.name}** (${doc.version}) - ${doc.category}`
    );

    return `## Transmittal

The following documents are included in this tender package:

${items.join('\n')}

*Total: ${state.transmittal.documents.length} documents*`;
}

/**
 * Get transmittal statistics
 */
export function getTransmittalStats(state: ReportStateType): {
    documentCount: number;
    categories: string[];
    versions: string[];
} {
    if (!state.transmittal) {
        return { documentCount: 0, categories: [], versions: [] };
    }

    const categories = [...new Set(state.transmittal.documents.map(d => d.category))];
    const versions = [...new Set(state.transmittal.documents.map(d => d.version))];

    return {
        documentCount: state.transmittal.documents.length,
        categories,
        versions,
    };
}
