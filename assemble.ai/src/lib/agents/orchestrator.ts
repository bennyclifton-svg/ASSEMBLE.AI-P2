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
import { runAgent } from './runner';
import type { AgentMessage } from './completion';

export interface RunOrchestratorArgs {
    threadId: string;
    organizationId: string;
    userId: string;
    projectId: string;
    triggerMessageId: string;
    history: AgentMessage[];
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
                    persistAssistantMessage: false,
                })
            )
        );

        const sections: string[] = [];
        results.forEach((result, index) => {
            const agentName = routedAgents[index];
            if (result.status === 'fulfilled') {
                totalInputTokens += result.value.inputTokens;
                totalOutputTokens += result.value.outputTokens;
                sections.push(`**${SPECIALIST_LABELS[agentName]}:**\n${result.value.finalText.trim()}`);
            } else {
                const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
                sections.push(`**${SPECIALIST_LABELS[agentName]}:**\nI couldn't complete this specialist check: ${message}`);
            }
        });

        const finalText = [
            routedAgents.length > 1
                ? `I routed this to ${routedAgents.map((a) => SPECIALIST_LABELS[a]).join(', ')}.`
                : `I routed this to ${SPECIALIST_LABELS[routedAgents[0]]}.`,
            '',
            sections.join('\n\n'),
        ].join('\n');

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

export function routeAgents(text: string): SpecialistName[] {
    const lower = text.toLowerCase();

    const wantsBriefing =
        /\b(status|briefing|where are we|how are we tracking|overall|summary|health check)\b/.test(lower);
    const wantsReadiness = /\b(ready|readiness|soft gate|gate|go to tender|tender-ready)\b/.test(lower);
    if (wantsBriefing || wantsReadiness) {
        return ['finance', 'program', 'design'];
    }

    const financeWrite =
        /\b(add|record|create|enter|post|allocate|log)\b[\s\S]{0,140}\b(invoices?|progress claims?|claims?|fees?|cost lines?|variations?)\b/.test(lower);
    if (financeWrite) {
        return ['finance'];
    }

    const finance = /\b(cost|budget|forecast|variance|cashflow|invoices?|claims?|contingency|variation|financial|fees?|contract sum|qs)\b/.test(lower);
    const program = /\b(programme|program|schedule|milestone|delay|eot|extension of time|critical path|float|completion|duration)\b/.test(lower);
    const design = /\b(design|drawing|architect|engineer|consultant|brief|da\b|development application|planning|ncc|bca|condition|specification)\b/.test(lower);

    const matches: SpecialistName[] = [];
    if (finance) matches.push('finance');
    if (program) matches.push('program');
    if (design) matches.push('design');

    return matches.length > 0 ? matches : ['finance'];
}

function buildSpecialistHistory(
    history: AgentMessage[],
    agentName: SpecialistName,
    latestUserMessage: string
): AgentMessage[] {
    const previous = history.slice(0, -1);
    return [
        ...previous,
        {
            role: 'user',
            content:
                `The Orchestrator routed this request to you as the ${SPECIALIST_LABELS[agentName]}. ` +
                `Answer only from your domain. If the request requires another specialist, name that dependency briefly.\n\n` +
                `Original user request:\n${latestUserMessage}`,
        },
    ];
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
