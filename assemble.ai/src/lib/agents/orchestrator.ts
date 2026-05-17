/**
 * Phase 2 Orchestrator runtime.
 *
 * This is intentionally deterministic routing around the existing specialist
 * runner. Specialists do the substantive work; the Orchestrator persists one
 * attributed combined response so the chat stays readable.
 */

import { db } from '@/lib/db';
import { agentRuns, chatMessages } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import { emitChatEvent } from './events';
import {
    hasDesignContext,
    hasFinanceContext,
    hasProgramContext,
    isConsultantAddendumRequest,
    isContractorVariationClaimRequest,
    isCostValueWriteRequest,
    isDesignWriteRequest,
    isDocumentSelectionRequest,
    isFinanceNoteRequest,
    isFinanceWriteRequest,
    isInvoiceWriteRequest,
    isIssueVariationWorkflowRequest,
    isNoteWriteRequest,
    isProjectReportWriteRequest,
    isProgrammeDateWriteRequest,
    isProgramNoteRequest,
    isProgramWriteRequest,
    isRfiReferenceRequest,
    isRfiWriteRequest,
    isProjectStatusRequest,
    isRftWriteRequest,
    isTechnicalServicesDocumentReviewRequest,
    isTenderFirmWriteRequest,
    isTechnicalServicesQuestion,
    isTransmittalWriteRequest,
    isVariationClaimAssessmentRequest,
    isVariationWriteRequest,
} from './intent';
import { runAgent } from './runner';
import type { AgentMessage } from './completion';
import type { ChatViewContext } from '@/lib/chat/view-context';

export interface RunOrchestratorArgs {
    threadId: string;
    organizationId: string;
    userId: string;
    projectId: string;
    triggerMessageId: string;
    history: AgentMessage[];
    viewContext?: ChatViewContext | null;
}

export interface RunOrchestratorResult {
    runId: string;
    assistantMessageId: string;
    finalText: string;
    routedAgents: string[];
    inputTokens: number;
    outputTokens: number;
}

type SpecialistName = 'finance' | 'program' | 'design' | 'delivery';

const SPECIALIST_LABELS: Record<SpecialistName, string> = {
    finance: 'Finance Agent',
    program: 'Program Agent',
    design: 'Design Agent',
    delivery: 'Delivery Agent',
};

const DOMAIN_LABELS: Record<SpecialistName, string> = {
    finance: 'Finance',
    program: 'Programme',
    design: 'Design',
    delivery: 'Delivery',
};

export async function runOrchestrator(args: RunOrchestratorArgs): Promise<RunOrchestratorResult> {
    const latestUserMessage = latestUserText(args.history);
    const routedAgents = routeAgents(latestUserMessage);

    const [run] = await db
        .insert(agentRuns)
        .values({
            threadId: args.threadId,
            triggerMessageId: args.triggerMessageId,
            agentName: 'orchestrator',
            status: 'running',
        })
        .returning({ id: agentRuns.id });

    const runId = run.id;
    emitChatEvent(args.threadId, { type: 'run_started', runId, agentName: 'orchestrator' });
    emitChatEvent(args.threadId, { type: 'agent_thinking', runId, turn: 1 });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
        const results = await Promise.allSettled(
            routedAgents.map((agentName) =>
                runAgent({
                    agentName,
                    threadId: args.threadId,
                    organizationId: args.organizationId,
                    userId: args.userId,
                    projectId: args.projectId,
                    triggerMessageId: args.triggerMessageId,
                    history: buildSpecialistHistory(args.history, agentName, latestUserMessage),
                    viewContext: args.viewContext ?? null,
                    persistAssistantMessage: false,
                })
            )
        );

        const sections: OrchestratorResponseSection[] = [];
        results.forEach((result, index) => {
            const agentName = routedAgents[index];
            if (result.status === 'fulfilled') {
                totalInputTokens += result.value.inputTokens;
                totalOutputTokens += result.value.outputTokens;
                sections.push({ agentName, text: result.value.finalText.trim() });
            } else {
                const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
                sections.push({ agentName, text: message, isError: true });
            }
        });

        const finalText = formatOrchestratorFinalText(sections);

        const [assistantMessage] = await db
            .insert(chatMessages)
            .values({
                threadId: args.threadId,
                role: 'assistant',
                content: finalText,
                agentName: 'orchestrator',
                runId,
            })
            .returning({ id: chatMessages.id });

        await db
            .update(agentRuns)
            .set({
                status: 'complete',
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                finishedAt: new Date(),
            })
            .where(eq(agentRuns.id, runId));

        emitChatEvent(args.threadId, {
            type: 'assistant_message',
            runId,
            messageId: assistantMessage.id,
            content: finalText,
        });
        emitChatEvent(args.threadId, {
            type: 'run_finished',
            runId,
            status: 'complete',
            stopReason: 'end_turn',
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
        });

        return {
            runId,
            assistantMessageId: assistantMessage.id,
            finalText,
            routedAgents,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db
            .update(agentRuns)
            .set({
                status: 'error',
                error: { message },
                finishedAt: new Date(),
            })
            .where(eq(agentRuns.id, runId));
        emitChatEvent(args.threadId, {
            type: 'run_finished',
            runId,
            status: 'error',
            stopReason: 'error',
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            error: message,
        });
        throw err;
    }
}

interface OrchestratorResponseSection {
    agentName: SpecialistName;
    text: string;
    isError?: boolean;
}

export function formatOrchestratorFinalText(sections: OrchestratorResponseSection[]): string {
    if (sections.length === 0) {
        return "I couldn't complete that project check.";
    }

    if (sections.length === 1) {
        const [section] = sections;
        return section.isError
            ? `I couldn't complete that project check: ${section.text}`
            : section.text;
    }

    const checked = sections.map((section) => DOMAIN_LABELS[section.agentName]).join(', ');
    return [
        `I checked ${checked}.`,
        '',
        sections
            .map((section) => {
                const label = DOMAIN_LABELS[section.agentName];
                const text = section.isError
                    ? `I couldn't complete this part: ${section.text}`
                    : section.text;
                return `**${label}:**\n${text}`;
            })
            .join('\n\n'),
    ].join('\n');
}

export function routeAgents(text: string): SpecialistName[] {
    if (isProjectStatusRequest(text)) {
        return ['finance', 'program', 'design'];
    }

    if (isContractorVariationClaimRequest(text) || isVariationClaimAssessmentRequest(text)) {
        return ['delivery'];
    }

    if (isConsultantAddendumRequest(text)) {
        return ['design'];
    }

    if (isDocumentSelectionRequest(text)) {
        return ['design'];
    }

    if (isTransmittalWriteRequest(text)) {
        return ['design'];
    }

    if (isRfiWriteRequest(text)) {
        return ['design'];
    }

    if (isRfiReferenceRequest(text)) {
        return ['design'];
    }

    if (isTenderFirmWriteRequest(text)) {
        return ['design'];
    }

    if (isRftWriteRequest(text)) {
        return ['design'];
    }

    if (
        isTechnicalServicesDocumentReviewRequest(text) &&
        !isCostValueWriteRequest(text) &&
        !isFinanceWriteRequest(text) &&
        !isInvoiceWriteRequest(text) &&
        !isIssueVariationWorkflowRequest(text) &&
        !isVariationWriteRequest(text) &&
        !isProgramWriteRequest(text) &&
        !isProgrammeDateWriteRequest(text)
    ) {
        return ['design'];
    }

    if (isTechnicalServicesQuestion(text) && !hasFinanceContext(text) && !hasProgramContext(text)) {
        return ['design'];
    }

    if (isIssueVariationWorkflowRequest(text) || isVariationWriteRequest(text)) {
        return ['finance'];
    }
    if (isNoteWriteRequest(text) && !isFinanceNoteRequest(text) && !isProgramNoteRequest(text)) {
        return ['design'];
    }

    if (isProjectReportWriteRequest(text)) {
        return ['design'];
    }

    if (isCostValueWriteRequest(text)) {
        return ['finance'];
    }

    if (isFinanceWriteRequest(text)) {
        return ['finance'];
    }

    if (isProgramNoteRequest(text)) {
        return ['program'];
    }

    if (isProgramWriteRequest(text)) {
        return ['program'];
    }

    if (isProgrammeDateWriteRequest(text)) {
        return ['program'];
    }

    if (isDesignWriteRequest(text)) {
        return ['design'];
    }

    const matches: SpecialistName[] = [];
    if (hasFinanceContext(text)) matches.push('finance');
    if (hasProgramContext(text)) matches.push('program');
    if (hasDesignContext(text)) matches.push('design');

    return matches.length > 0 ? matches : ['finance'];
}

function buildSpecialistHistory(
    history: AgentMessage[],
    agentName: SpecialistName,
    latestUserMessage: string
): AgentMessage[] {
    const previous = history.slice(0, -1);
    const routingHint = specialistRoutingHint(agentName, latestUserMessage);
    return [
        ...previous,
        {
            role: 'user',
            content:
                `The Orchestrator routed this request to you as the ${SPECIALIST_LABELS[agentName]}. ` +
                `Answer only from your domain and use your available tools for in-domain write requests. If the request requires another specialist, name that dependency briefly.\n` +
                routingHint +
                `\n` +
                `Original user request:\n${latestUserMessage}`,
        },
    ];
}

function specialistRoutingHint(agentName: SpecialistName, latestUserMessage: string): string {
    const lower = latestUserMessage.toLowerCase();
    if (agentName === 'finance' && isIssueVariationWorkflowRequest(latestUserMessage)) {
        return (
            'Routing note: this is an issue-variation workflow request. ' +
            'Read cost/programme context first, ask one concise mapping question only if needed, then use start_issue_variation_workflow. ' +
            'Do not satisfy this with create_note, create_variation, update_cost_line, or update_program_activity directly.'
        );
    }
    if (agentName === 'finance' && isInvoiceWriteRequest(latestUserMessage)) {
        return (
            'Routing note: this is an invoice ledger request. ' +
            'Resolve allocation wording against the cost plan, treating slash-separated text like "Developer Expenses / Long Service Levy" as costCategory plus costLineReference. ' +
            'Use record_invoice only; do not create notes or programme milestones unless the user explicitly asks for a separate artefact.'
        );
    }
    if (
        agentName === 'design' &&
        isTenderFirmWriteRequest(latestUserMessage)
    ) {
        return (
            'Routing note: this is tender-panel firm work. ' +
            'Use add_tender_firms if possible; do not hand this to Procurement, Delivery, or Finance. ' +
            'If this message is only a follow-up firm contact list, use the prior tender-panel request in the chat history to determine firmType and disciplineOrTrade.'
        );
    }
    if (
        agentName === 'delivery' &&
        (isContractorVariationClaimRequest(latestUserMessage) ||
            isVariationClaimAssessmentRequest(latestUserMessage))
    ) {
        return (
            'Routing note: this is a contractor variation-claim request. ' +
            'Read available evidence. For a first assessment, use start_issue_variation_workflow. For an iteration on an existing assessment note, use list_notes first, then start_issue_variation_assessment_revision_workflow. ' +
            'Do not create standalone variations, notes, cost-line updates, programme updates, or correspondence records outside those workflows.'
        );
    }
    if (
        agentName === 'design' &&
        isRfiReferenceRequest(latestUserMessage) &&
        !isRfiWriteRequest(latestUserMessage)
    ) {
        return (
            'Routing note: this is an existing RFI response request. ' +
            'Use list_rfis to resolve the typed RFI, search/select relevant project documents, sync them to AI if needed, and use record_rfi_response or attach_rfi_evidence rather than creating a duplicate RFI or note.'
        );
    }
    if (
        agentName === 'design' &&
        isRfiWriteRequest(latestUserMessage)
    ) {
        return (
            'Routing note: this is an RFI drafting request. ' +
            'Use project evidence first, resolve the responsible stakeholder where possible, then use create_rfi for the typed RFI proposal. ' +
            'Do not satisfy this with create_note or a generic correspondence note. If a required RFI fact is ambiguous, ask one concise clarifying question.'
        );
    }
    if (
        agentName === 'design' &&
        isProjectReportWriteRequest(latestUserMessage)
    ) {
        if (/\bweekly\b[\s\S]{0,120}\b(briefing|report|draft|status)\b|\b(briefing|report|draft|status)\b[\s\S]{0,120}\bweekly\b/i.test(latestUserMessage)) {
            return (
                'Routing note: this is weekly briefing/report draft work. ' +
                'Use create_weekly_report_draft so the draft is grounded in project records, typed RFIs, documents, approved memory, assumptions, and recommendations. ' +
                'Do not use create_report alone unless the user only asked for an empty report shell.'
            );
        }
        return (
            'Routing note: this is project-report work in the Notes/Meetings/Reports area. ' +
            'If the user says PCG report, treat PCG as Project Control Group, not progress claim. ' +
            'Use list_reports to inspect existing PCG reports when helpful, then use create_report if the user asked for a new report.'
        );
    }
    if (
        agentName === 'design' &&
        /\b(rft|request for tender|tender package|tender document|tender documents)\b/.test(lower) &&
        !/\b(addendum|addenda|notes?|decision record)\b/.test(lower)
    ) {
        return (
            'Routing note: this is RFT content work, not a note or addendum. ' +
            'The RFT Brief section uses stakeholder brief fields and the Fee table uses linked consultant cost-plan rows. ' +
            'Resolve the relevant consultant, then use update_rft_brief so services, deliverables, fee instructions, and fee-stage rows stay together.'
        );
    }
    if (
        agentName === 'design' &&
        isConsultantAddendumRequest(latestUserMessage)
    ) {
        return (
            'Routing note: consultant addenda are in Design scope. Do not hand this to a Document Controller/Admin Agent. ' +
            'If earlier conversation turns said otherwise, treat that as superseded by the current toolset. ' +
            'If the request uses the current selection or selected set, use the Current selected document ids from the app view exactly. ' +
            'Resolve the consultant and documents, then use create_addendum if possible.'
        );
    }
    return '';
}

function latestUserText(history: AgentMessage[]): string {
    for (let i = history.length - 1; i >= 0; i--) {
        const message = history[i];
        if (message.role === 'user' && typeof message.content === 'string') {
            return message.content;
        }
    }
    return '';
}
