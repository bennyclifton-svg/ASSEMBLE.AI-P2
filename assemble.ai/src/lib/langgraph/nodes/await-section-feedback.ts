/**
 * T044: Await Section Feedback Node
 * Human-in-the-loop node for section review and feedback
 *
 * This node uses LangGraph's interrupt() to pause execution
 * and wait for user to approve, regenerate, or skip a section.
 */

import { interrupt } from '@langchain/langgraph';
import type {
    ReportStateType,
    SectionFeedbackInterrupt,
    UserFeedback,
    FeedbackAction,
} from '../state';
import { getSmartContextSources } from './retrieve-context';

export interface AwaitSectionFeedbackResult {
    userFeedback: UserFeedback | null;
    currentSectionIndex: number;
    activeSourceIds: string[];
    status: 'generating' | 'complete';
}

/**
 * Await section feedback node
 * Interrupts execution to wait for user approval/feedback
 */
export async function awaitSectionFeedbackNode(
    state: ReportStateType
): Promise<AwaitSectionFeedbackResult> {
    console.log('[await-section-feedback] Waiting for feedback on section:', state.currentSectionIndex);

    const currentSection = state.sections[state.currentSectionIndex];
    if (!currentSection) {
        throw new Error(`No generated section at index ${state.currentSectionIndex}`);
    }

    // Get sources for Smart Context panel
    const sources = getSmartContextSources(state);

    // Create interrupt data for the UI
    const interruptData: SectionFeedbackInterrupt = {
        type: 'section_feedback',
        section: currentSection,
        sources,
        message: 'Review the generated section. Approve to continue, remove sources and regenerate, or skip.',
    };

    // This will pause execution and wait for user input
    const feedback = await interrupt<{
        action: FeedbackAction;
        instructions?: string;
        remainingSources?: string[];
    }>(interruptData);

    console.log('[await-section-feedback] Received feedback:', feedback.action);

    // Determine next steps based on feedback
    const nextIndex = state.currentSectionIndex + 1;
    const totalSections = state.toc?.sections.length ?? 0;
    const isComplete = feedback.action !== 'regenerate' && nextIndex >= totalSections;

    if (feedback.action === 'regenerate') {
        // User wants to regenerate - stay on same section
        const excludedIds = state.activeSourceIds.filter(
            id => !feedback.remainingSources?.includes(id)
        );

        return {
            userFeedback: {
                action: 'regenerate',
                sectionIndex: state.currentSectionIndex,
                instructions: feedback.instructions,
                excludedSourceIds: excludedIds,
            },
            currentSectionIndex: state.currentSectionIndex, // Stay on current section
            activeSourceIds: feedback.remainingSources ?? state.activeSourceIds,
            status: 'generating',
        };
    }

    // Approve or skip - move to next section
    return {
        userFeedback: null, // Clear feedback for next section
        currentSectionIndex: nextIndex,
        activeSourceIds: [], // Reset for next section
        status: isComplete ? 'complete' : 'generating',
    };
}

/**
 * Process section feedback without interrupt (for API-driven workflow)
 * Used when feedback is provided via REST API
 */
export function processSectionFeedback(
    state: ReportStateType,
    action: FeedbackAction,
    options?: {
        instructions?: string;
        excludeSourceIds?: string[];
    }
): AwaitSectionFeedbackResult {
    console.log('[await-section-feedback] Processing feedback via API:', action);

    const nextIndex = state.currentSectionIndex + 1;
    const totalSections = state.toc?.sections.length ?? 0;
    const isComplete = action !== 'regenerate' && nextIndex >= totalSections;

    if (action === 'regenerate') {
        return {
            userFeedback: {
                action: 'regenerate',
                sectionIndex: state.currentSectionIndex,
                instructions: options?.instructions,
                excludedSourceIds: options?.excludeSourceIds,
            },
            currentSectionIndex: state.currentSectionIndex,
            activeSourceIds: state.activeSourceIds.filter(
                id => !options?.excludeSourceIds?.includes(id)
            ),
            status: 'generating',
        };
    }

    return {
        userFeedback: null,
        currentSectionIndex: nextIndex,
        activeSourceIds: [],
        status: isComplete ? 'complete' : 'generating',
    };
}

/**
 * Determine routing after section feedback
 */
export function routeAfterSectionFeedback(
    state: ReportStateType
): 'retrieve_context' | 'finalize' {
    // If regenerating, go back to retrieve context
    if (state.userFeedback?.action === 'regenerate') {
        return 'retrieve_context';
    }

    // Check if there are more sections
    const totalSections = state.toc?.sections.length ?? 0;
    if (state.currentSectionIndex < totalSections) {
        return 'retrieve_context';
    }

    // All sections done
    return 'finalize';
}
