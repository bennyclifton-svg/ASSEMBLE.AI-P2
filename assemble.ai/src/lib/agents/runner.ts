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
import type { ModuleName } from '@/lib/context/types';
import {
    assembleAgentContext,
    DEFAULT_AGENT_CONTEXT_MODULES,
} from '@/lib/context/agent-context';
import {
    formatChatViewContextForPrompt,
    type ChatViewContext,
} from '@/lib/chat/view-context';
import { isIssueVariationWorkflowRequest } from './intent';

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
    viewContext?: ChatViewContext | null;
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
const APPROVAL_CLAIM_RE =
    /\b(awaiting (?:your )?approval|approval card|action the approval|submitted for approval|proposed (?:and )?(?:is )?(?:now )?awaiting approval|invoice proposed)\b/i;
const WRITE_REFUSAL_RE =
    /\b(cannot|can't|unable to|not able to|outside my domain|outside this domain|falls outside my domain|requires another|dependency|document controller|admin agent)\b/i;
const INVOICE_REQUEST_RE =
    /\b(add|record|create|enter|post|allocate|log)\b[\s\S]{0,80}\b(invoice|progress claim|claim)\b/i;
const ADDENDUM_REQUEST_RE =
    /\b(create|add|issue|prepare|draft|attach|generate)\b[\s\S]{0,180}\b(addendum|addenda)\b|\b(addendum|addenda)\b[\s\S]{0,180}\b(attach|documents?|transmittal|consultants?|contractors?|tenderers?)\b/i;
const NOTE_REQUEST_RE =
    /\b(create|add|record|update|change|edit|attach)\b[\s\S]{0,180}\b(notes?|decision record)\b|\b(notes?|decision record)\b[\s\S]{0,180}\b(attach|documents?|drawings?|files?|update|change|edit)\b/i;
const RFT_REQUEST_RE =
    /\b(rft|request for tender|tender package|tender document|tender documents)\b/i;
const DOCUMENT_SELECTION_REQUEST_RE =
    /\b(select|tick|check|choose|highlight)\b[\s\S]{0,160}\b(documents?|docs?|drawings?|files?)\b|\b(documents?|docs?|drawings?|files?)\b[\s\S]{0,160}\b(select|tick|checked|highlighted|chosen)\b/i;
const DOCUMENT_SELECTION_CLAIM_RE =
    /\b(selected|selection updated|now selected|successfully selected|have been selected|has been selected|ticked|checked|highlighted)\b/i;
const WRITE_REQUEST_RE =
    /\b(add|record|create|enter|post|allocate|log|issue|raise|submit|prepare|draft|update|change|set|move|populate|generate|redraft|replace|append|attach)\b[\s\S]{0,160}\b(invoice|progress claim|claim|cost line|cost lines|variation|variations|risk|risks|note|notes|meeting|meetings|programme|program|schedule|activity|activities|milestone|milestones|stakeholder|stakeholders|contact|contacts|objective|objectives|project objective|project objectives|brief|project brief|rft|request for tender|tender package|tender document|tender documents|addendum|addenda|transmittal|transmittals|document|documents)\b/i;
const MUTATING_TOOL_NAMES = new Set([
    'update_cost_line',
    'create_cost_line',
    'record_invoice',
    'create_addendum',
    'create_note',
    'update_note',
    'attach_documents_to_note',
    'create_meeting',
    'create_risk',
    'update_risk',
    'create_variation',
    'start_issue_variation_workflow',
    'action_finance_variations_create',
    'update_variation',
    'update_program_activity',
    'action_program_activity_update',
    'create_program_milestone',
    'update_program_milestone',
    'update_stakeholder',
    'set_project_objectives',
    'action_planning_objectives_set',
    'action_finance_cost_plan_update_line',
]);
const NOTE_TOOL_NAMES = new Set(['create_note', 'update_note', 'attach_documents_to_note']);
const ISSUE_VARIATION_DIRECT_WRITE_TOOL_NAMES = new Set([
    'create_variation',
    'action_finance_variations_create',
    'update_variation',
    'update_cost_line',
    'action_finance_cost_plan_update_line',
    'create_cost_line',
    'update_program_activity',
    'action_program_activity_update',
    'create_program_milestone',
    'update_program_milestone',
    'create_note',
    'update_note',
    'attach_documents_to_note',
]);

export function approvalCardCount(output: unknown): number {
    if (!output || typeof output !== 'object') return 0;
    const record = output as { status?: unknown; steps?: unknown };
    if (record.status === 'awaiting_approval') return 1;
    if (record.status !== 'workflow_plan_ready') return 0;
    if (!Array.isArray(record.steps)) return 0;
    const count = record.steps.filter((step) => {
        return (
            step &&
            typeof step === 'object' &&
            typeof (step as { approvalId?: unknown }).approvalId === 'string'
        );
    }).length;
    return count;
}

function workflowFailedStepSummaries(output: unknown): string[] {
    if (!output || typeof output !== 'object') return [];
    const record = output as { status?: unknown; steps?: unknown };
    if (record.status !== 'workflow_plan_ready' || !Array.isArray(record.steps)) return [];
    return record.steps
        .filter((step) => step && typeof step === 'object')
        .map((step) => step as { state?: unknown; title?: unknown; summary?: unknown })
        .filter((step) => step.state === 'failed')
        .map((step) => {
            const title = typeof step.title === 'string' ? step.title : 'Workflow step';
            const summary = typeof step.summary === 'string' ? step.summary : 'No error detail was recorded.';
            return `${title}: ${userSafeToolErrorMessage(summary)}`;
        });
}

function workflowHasNoApprovalCards(output: unknown): boolean {
    if (!output || typeof output !== 'object') return false;
    const record = output as { status?: unknown };
    return record.status === 'workflow_plan_ready' && approvalCardCount(output) === 0;
}

export function compactApprovalGatedFinalText(args: {
    finalText: string;
    approvalToolNames: string[];
    workflowNoApprovalSummaries?: string[];
}): string {
    if (args.approvalToolNames.length === 0) return args.finalText;

    const plural = args.approvalToolNames.length > 1;
    return `I've put the proposed ${plural ? 'changes' : 'change'} in the approval ${plural ? 'cards' : 'card'} above.`;
}

export function userSafeToolErrorMessage(message: string): string {
    if (/failed query:|params:/i.test(message)) {
        if (/action_invocations/i.test(message)) {
            return 'The approval audit log is not ready, so the approval card could not be recorded. The request was not applied.';
        }
        return 'The project data store rejected part of the workflow. The request was not applied.';
    }
    return message;
}

export function formatMissingWorkflowApprovalText(summaries: string[]): string {
    const detail =
        summaries.length > 0
            ? summaries.map(userSafeToolErrorMessage).join(' ')
            : 'The workflow completed without creating any approval cards.';
    return `I couldn't create an approval card for that workflow. ${detail}`;
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

export function shouldRecoverMissingInvoiceApproval(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
}): boolean {
    if (args.usedToolNames.includes('record_invoice')) return false;
    if (!INVOICE_REQUEST_RE.test(args.latestUserMessage)) return false;
    return APPROVAL_CLAIM_RE.test(args.finalText);
}

export function shouldRecoverMissingApproval(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
}): boolean {
    if (args.usedToolNames.some((name) => MUTATING_TOOL_NAMES.has(name))) return false;
    if (!WRITE_REQUEST_RE.test(args.latestUserMessage)) return false;
    return APPROVAL_CLAIM_RE.test(args.finalText);
}

export function shouldRecoverMissingDocumentSelection(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
    allowedToolNames: string[];
}): boolean {
    if (args.usedToolNames.includes('select_project_documents')) return false;
    if (!args.allowedToolNames.includes('select_project_documents')) return false;
    if (!DOCUMENT_SELECTION_REQUEST_RE.test(args.latestUserMessage)) return false;
    return DOCUMENT_SELECTION_CLAIM_RE.test(args.finalText);
}

export function shouldRecoverWriteRefusal(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
    allowedToolNames: string[];
}): boolean {
    if (args.usedToolNames.includes('select_project_documents')) return false;
    if (args.usedToolNames.some((name) => MUTATING_TOOL_NAMES.has(name))) return false;
    if (!WRITE_REFUSAL_RE.test(args.finalText)) return false;
    if (DOCUMENT_SELECTION_REQUEST_RE.test(args.latestUserMessage)) {
        return args.allowedToolNames.includes('select_project_documents');
    }
    if (ADDENDUM_REQUEST_RE.test(args.latestUserMessage)) {
        return args.allowedToolNames.includes('create_addendum');
    }
    if (!WRITE_REQUEST_RE.test(args.latestUserMessage)) return false;
    return args.allowedToolNames.some((name) => MUTATING_TOOL_NAMES.has(name));
}

function missingDocumentSelectionRecoveryPrompt(): string {
    return (
        'You told the user documents were selected, but select_project_documents was not called. ' +
        'Do not answer in prose. Call select_project_documents now. ' +
        'For "mech", "mechanical", "mechanical services", or "HVAC" documents, use disciplineOrTrade="Mechanical" and mode="replace" unless the user asked to add/remove. ' +
        'If the tool returns zero selected documents, ask one concise clarifying question.'
    );
}

function missingApprovalRecoveryPrompt(): string {
    return (
        'You told the user a change is awaiting approval, but no mutating approval-gated tool call was made. ' +
        'Do not answer in prose. Call the appropriate mutating tool now using the data already supplied or read in this run. ' +
        'Use record_invoice for invoices/progress claims; start_issue_variation_workflow for variation requests that imply cost, programme, note, or correspondence follow-through; create_variation/action_finance_variations_create or update_variation for standalone variations; ' +
        'for create_variation/action_finance_variations_create, use costLineReference and disciplineOrTrade when the user supplied labels instead of an id; ' +
        'create_addendum for stakeholder addenda and attached transmittal documents; ' +
        'create_risk or update_risk for risks; attach_documents_to_note, create_note, or update_note for notes; ' +
        'create_meeting for meeting records; ' +
        'set_project_objectives/action_planning_objectives_set for project brief/objective rows; ' +
        'list_stakeholders then update_stakeholder for RFT brief content because the RFT Brief section is stored on the stakeholder briefServices/briefDeliverables fields; ' +
        'create_cost_line or update_cost_line/action_finance_cost_plan_update_line for cost lines; update_program_activity/action_program_activity_update, create_program_milestone, or update_program_milestone for programme changes; ' +
        'update_stakeholder for stakeholder/contact changes. ' +
        'If you cannot call the right mutating tool because a required field is missing, ask one concise clarifying question and explicitly say no approval card has been created yet.'
    );
}

function writeRefusalRecoveryPrompt(latestUserMessage: string): string {
    if (isIssueVariationWorkflowRequest(latestUserMessage)) {
        return (
            'You refused or drifted from an issue-variation workflow request, but this agent can prepare it through start_issue_variation_workflow. ' +
            'Do not use create_note, create_variation, update_cost_line, or update_program_activity directly for this request. ' +
            'Do not answer in prose. Use read tools to resolve the cost line and programme activity if possible, then call start_issue_variation_workflow. ' +
            'If a required mapping is genuinely ambiguous, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (DOCUMENT_SELECTION_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused a document-selection request, but this agent can select project documents in the current UI. ' +
            'Do not answer in prose and do not hand this to a Document Controller or Admin Agent. ' +
            'Call select_project_documents now. For "mech", "mechanical", "mechanical services", or "HVAC" documents, use disciplineOrTrade="Mechanical" and mode="replace" unless the user asked to add/remove. ' +
            'If the tool returns zero selected documents, ask one concise clarifying question.'
        );
    }

    if (RFT_REQUEST_RE.test(latestUserMessage) && !NOTE_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused or drifted from an RFT content request, but this agent can propose RFT brief updates through the stakeholder brief fields. ' +
            'Do not use create_note, update_note, attach_documents_to_note, or create_addendum. ' +
            'Do not answer in prose. Use list_stakeholders with stakeholderGroup="consultant" to resolve the relevant stakeholder, then call update_stakeholder with briefServices and/or briefDeliverables. ' +
            'If the stakeholder cannot be resolved, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (NOTE_REQUEST_RE.test(latestUserMessage) && !ADDENDUM_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused or drifted from a note request, but this agent has approval-gated note tools. ' +
            'Do not use create_addendum. Do not answer in prose. ' +
            'Use attach_documents_to_note for existing note attachment requests because it can resolve a note title and a document discipline/filter in one approval. ' +
            'For new notes with attachments, call create_note with documentIds. ' +
            'If the note or documents cannot be found, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (ADDENDUM_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused or handed off an addendum request, but this agent has an approval-gated create_addendum tool. ' +
            'Do not answer in prose and do not hand this to a Document Controller or Admin Agent. ' +
            'Treat any earlier refusal or handoff in the conversation as outdated. ' +
            'For consultant addenda, use list_stakeholders with stakeholderGroup="consultant" to resolve the recipient. ' +
            'For "all mechanical documents" or similar, use list_project_documents with disciplineOrTrade set to the discipline and includeDocuments=true. ' +
            'Then call create_addendum with stakeholderId, content, and documentIds. ' +
            'If the stakeholder or documents cannot be found, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    return (
        'You refused a write request, but this agent has approval-gated tools for this workflow. ' +
        'Do not answer in prose. Use the appropriate read tools to resolve current ids, then call the correct mutating tool. ' +
        'If required information is missing, ask one concise clarifying question and explicitly say no approval card has been created yet.'
    );
}

export function guardToolAgainstLatestIntent(args: {
    latestUserMessage: string;
    toolName: string;
}): void {
    if (
        isIssueVariationWorkflowRequest(args.latestUserMessage) &&
        args.toolName !== 'start_issue_variation_workflow' &&
        ISSUE_VARIATION_DIRECT_WRITE_TOOL_NAMES.has(args.toolName)
    ) {
        throw new Error(
            'This is an issue-variation workflow request. Do not satisfy it with a direct note, variation, cost, or programme mutation. ' +
                'Use read tools to resolve the current cost/programme context, then call start_issue_variation_workflow so the user receives the dependency-aware workflow approvals.'
        );
    }

    if (
        RFT_REQUEST_RE.test(args.latestUserMessage) &&
        !NOTE_REQUEST_RE.test(args.latestUserMessage) &&
        NOTE_TOOL_NAMES.has(args.toolName)
    ) {
        throw new Error(
            'This is an RFT content request, not a note request. Do not use create_note, update_note, or attach_documents_to_note. ' +
                'Resolve the relevant consultant with list_stakeholders, then use update_stakeholder to update the RFT Brief fields (briefServices and/or briefDeliverables).'
        );
    }
    if (
        RFT_REQUEST_RE.test(args.latestUserMessage) &&
        !ADDENDUM_REQUEST_RE.test(args.latestUserMessage) &&
        args.toolName === 'create_addendum'
    ) {
        throw new Error(
            'This is an RFT content request, not an addendum request. Do not use create_addendum. ' +
                'Resolve the relevant consultant with list_stakeholders, then use update_stakeholder to update the RFT Brief fields (briefServices and/or briefDeliverables).'
        );
    }
    if (
        args.toolName === 'create_addendum' &&
        NOTE_REQUEST_RE.test(args.latestUserMessage) &&
        !ADDENDUM_REQUEST_RE.test(args.latestUserMessage)
    ) {
        throw new Error(
            'This is a note request, not an addendum request. Do not use create_addendum. ' +
                'Use attach_documents_to_note for existing notes, or create_note for new notes. ' +
                'For "all mechanical documents" on an existing note, call attach_documents_to_note with noteTitle and disciplineOrTrade="Mechanical".'
        );
    }
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
        viewContext: args.viewContext ?? null,
    };

    emitChatEvent(args.threadId, { type: 'run_started', runId, agentName: agent.name });
    const triggeringUserText = latestUserText(args.history);

    // 2. Build system prompt with a Phase 2 project-memory snapshot.
    const assembledContext = await buildAgentContext({
        projectId: args.projectId,
        task: triggeringUserText || 'Agent conversation',
        modules: agent.contextModules ?? DEFAULT_AGENT_CONTEXT_MODULES,
    });
    const viewContextPrompt = formatChatViewContextForPrompt(args.viewContext);
    const system = [agent.buildSystemPrompt({ assembledContext }), viewContextPrompt]
        .filter(Boolean)
        .join('\n\n');

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
    const approvalToolNames: string[] = [];
    const workflowNoApprovalSummaries: string[] = [];

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
                    (shouldRecoverMissingInvoiceApproval({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                    }) ||
                        shouldRecoverMissingApproval({
                            latestUserMessage: triggeringUserText,
                            finalText,
                            usedToolNames,
                        }) ||
                        shouldRecoverMissingDocumentSelection({
                            latestUserMessage: triggeringUserText,
                            finalText,
                            usedToolNames,
                            allowedToolNames: agent.allowedTools,
                        }) ||
                        shouldRecoverWriteRefusal({
                            latestUserMessage: triggeringUserText,
                            finalText,
                            usedToolNames,
                            allowedToolNames: agent.allowedTools,
                        })) &&
                    turn < MAX_TURNS
                ) {
                    let recoveryPrompt = missingApprovalRecoveryPrompt();
                    if (shouldRecoverWriteRefusal({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                        allowedToolNames: agent.allowedTools,
                    })) {
                        recoveryPrompt = writeRefusalRecoveryPrompt(triggeringUserText);
                    } else if (shouldRecoverMissingDocumentSelection({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                        allowedToolNames: agent.allowedTools,
                    })) {
                        recoveryPrompt = missingDocumentSelectionRecoveryPrompt();
                    }

                    messages.push({
                        role: 'user',
                        content: recoveryPrompt,
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
                    guardToolAgainstLatestIntent({
                        latestUserMessage: triggeringUserText,
                        toolName: tu.name,
                    });
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
                    usedToolNames.push(tu.name);
                    const durationMs = Date.now() - start;
                    const approvalCount = def.mutating ? approvalCardCount(output) : 0;
                    if (def.mutating && workflowHasNoApprovalCards(output)) {
                        const failedSummaries = workflowFailedStepSummaries(output);
                        workflowNoApprovalSummaries.push(
                            failedSummaries.length > 0
                                ? failedSummaries.join(' ')
                                : 'The workflow completed without creating any approval cards.'
                        );
                    }
                    for (let index = 0; index < approvalCount; index++) {
                        approvalToolNames.push(tu.name);
                    }

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
                    const rawMessage = err instanceof Error ? err.message : String(err);
                    const message = userSafeToolErrorMessage(rawMessage);
                    const isCrossTenant = err instanceof CrossTenantAccessError;

                    await db
                        .update(toolCallsTable)
                        .set({
                            status: 'error',
                            durationMs,
                            error: {
                                message: rawMessage,
                                userMessage: message,
                                kind: isCrossTenant ? 'cross_tenant' : 'tool_error',
                            },
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
        if (workflowNoApprovalSummaries.length > 0 && approvalToolNames.length === 0) {
            finalText = formatMissingWorkflowApprovalText(workflowNoApprovalSummaries);
        } else {
            finalText = compactApprovalGatedFinalText({
                finalText,
                approvalToolNames,
                workflowNoApprovalSummaries,
            });
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
    modules: readonly ModuleName[];
}): Promise<string> {
    return assembleAgentContext(args);
}
