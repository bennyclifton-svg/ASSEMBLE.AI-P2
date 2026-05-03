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
    isCostValueWriteRequest,
    isDesignWriteRequest,
    isDocumentSelectionRequest,
    isFinanceNoteRequest,
    isFinanceWriteRequest,
    isInvoiceWriteRequest,
    isIssueVariationWorkflowRequest,
    isNoteWriteRequest,
    isProgrammeDateWriteRequest,
    isProgramNoteRequest,
    isProgramWriteRequest,
    isProjectStatusRequest,
    isRftWriteRequest,
    isTransmittalWriteRequest,
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

type SpecialistName = 'finance' | 'program' | 'design';

const SPECIALIST_LABELS: Record<SpecialistName, string> = {
    finance: 'Finance Agent',
    program: 'Program Agent',
    design: 'Design Agent',
};

const DOMAIN_LABELS: Record<SpecialistName, string> = {
    finance: 'Finance',
    program: 'Programme',
    design: 'Design',
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

    if (isConsultantAddendumRequest(text)) {
        return ['design'];
    }

    if (isDocumentSelectionRequest(text)) {
        return ['design'];
    }

    if (isTransmittalWriteRequest(text)) {
        return ['design'];
    }

    if (isRftWriteRequest(text)) {
        return ['design'];
    }

    if (isIssueVariationWorkflowRequest(text) || isVariationWriteRequest(text)) {
        return ['finance'];
    }
    if (isNoteWriteRequest(text) && !isFinanceNoteRequest(text) && !isProgramNoteRequest(text)) {
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
        /\b(rft|request for tender|tender package|tender document|tender documents)\b/.test(lower) &&
        !/\b(addendum|addenda|notes?|decision record)\b/.test(lower)
    ) {
        return (
            'Routing note: this is RFT content work, not a note or addendum. ' +
            'The RFT Brief section uses stakeholder briefServices and briefDeliverables. ' +
            'Resolve the relevant consultant, then use update_stakeholder if possible.'
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
