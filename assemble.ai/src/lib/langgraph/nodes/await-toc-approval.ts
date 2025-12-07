/**
 * T041: Await TOC Approval Node
 * Human-in-the-loop node for TOC editing and approval
 *
 * This node uses LangGraph's interrupt() to pause execution
 * and wait for user to review/edit/approve the table of contents.
 */

import { interrupt } from '@langchain/langgraph';
import type { ReportStateType, TableOfContents, TocApprovalInterrupt } from '../state';

export interface AwaitTocApprovalResult {
    toc: TableOfContents;
    status: 'generating';
    currentSectionIndex: number;
}

/**
 * Await TOC approval node
 * Interrupts execution to wait for user approval
 */
export async function awaitTocApprovalNode(
    state: ReportStateType
): Promise<AwaitTocApprovalResult> {
    console.log('[await-toc-approval] Waiting for user to review TOC');

    if (!state.toc) {
        throw new Error('No TOC available for approval');
    }

    // Create interrupt data for the UI
    const interruptData: TocApprovalInterrupt = {
        type: 'toc_approval',
        toc: state.toc,
        message: 'Review and edit the table of contents. Drag sections to reorder, add new sections, or remove existing ones.',
    };

    // This will pause execution and wait for user input
    // The user's edited TOC will be returned when they approve
    const userEdit = await interrupt<{ approvedToc: TableOfContents }>(interruptData);

    console.log('[await-toc-approval] User approved TOC with', userEdit.approvedToc.sections.length, 'sections');

    return {
        toc: {
            ...userEdit.approvedToc,
            version: (state.toc.version || 0) + 1,
        },
        status: 'generating',
        currentSectionIndex: 0, // Start generating from first section
    };
}

/**
 * Process TOC approval without interrupt (for API-driven workflow)
 * Used when TOC is approved via REST API
 */
export function processTocApproval(
    state: ReportStateType,
    approvedToc: TableOfContents
): AwaitTocApprovalResult {
    console.log('[await-toc-approval] Processing TOC approval via API');

    return {
        toc: {
            ...approvedToc,
            version: (state.toc?.version || 0) + 1,
        },
        status: 'generating',
        currentSectionIndex: 0,
    };
}

/**
 * Validate TOC structure
 */
export function validateToc(toc: TableOfContents): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!toc.sections || toc.sections.length === 0) {
        errors.push('TOC must have at least one section');
    }

    // Check for duplicate IDs
    const ids = new Set<string>();
    for (const section of toc.sections || []) {
        if (ids.has(section.id)) {
            errors.push(`Duplicate section ID: ${section.id}`);
        }
        ids.add(section.id);

        // Validate required fields
        if (!section.title || section.title.trim() === '') {
            errors.push('All sections must have a title');
        }

        if (section.level !== 1 && section.level !== 2) {
            errors.push(`Invalid level for section "${section.title}": must be 1 or 2`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
