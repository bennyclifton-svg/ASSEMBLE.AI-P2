/**
 * Agent runner — the tool-use loop.
 *
 * Given an agent name, a user message, and a thread context, the runner:
 *   1. Records an agent_runs row
 *   2. Loops: call runAgentTurn() → if model returned tool_use blocks,
 *      dispatch each tool, write a tool_calls audit row, build a
 *      tool_result message, feed it back as the next user turn
 *   3. Stops when the model returns end_turn (no tool calls)
 *   4. Writes the final assistant message to chat_messages
 *   5. Emits SSE events through events.ts at every step
 *
 * Phase 1: read-only tools only. Mutating tools (Phase 3) will pause
 * the loop on a tool_call and emit an awaiting_approval event.
 */

import { db } from '@/lib/db';
import {
    chatMessages,
    agentRuns,
    toolCalls as toolCallsTable,
} from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import { getAgent } from './registry';
import { getTool } from './tools/catalog';
import { runAgentTurn, extractText, extractToolUses } from './completion';
import type { AgentMessage } from './completion';
import type { ToolContext } from './tools/_context';
import { CrossTenantAccessError } from './tools/_context';
import { emitChatEvent } from './events';
import './tools'; // side-effect: registers tools with the catalog
import { assembleContext } from '@/lib/context/orchestrator';
import type { ModuleName } from '@/lib/context/types';

export interface RunAgentArgs {
    agentName: string;
    threadId: string;
    organizationId: string;
    userId: string;
    projectId: string;
    /** The user message id that triggered this run. Stored on the run row for traceability. */
    triggerMessageId: string;
    /** Prior turns in the conversation (oldest first). Each entry alternates user/assistant. */
    history: AgentMessage[];
    /**
     * When false, run/tool audit rows and SSE lifecycle events are still emitted,
     * but the specialist's final text is returned to the caller instead of being
     * persisted as a visible chat message. Used by the Orchestrator fan-out.
     */
    persistAssistantMessage?: boolean;
}

export interface RunAgentResult {
    runId: string;
    assistantMessageId: string;
    finalText: string;
    stopReason: string | null;
    inputTokens: number;
    outputTokens: number;
    turns: number;
}

const MAX_TURNS = 8;
const DEFAULT_CONTEXT_MODULES: ModuleName[] = ['projectInfo', 'profile', 'costPlan', 'program', 'risks'];
const APPROVAL_CLAIM_RE =
    /\b(awaiting (?:your )?approval|approval card|action the approval|submitted for approval|invoice proposed)\b/i;
const INVOICE_REQUEST_RE =
    /\b(add|record|create|enter|post|allocate|log)\b[\s\S]{0,80}\b(invoice|progress claim|claim)\b/i;

function latestUserText(history: AgentMessage[]): string {
    for (let i = history.length - 1; i >= 0; i--) {
        const message = history[i];
        if (message.role === 'user' && typeof message.content === 'string') {
            return message.content;
        }
    }
    return '';
}

export function shouldRecoverMissingInvoiceApproval(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
}): boolean {
    if (args.usedToolNames.includes('record_invoice')) return false;
    if (!INVOICE_REQUEST_RE.test(args.latestUserMessage)) return false;
    return APPROVAL_CLAIM_RE.test(args.finalText);
}

export async function runAgent(args: RunAgentArgs): Promise<RunAgentResult> {
    const agent = getAgent(args.agentName);
    const startedAt = Date.now();

    // 1. Open the run row
    const [run] = await db
        .insert(agentRuns)
        .values({
            threadId: args.threadId,
            triggerMessageId: args.triggerMessageId,
            agentName: agent.name,
            status: 'running',
        })
        .returning({ id: agentRuns.id });

    const runId = run.id;
    const ctx: ToolContext = {
        userId: args.userId,
        organizationId: args.organizationId,
        projectId: args.projectId,
        threadId: args.threadId,
        runId,
    };

    emitChatEvent(args.threadId, { type: 'run_started', runId, agentName: agent.name });
    const triggeringUserText = latestUserText(args.history);

    // 2. Build system prompt with a Phase 2 project-memory snapshot.
    const assembledContext = await buildAgentContext({
        projectId: args.projectId,
        task: triggeringUserText || 'Agent conversation',
        modules: agent.contextModules ?? DEFAULT_CONTEXT_MODULES,
    });
    const system = agent.buildSystemPrompt({ assembledContext });

    // Tool specs for this agent
    const toolSpecs = agent.allowedTools.map((name) => {
        const def = getTool(name);
        if (!def) throw new Error(`Agent "${agent.name}" references unregistered tool "${name}"`);
        return def.spec;
    });

    const messages: AgentMessage[] = [...args.history];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let modelId = '';
    let stopReason: string | null = null;
    let finalText = '';
    let turn = 0;
    const usedToolNames: string[] = [];

    try {
        while (turn < MAX_TURNS) {
            turn++;
            emitChatEvent(args.threadId, { type: 'agent_thinking', runId, turn });

            const result = await runAgentTurn({
                featureGroup: agent.featureGroup,
                system,
                messages,
                tools: toolSpecs,
                maxTokens: agent.maxTokens,
            });

            modelId = result.modelId;
            totalInputTokens += result.usage.inputTokens;
            totalOutputTokens += result.usage.outputTokens;
            stopReason = result.stopReason;

            const text = extractText(result.blocks);
            const toolUses = extractToolUses(result.blocks);

            // Append the assistant message (with full block payload) to history
            messages.push({ role: 'assistant', content: result.blocks });

            if (toolUses.length === 0) {
                finalText = text;
                if (
                    shouldRecoverMissingInvoiceApproval({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                    }) &&
                    turn < MAX_TURNS
                ) {
                    messages.push({
                        role: 'user',
                        content:
                            'You told the user an invoice is awaiting approval, but no record_invoice tool call was made. ' +
                            'Do not answer in prose. If the invoice number, date, amount, paid status, and target cost line are known or were reasonably specified by the user, call record_invoice now with invoiceDate in YYYY-MM-DD format. ' +
                            'If you cannot call record_invoice, ask one concise clarifying question and explicitly say no approval card has been created yet.',
                    });
                    finalText = '';
                    continue;
                }
                break;
            }

            // Dispatch each tool_use, build a single user message of tool_results
            const toolResults: Array<{
                type: 'tool_result';
                tool_use_id: string;
                content: string;
                is_error?: boolean;
            }> = [];

            for (const tu of toolUses) {
                const def = getTool(tu.name);
                usedToolNames.push(tu.name);
                const start = Date.now();
                const [callRow] = await db
                    .insert(toolCallsTable)
                    .values({
                        runId,
                        toolName: tu.name,
                        input: tu.input,
                        status: 'running',
                    })
                    .returning({ id: toolCallsTable.id });

                emitChatEvent(args.threadId, {
                    type: 'tool_call_started',
                    runId,
                    toolCallId: callRow.id,
                    toolName: tu.name,
                    input: tu.input,
                });

                try {
                    if (!def) throw new Error(`Tool "${tu.name}" is not registered`);
                    if (!agent.allowedTools.includes(tu.name)) {
                        throw new Error(
                            `Agent "${agent.name}" is not permitted to use tool "${tu.name}"`
                        );
                    }
                    // Mutating tools need the Anthropic tool_use_id so the
                    // resulting approvals row can be correlated back to the
                    // turn that proposed it. We splice it in via a reserved
                    // _toolUseId field that the tool's validate() may read.
                    const inputWithToolUseId =
                        def.mutating && tu.input && typeof tu.input === 'object'
                            ? { ...(tu.input as Record<string, unknown>), _toolUseId: tu.id }
                            : tu.input;
                    const validInput = def.validate(inputWithToolUseId);
                    const output = await def.execute(ctx, validInput);
                    const durationMs = Date.now() - start;

                    await db
                        .update(toolCallsTable)
                        .set({ output: output as object, status: 'complete', durationMs })
                        .where(eq(toolCallsTable.id, callRow.id));

                    emitChatEvent(args.threadId, {
                        type: 'tool_call_finished',
                        runId,
                        toolCallId: callRow.id,
                        toolName: tu.name,
                        status: 'complete',
                        durationMs,
                    });

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: tu.id,
                        content: JSON.stringify(output),
                    });
                } catch (err) {
                    const durationMs = Date.now() - start;
                    const message = err instanceof Error ? err.message : String(err);
                    const isCrossTenant = err instanceof CrossTenantAccessError;

                    await db
                        .update(toolCallsTable)
                        .set({
                            status: 'error',
                            durationMs,
                            error: { message, kind: isCrossTenant ? 'cross_tenant' : 'tool_error' },
                        })
                        .where(eq(toolCallsTable.id, callRow.id));

                    emitChatEvent(args.threadId, {
                        type: 'tool_call_finished',
                        runId,
                        toolCallId: callRow.id,
                        toolName: tu.name,
                        status: 'error',
                        durationMs,
                        error: message,
                    });

                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: tu.id,
                        content: JSON.stringify({ error: message }),
                        is_error: true,
                    });

                    // Cross-tenant errors are fatal — stop the run rather than letting
                    // the model retry and potentially probe.
                    if (isCrossTenant) {
                        throw err;
                    }
                }
            }

            // Feed all tool results back as a single user message
            messages.push({ role: 'user', content: toolResults });
        }

        if (turn >= MAX_TURNS && stopReason !== 'end_turn') {
            stopReason = stopReason ?? 'max_turns_reached';
            finalText =
                finalText ||
                'Reached the maximum number of internal steps without producing a final answer. Please try rephrasing the question.';
        }

        // 3. Persist the assistant message unless this is a quiet specialist
        // run inside an orchestrated fan-out.
        let assistantMessageId = '';
        if (args.persistAssistantMessage !== false) {
            const [assistantMessage] = await db
                .insert(chatMessages)
                .values({
                    threadId: args.threadId,
                    role: 'assistant',
                    content: finalText,
                    agentName: agent.name,
                    runId,
                })
                .returning({ id: chatMessages.id });
            assistantMessageId = assistantMessage.id;
        }

        // 4. Close the run row
        await db
            .update(agentRuns)
            .set({
                status: 'complete',
                model: modelId,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                finishedAt: new Date(),
            })
            .where(eq(agentRuns.id, runId));

        if (assistantMessageId) {
            emitChatEvent(args.threadId, {
                type: 'assistant_message',
                runId,
                messageId: assistantMessageId,
                content: finalText,
            });
        }
        emitChatEvent(args.threadId, {
            type: 'run_finished',
            runId,
            status: 'complete',
            stopReason,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
        });

        return {
            runId,
            assistantMessageId,
            finalText,
            stopReason,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            turns: turn,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db
            .update(agentRuns)
            .set({
                status: 'error',
                model: modelId || null,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                error: { message },
                finishedAt: new Date(),
            })
            .where(eq(agentRuns.id, runId));

        emitChatEvent(args.threadId, {
            type: 'run_finished',
            runId,
            status: 'error',
            stopReason,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            error: message,
        });

        throw err;
    } finally {
        // dev breadcrumb
        if (process.env.NODE_ENV !== 'production') {
            console.log(
                `[agents] runAgent ${agent.name} thread=${args.threadId} run=${runId} ` +
                    `turns=${turn} ms=${Date.now() - startedAt} in=${totalInputTokens} out=${totalOutputTokens}`
            );
        }
    }
}

async function buildAgentContext(args: {
    projectId: string;
    task: string;
    modules: ModuleName[];
}): Promise<string> {
    try {
        const ctx = await assembleContext({
            projectId: args.projectId,
            task: args.task,
            contextType: 'note',
            forceModules: args.modules,
            includeKnowledgeDomains: false,
        });
        return [
            ctx.projectSummary,
            ctx.moduleContext,
            ctx.ragContext,
            ctx.crossModuleInsights,
        ]
            .filter(Boolean)
            .join('\n\n');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[agents] context assembly failed', { projectId: args.projectId, error: message });
        return '';
    }
}
