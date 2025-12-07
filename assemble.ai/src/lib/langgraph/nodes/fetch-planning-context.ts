/**
 * T039b: Fetch Planning Context Node
 * First node in LangGraph workflow - loads exact Planning Card data and transmittal
 *
 * This node:
 * 1. Fetches complete Planning Card data from SQLite
 * 2. If discipline is specified, fetches transmittal for that discipline
 * 3. Populates planningContext and transmittal in state
 */

import type { ReportStateType } from '../state';
import {
    fetchPlanningContext,
    fetchTransmittalForDiscipline,
    fetchDocumentSetForDiscipline,
    findDisciplineByName,
    type PlanningContext,
    type TransmittalContext,
} from '../../services/planning-context';

export interface FetchPlanningContextResult {
    planningContext: PlanningContext | null;
    transmittal: TransmittalContext | null;
    documentSetIds: string[];
    status: 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';
    errorMessage: string | null;
}

/**
 * Fetch planning context node
 * Loads exact Planning Card data for report generation
 */
export async function fetchPlanningContextNode(
    state: ReportStateType
): Promise<FetchPlanningContextResult> {
    console.log('[fetch-planning-context] Loading planning context for project:', state.projectId);

    try {
        // Step 1: Fetch complete planning context
        const planningContext = await fetchPlanningContext(state.projectId);

        if (!planningContext) {
            console.error('[fetch-planning-context] Project not found:', state.projectId);
            return {
                planningContext: null,
                transmittal: null,
                status: 'failed',
                errorMessage: `Project not found: ${state.projectId}`,
            };
        }

        console.log('[fetch-planning-context] Loaded planning context:', {
            projectName: planningContext.details.projectName,
            objectivesCount: Object.values(planningContext.objectives).filter(Boolean).length,
            stakeholdersCount: planningContext.stakeholders.length,
            risksCount: planningContext.risks.length,
            disciplinesCount: planningContext.disciplines.length,
        });

        // Step 2: If discipline specified, fetch transmittal and document set
        let transmittal: TransmittalContext | null = null;
        let documentSetIds: string[] = state.documentSetIds || [];

        if (state.discipline) {
            // Find the discipline by name
            const discipline = await findDisciplineByName(state.projectId, state.discipline);

            if (discipline) {
                console.log('[fetch-planning-context] Found discipline:', discipline.name);

                // Fetch transmittal for this discipline
                transmittal = await fetchTransmittalForDiscipline(state.projectId, discipline.id);

                if (transmittal) {
                    console.log('[fetch-planning-context] Loaded transmittal:', {
                        name: transmittal.name,
                        documentsCount: transmittal.documents.length,
                    });
                } else {
                    console.log('[fetch-planning-context] No transmittal found for discipline:', discipline.name);
                }

                // T098a & T098c: Fetch document set IDs for this discipline (for RAG filtering)
                // If document set IDs were not provided, fetch from discipline
                if (documentSetIds.length === 0) {
                    const disciplineDocSetIds = await fetchDocumentSetForDiscipline(state.projectId, discipline.id);
                    if (disciplineDocSetIds.length > 0) {
                        documentSetIds = disciplineDocSetIds;
                        console.log('[fetch-planning-context] Loaded document set for discipline:', {
                            disciplineName: discipline.name,
                            documentSetIds: disciplineDocSetIds,
                        });
                    } else {
                        console.log('[fetch-planning-context] No document set found for discipline:', discipline.name);
                    }
                }
            } else {
                console.warn('[fetch-planning-context] Discipline not found:', state.discipline);
            }
        }

        return {
            planningContext,
            transmittal,
            documentSetIds,
            status: 'draft', // Will transition to toc_pending after TOC generation
            errorMessage: null,
        };
    } catch (error) {
        console.error('[fetch-planning-context] Error loading context:', error);
        return {
            planningContext: null,
            transmittal: null,
            documentSetIds: [],
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error loading planning context',
        };
    }
}

/**
 * Get context summary for logging/debugging
 */
export function summarizePlanningContext(context: PlanningContext): string {
    return [
        `Project: ${context.details.projectName}`,
        `Address: ${context.details.address}`,
        `Stakeholders: ${context.stakeholders.length}`,
        `Risks: ${context.risks.length}`,
        `Active Disciplines: ${context.disciplines.filter(d => d.isEnabled).length}`,
        `Active Trades: ${context.trades.filter(t => t.isEnabled).length}`,
    ].join(' | ');
}
