/**
 * T040 & T074 & T075: Generate TOC Node
 * Generates table of contents using fixed Planning Card structure
 * with optional memory pre-fill
 *
 * Per user requirements, the TOC structure is:
 * 1. Project Details (from planningContext.details)
 * 2. Project Objectives (from planningContext.objectives)
 * 3. Project Stages (from planningContext.stages)
 * 4. Brief/Scope (from selected discipline's briefServices OR trade's scopeWorks)
 * 5. Fee Structure (Consultant) OR Price Structure (Contractor)
 * 6. Transmittal (if transmittal exists)
 *
 * Memory System (T074-T075):
 * - Checks for previously approved TOCs for the same discipline
 * - Pre-fills TOC with learned patterns if available
 * - Falls back to fixed structure if no memory exists
 */

import type { ReportStateType, TableOfContents, TocSection } from '../state';
import { v4 as uuidv4 } from 'uuid';
import { generateTocWithMemory as fetchMemoryToc } from '@/lib/rag/memory';

export interface GenerateTocResult {
    toc: TableOfContents;
    status: 'toc_pending';
}

/**
 * Get fixed TOC sections based on Planning Card structure
 * Default 7 sections for RFT reports:
 * 1. Project Details
 * 2. Project Objectives
 * 3. Project Staging
 * 4. Project Risks
 * 5. Consultant Brief / Contractor Scope
 * 6. Consultant Fee / Contractor Price
 * 7. Transmittal
 */
function getFixedTocSections(state: ReportStateType): TocSection[] {
    const sections: TocSection[] = [];

    // 1. Project Details
    sections.push({
        id: uuidv4(),
        title: 'Project Details',
        level: 1,
        description: 'Project identification, location, building class, and zoning information',
    });

    // 2. Project Objectives
    sections.push({
        id: uuidv4(),
        title: 'Project Objectives',
        level: 1,
        description: 'Functional, quality, budget, and program objectives for the project',
    });

    // 3. Project Staging
    sections.push({
        id: uuidv4(),
        title: 'Project Staging',
        level: 1,
        description: 'Project staging, timeline, and program requirements',
    });

    // 4. Project Risks
    sections.push({
        id: uuidv4(),
        title: 'Project Risks',
        level: 1,
        description: 'Risk assessment, mitigation strategies, and project considerations',
    });

    // 5. Brief/Scope - depends on whether this is consultant or contractor
    if (state.discipline) {
        // Consultant discipline - use "Consultant Brief"
        sections.push({
            id: uuidv4(),
            title: 'Consultant Brief',
            level: 1,
            description: `Services, fee considerations, and program requirements for ${state.discipline}`,
        });
    } else if (state.trade) {
        // Contractor trade - use "Contractor Scope"
        sections.push({
            id: uuidv4(),
            title: 'Contractor Scope',
            level: 1,
            description: `Scope of works, price considerations, and program requirements for ${state.trade}`,
        });
    } else {
        // Default fallback
        sections.push({
            id: uuidv4(),
            title: 'Consultant Brief',
            level: 1,
            description: 'Services or scope of works requirements',
        });
    }

    // 6. Fee / Price - depends on whether this is consultant or contractor
    if (state.discipline) {
        sections.push({
            id: uuidv4(),
            title: 'Consultant Fee',
            level: 1,
            description: `Fee schedule line items for ${state.discipline} tender submission`,
        });
    } else if (state.trade) {
        sections.push({
            id: uuidv4(),
            title: 'Contractor Price',
            level: 1,
            description: `Price schedule line items for ${state.trade} tender submission`,
        });
    } else {
        sections.push({
            id: uuidv4(),
            title: 'Consultant Fee',
            level: 1,
            description: 'Fee or price schedule line items for tender submission',
        });
    }

    // 7. Transmittal (conditional)
    if (state.transmittal && state.transmittal.documents.length > 0) {
        sections.push({
            id: 'transmittal',
            title: 'Transmittal',
            level: 1,
            description: `Document schedule (${state.transmittal.documents.length} documents)`,
        });
    }

    return sections;
}

/**
 * Generate TOC node
 * Creates table of contents with memory pre-fill if available
 *
 * T075: Memory lookup before AI generation
 * 1. Check for memory using organizationId (default: 'org_default')
 * 2. If memory exists: Use memory TOC with frequency-based ordering
 * 3. If no memory: Use fixed Planning Card structure
 */
export async function generateTocNode(
    state: ReportStateType
): Promise<GenerateTocResult> {
    console.log('[generate-toc] Generating TOC for:', state.title);

    if (!state.planningContext) {
        console.error('[generate-toc] No planning context available');
        throw new Error('Planning context is required for TOC generation');
    }

    // T075: Try memory lookup first
    // Note: Using 'org_default' as organizationId since it's not in current schema
    // In production, this should be derived from user context
    const organizationId = 'org_default';
    const discipline = state.discipline || state.trade || null;

    try {
        const memoryResult = await fetchMemoryToc({
            organizationId,
            reportType: state.reportType,
            discipline,
        });

        if (memoryResult.fromMemory && memoryResult.toc.sections.length > 0) {
            console.log('[generate-toc] Using memory TOC (used', memoryResult.timesUsed, 'times)');

            // T077: Include timesUsed in the TOC for UI display
            const tocWithMetadata: TableOfContents = {
                ...memoryResult.toc,
                timesUsed: memoryResult.timesUsed,
            };

            return {
                toc: tocWithMetadata,
                status: 'toc_pending',
            };
        }
    } catch (error) {
        console.warn('[generate-toc] Memory lookup failed, falling back to fixed structure:', error);
    }

    // Fallback to fixed structure
    const sections = getFixedTocSections(state);

    const toc: TableOfContents = {
        version: 1,
        source: 'fixed', // Changed from 'generated' to indicate this is a fixed structure
        sections,
    };

    console.log('[generate-toc] Created fixed TOC with', sections.length, 'sections');

    return {
        toc,
        status: 'toc_pending',
    };
}

/**
 * Generate TOC with memory pre-fill
 * Used when memory system is available (T074)
 * For fixed structure, this just returns the fixed TOC with any memory-based customizations
 */
export async function generateTocWithMemory(
    state: ReportStateType,
    memoryToc?: TableOfContents
): Promise<GenerateTocResult> {
    if (memoryToc && memoryToc.source === 'memory') {
        console.log('[generate-toc] Using memory-based TOC customizations');

        // Start with fixed structure
        const sections = getFixedTocSections(state);

        // Memory system could customize descriptions or add subsections here in future
        // For now, just use fixed structure

        return {
            toc: {
                version: 1,
                source: 'memory',
                sections,
            },
            status: 'toc_pending',
        };
    }

    // Use fixed TOC structure
    return generateTocNode(state);
}
