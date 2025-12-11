/**
 * T040 & T099a: Generate TOC Node
 * Generates table of contents using FIXED 7-section Planning Card structure
 *
 * HARDCODED 7-SECTION TOC (used by BOTH Short RFT and Long RFT):
 * ┌───┬───────────────────────────┬─────────────────────────────────────────┐
 * │ # │ Section Title             │ Notes                                   │
 * ├───┼───────────────────────────┼─────────────────────────────────────────┤
 * │ 1 │ Project Details           │ From planningContext.details            │
 * │ 2 │ Project Objectives        │ From planningContext.objectives         │
 * │ 3 │ Project Staging           │ From planningContext.stages             │
 * │ 4 │ Project Risks             │ From planningContext.risks              │
 * │ 5 │ Consultant Brief          │ OR "Contractor Scope" for trades        │
 * │ 6 │ Consultant Fee            │ OR "Contractor Price" for trades        │
 * │ 7 │ Transmittal               │ ONLY if transmittal.documents.length > 0│
 * └───┴───────────────────────────┴─────────────────────────────────────────┘
 *
 * Short RFT (data_only): Template-based rendering, NO RAG, NO AI (except Brief polish)
 * Long RFT (ai_assisted): RAG retrieval + AI generation for all sections except Transmittal
 *
 * IMPORTANT: Memory system (T074-T075) is for CONTENT pattern learning only, NOT TOC override.
 */

import type { ReportStateType, TableOfContents, TocSection } from '../state';
import { v4 as uuidv4 } from 'uuid';

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
 * Creates table of contents using FIXED 7-section structure
 *
 * T099a: ALWAYS use fixed structure for BOTH modes (Data Only and AI Assisted)
 * - Memory system is for content pattern learning, NOT TOC structure override
 * - This ensures consistent report structure across all generations
 * - Transmittal section always uses data-only rendering (no RAG)
 */
export async function generateTocNode(
    state: ReportStateType
): Promise<GenerateTocResult> {
    console.log('[generate-toc] Generating fixed TOC for:', state.title);
    console.log('[generate-toc] Generation mode:', state.generationMode);
    console.log('[generate-toc] Discipline:', state.discipline || 'none');
    console.log('[generate-toc] Trade:', state.trade || 'none');
    console.log('[generate-toc] Has transmittal:', state.transmittal ? `${state.transmittal.documents.length} docs` : 'none');

    if (!state.planningContext) {
        console.error('[generate-toc] No planning context available');
        throw new Error('Planning context is required for TOC generation');
    }

    // T099a: ALWAYS use fixed 7-section structure (no memory override)
    // Memory system is for content learning, NOT TOC structure
    const sections = getFixedTocSections(state);

    const toc: TableOfContents = {
        version: 1,
        source: 'fixed',
        sections,
    };

    // Log section titles for debugging
    console.log('[generate-toc] Created fixed TOC with', sections.length, 'sections:');
    sections.forEach((s, i) => console.log(`  [${i + 1}] ${s.title}`));

    return {
        toc,
        status: 'toc_pending',
    };
}

/**
 * Generate TOC with memory pre-fill (DEPRECATED for TOC structure)
 *
 * T099a: Memory system no longer overrides TOC structure.
 * This function now simply delegates to generateTocNode for fixed structure.
 * Memory system is reserved for content pattern learning only.
 */
export async function generateTocWithMemory(
    state: ReportStateType,
    _memoryToc?: TableOfContents
): Promise<GenerateTocResult> {
    // T099a: Always use fixed TOC structure regardless of memory
    // Memory parameter is ignored - kept for API compatibility
    return generateTocNode(state);
}
