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
import {
    isIssueVariationWorkflowRequest,
    isRfiReferenceRequest,
    isRfiWriteRequest,
    isTechnicalServicesDocumentReviewRequest,
    isTechnicalServicesQuestion,
} from './intent';
import { guardProjectObjectivesAgainstLatestRequest } from './objective-intent-guard';
import { guardToolAgainstCurrentDocumentSelection } from './selected-document-guard';
import { guardAddendumStakeholderAgainstLatestRequest } from './stakeholder-intent-guard';
import { guardTenderFirmAgainstLatestRequest } from './tender-firm-intent-guard';

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
    /\b(cannot|can't|unable to|not able to|outside my domain|outside this domain|outside my [\w\s-]{0,60}scope|falls outside my domain|requires another|dependency|document controller|admin agent|coordinate with)\b/i;
const DOCUMENT_SELECTION_REFUSAL_RE =
    /\b(cannot|can't|unable to|not able to|not available|not found|couldn't find|could not find|outside my domain|outside this domain|falls outside my domain|requires another|dependency|document controller|admin agent)\b|\bfound\s+no\b|\bno\b[\s\S]{0,80}\b(available|matching|found)\b/i;
const INVOICE_REQUEST_RE =
    /\b(add|record|create|enter|post|allocate|log)\b[\s\S]{0,80}\b(invoice|progress claim|claim)\b/i;
const INVOICE_LOG_READ_REQUEST_RE =
    /\b(summarise|summarize|summary|list|show|report|register|ledger)\b[\s\S]{0,120}\b(invoices?|progress claims?|claims?)\b|\b(invoices?|progress claims?|claims?)\b[\s\S]{0,120}\b(summary|summarise|summarize|list|report|register|ledger|log)\b|\b(log|record)\b[\s\S]{0,40}\b(of|for)\b[\s\S]{0,80}\b(?:all|existing|current)?\s*(invoices?|progress claims?|claims?)\b/i;
const ADDENDUM_TERM = String.raw`(?:addendum|addenda|addendums?|addenumd|adenumd|adendum|addemdum)`;
const ADDENDUM_REQUEST_RE = new RegExp(
    String.raw`\b(create|add|issue|prepare|draft|attach|generate)\b[\s\S]{0,180}\b${ADDENDUM_TERM}\b|\b${ADDENDUM_TERM}\b[\s\S]{0,180}\b(attach|documents?|drawings?|files?|selection|selected set|transmittal|consultants?|contractors?|tenderers?)\b`,
    'i'
);
const TRANSMITTAL_REQUEST_RE =
    /\b(create|add|issue|prepare|draft|save|generate)\b[\s\S]{0,180}\b(transmittals?)\b|\b(transmittals?)\b[\s\S]{0,180}\b(create|add|issue|prepare|draft|save|generate|documents?|drawings?|files?)\b/i;
const NOTE_REQUEST_RE =
    /\b(create|add|record|update|change|edit|attach)\b[\s\S]{0,180}\b(notes?|decision record)\b|\b(notes?|decision record)\b[\s\S]{0,180}\b(attach|documents?|drawings?|files?|update|change|edit)\b/i;
const PROJECT_REPORT_REQUEST_RE =
    /\b(?:pcg|project control group)\b[\s\S]{0,140}\breports?\b|\breports?\b[\s\S]{0,140}\b(?:pcg|project control group)\b|\b(add|create|draft|generate|new|prepare)\b[\s\S]{0,140}\b(?:monthly\s+|project\s+)?reports?\b|\b(?:monthly\s+|project\s+)?reports?\b[\s\S]{0,140}\b(add|create|draft|generate|new|prepare)\b/i;
const RFT_REQUEST_RE =
    /\b(rft|request for tender|tender package|tender document|tender documents)\b/i;
const DOCUMENT_SELECTION_REQUEST_RE =
    /\b(select|tick|check|choose|highlight)\b[\s\S]{0,160}\b(documents?|docs?|drawings?|files?)\b|\b(documents?|docs?|drawings?|files?)\b[\s\S]{0,160}\b(select|tick|checked|highlighted|chosen)\b/i;
const DOCUMENT_SELECTION_CLAIM_RE =
    /\b(selected|selection updated|now selected|successfully selected|have been selected|has been selected|ticked|checked|highlighted)\b/i;
const TENDER_FIRM_REQUEST_RE =
    /\b(add|record|create|enter|post|log|update|change|set|populate|append)\b[\s\S]{0,180}\b(firms?|companies|tenderers?|builders?|contractors?|consultants?)\b[\s\S]{0,180}\b(tender|panel|list)\b|\b(tender|panel|list)\b[\s\S]{0,180}\b(add|record|create|enter|post|log|update|change|set|populate|append|firms?|companies|tenderers?|builders?|contractors?|consultants?)\b/i;
const FIRM_CONTACT_LIST_RE =
    /(?=[\s\S]*\b(?:email|e-mail)\b)(?=[\s\S]*\bphone\b)(?=[\s\S]*\baddress\b)(?=[\s\S]*(?:^\s*\d+\.|\b(?:services|contractors|consultants|mechanical|hvac|builders|pty|ltd)\b))/im;
const WRITE_REQUEST_RE =
    /\b(add|record|create|enter|post|allocate|log|issue|raise|submit|prepare|draft|new|update|change|set|move|populate|generate|redraft|replace|append|attach|increase|decrease|adjust|revise)\b[\s\S]{0,160}\b(invoice|progress claim|claim|budgets?|contract value|contract values|approved contracts?|contract sums?|cost plan|cost plans?|cost line|cost lines|variation|variations|risk|risks|rfi|rfis|request for information|requests for information|note|notes|meeting|meetings|report|reports|programme|program|schedule|activity|activities|milestone|milestones|stakeholder|stakeholders|contact|contacts|objective|objectives|project objective|project objectives|brief|project brief|rft|request for tender|tender package|tender document|tender documents|addendum|addenda|transmittal|transmittals|document|documents|firms?|companies|tenderers?|builders?|contractors?|consultants?|tender panel|tender list)\b/i;
const PROGRAMME_REPLACEMENT_REQUEST_RE =
    /\b(delete|clear|override|replace|reset|regenerate|start over|wipe)\b[\s\S]{0,220}\b(programme|program|schedule|activities?)\b|\b(programme|program|schedule|activities?)\b[\s\S]{0,220}\b(delete|clear|override|replace|reset|regenerate|start over|wipe)\b/i;
const MUTATING_TOOL_NAMES = new Set([
    'update_cost_line',
    'create_cost_line',
    'record_invoice',
    'create_addendum',
    'create_transmittal',
    'create_note',
    'update_note',
    'attach_documents_to_note',
    'create_meeting',
    'create_report',
    'create_rfi',
    'record_rfi_response',
    'attach_rfi_evidence',
    'sync_project_documents_to_ai',
    'create_risk',
    'update_risk',
    'create_variation',
    'start_issue_variation_workflow',
    'update_variation',
    'create_program_activity',
    'update_program_activity',
    'replace_program',
    'create_program_milestone',
    'update_program_milestone',
    'update_rft_brief',
    'update_stakeholder',
    'set_project_objectives',
    'add_tender_firms',
    'start_issue_variation_assessment_revision_workflow',
]);
const NOTE_TOOL_NAMES = new Set(['create_note', 'update_note', 'attach_documents_to_note']);
const PROGRAM_TOOL_NAMES = new Set([
    'create_program_activity',
    'update_program_activity',
    'replace_program',
    'create_program_milestone',
    'update_program_milestone',
]);
const PROGRAMME_INCREMENTAL_TOOL_NAMES = new Set([
    'create_program_activity',
    'update_program_activity',
    'create_program_milestone',
    'update_program_milestone',
]);
const PROGRAM_CONTEXT_RE =
    /\b(programme|program|schedule|activity|activities|milestone|milestones)\b/i;
const ISSUE_VARIATION_DIRECT_WRITE_TOOL_NAMES = new Set([
    'create_variation',
    'update_variation',
    'update_cost_line',
    'create_cost_line',
    'create_program_activity',
    'update_program_activity',
    'create_program_milestone',
    'update_program_milestone',
    'create_note',
    'update_note',
    'attach_documents_to_note',
]);
const PROJECT_EVIDENCE_TOOL_NAMES = new Set(['list_notes', 'list_rfis', 'list_project_documents', 'search_rag']);
const DOCUMENT_INGESTION_QUERY_RE =
    /\b(ingested|ingestion|synced|sync(?:ed|ing)?|rag|ai knowledge|knowledge base|searchable by ai)\b/i;
const UNSUPPORTED_EVIDENCE_ANSWER_RE =
    /\b(cost plan|would be detailed in|refer to the .*consultant|refer this question|no specific information|no specific extractable details|no direct text summary|no relevant references|not found|couldn't find|could not find|uploaded documents|knowledge libraries|technical documentation|specialist'?s detailed input is needed|consultant .*provide .*summary)\b/i;
const UNSYNCED_DOCUMENT_STOP_RE =
    /\b(not yet (?:been )?(?:synced|ingested)|not (?:AI[-/\s]*)?(?:synced|ingested|searchable)|not searchable(?:\/synced)?|not .*AI (?:knowledge|search)|sync(?:ed)? to AI knowledge|need(?:s)? to be (?:synced|ingested)|uploaded and reviewed further|please review these documents)\b/i;
const RFI_CONSULTANT_HANDOFF_RE =
    /\b(?:electrical|mechanical|hydraulic|fire|acoustic|structural|architectural)\s+consultant\s+should\s+confirm\b/i;
const LIGHTING_SCHEDULE_CONTEXT_RE =
    /\b(light(?:ing)?\s+(?:fittings?|fixtures?|schedule|types?|layout)|luminaire schedule|list(?:\s+all)?\s+(?:the\s+)?lights?|lights?\s+in\s+(?:this|the)\s+schedule|fittings? specified)\b/i;
const LIGHTING_PLACEHOLDER_TERMS = [
    /\bled strip lights?\b/i,
    /\bled ceiling panels?\b/i,
    /\bpendant lights?\b/i,
    /\bwall sconces?\b/i,
    /\bbollard lights?\b/i,
];
const LIGHTING_MISSING_DETAIL_RE =
    /\b(?:wattages?|brands?|catalog(?:ue)?|colou?r temperature|supplier|specific [\w\s]{0,40}details)[\s\S]{0,140}\b(?:not listed|not provided|not available|not included|not in the context|need verification|additional specifications)/i;
const LIGHTING_UNSUPPORTED_QUANTITY_RE =
    /\b\d+(?:\.\d+)?\s*(?:units?|meters?|metres?|m)\b/i;
const LIGHTING_GROUPED_CATEGORY_RE =
    /\b(common area lighting|apartment lighting|external lighting)\b/i;
const LIGHTING_ACTION_ITEM_RE =
    /\b(action items?|verify quantities|confirm led types|additional specifications may need verification)\b/i;
const PROJECT_MISMATCH_EVIDENCE_RE =
    /\b(found a relevant|relevant .*specification|different project|project mismatch|appears to be for .*different project|not for .*current project|not for .*lighthouse)\b/i;
const PROJECT_MISMATCH_NON_ANSWER_RE =
    /\b(no direct extract|to answer .*precisely|should provide details|would you like me to search|assist by checking|cannot (?:confirm|determine|answer)|not enough (?:project )?evidence)\b/i;
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
    return plural
        ? "I've put the proposed changes in the approval cards above. Use the buttons on those cards to approve, edit, or reject them."
        : "I've put the proposed change in the approval card above. Use Approve & apply to create it, or Edit/Reject if it needs changing.";
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

function asInputRecord(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
}

function originalUserRequest(text: string): string {
    const marker = 'Original user request:';
    const index = text.lastIndexOf(marker);
    if (index === -1) return text;
    return text.slice(index + marker.length).trim();
}

function countLightingPlaceholderTerms(text: string): number {
    return LIGHTING_PLACEHOLDER_TERMS.reduce(
        (count, pattern) => count + (pattern.test(text) ? 1 : 0),
        0
    );
}

export function looksLikeUngroundedLightingScheduleAnswer(text: string): boolean {
    const placeholderCount = countLightingPlaceholderTerms(text);
    if (placeholderCount === 0) return false;
    if (LIGHTING_MISSING_DETAIL_RE.test(text)) return true;
    if (placeholderCount >= 2 && LIGHTING_ACTION_ITEM_RE.test(text)) return true;
    return (
        placeholderCount >= 3 &&
        LIGHTING_UNSUPPORTED_QUANTITY_RE.test(text) &&
        LIGHTING_GROUPED_CATEGORY_RE.test(text)
    );
}

export function shouldRecoverMissingInvoiceApproval(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
}): boolean {
    if (args.usedToolNames.includes('record_invoice')) return false;
    if (INVOICE_LOG_READ_REQUEST_RE.test(args.latestUserMessage)) return false;
    if (!INVOICE_REQUEST_RE.test(args.latestUserMessage)) return false;
    return APPROVAL_CLAIM_RE.test(args.finalText);
}

export function shouldRecoverMissingApproval(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
}): boolean {
    if (args.usedToolNames.some((name) => MUTATING_TOOL_NAMES.has(name))) return false;
    if (INVOICE_LOG_READ_REQUEST_RE.test(args.latestUserMessage)) return false;
    if (
        !WRITE_REQUEST_RE.test(args.latestUserMessage) &&
        !FIRM_CONTACT_LIST_RE.test(args.latestUserMessage) &&
        !PROJECT_REPORT_REQUEST_RE.test(args.latestUserMessage) &&
        !isRfiReferenceRequest(args.latestUserMessage)
    ) {
        return false;
    }
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
    if (args.usedToolNames.includes('create_transmittal')) return false;
    if (
        TRANSMITTAL_REQUEST_RE.test(args.latestUserMessage) &&
        args.allowedToolNames.includes('create_transmittal') &&
        WRITE_REFUSAL_RE.test(args.finalText)
    ) {
        return true;
    }
    if (args.usedToolNames.includes('select_project_documents')) return false;
    if (args.usedToolNames.some((name) => MUTATING_TOOL_NAMES.has(name))) return false;
    if (
        (TENDER_FIRM_REQUEST_RE.test(args.latestUserMessage) ||
            FIRM_CONTACT_LIST_RE.test(args.latestUserMessage)) &&
        args.allowedToolNames.includes('add_tender_firms') &&
        (WRITE_REFUSAL_RE.test(args.finalText) ||
            /\b(procurement|delivery agent|forward(?:ing)? this request|task for)\b/i.test(args.finalText))
    ) {
        return true;
    }
    if (DOCUMENT_SELECTION_REQUEST_RE.test(args.latestUserMessage)) {
        if (!DOCUMENT_SELECTION_REFUSAL_RE.test(args.finalText)) return false;
        return args.allowedToolNames.includes('select_project_documents');
    }
    if (!WRITE_REFUSAL_RE.test(args.finalText)) return false;
    if (INVOICE_LOG_READ_REQUEST_RE.test(args.latestUserMessage)) {
        return args.allowedToolNames.includes('list_invoices');
    }
    if (ADDENDUM_REQUEST_RE.test(args.latestUserMessage)) {
        return args.allowedToolNames.includes('create_addendum');
    }
    if (isRfiReferenceRequest(args.latestUserMessage)) {
        return (
            args.allowedToolNames.includes('record_rfi_response') ||
            args.allowedToolNames.includes('attach_rfi_evidence') ||
            args.allowedToolNames.includes('sync_project_documents_to_ai')
        );
    }
    if (PROJECT_REPORT_REQUEST_RE.test(args.latestUserMessage)) {
        return args.allowedToolNames.includes('create_report');
    }
    if (
        !WRITE_REQUEST_RE.test(args.latestUserMessage) &&
        !FIRM_CONTACT_LIST_RE.test(args.latestUserMessage)
    ) {
        return false;
    }
    return args.allowedToolNames.some((name) => MUTATING_TOOL_NAMES.has(name));
}

export function shouldRecoverMissingEvidenceSearch(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
    allowedToolNames: string[];
}): boolean {
    const isTechnicalEvidenceRequest =
        isTechnicalServicesQuestion(args.latestUserMessage) ||
        isTechnicalServicesDocumentReviewRequest(args.latestUserMessage);
    const isRfiEvidenceRequest = isRfiReferenceRequest(args.latestUserMessage);
    if (!isTechnicalEvidenceRequest && !isRfiEvidenceRequest) return false;
    if (!args.allowedToolNames.includes('search_rag')) return false;
    if (
        isRfiEvidenceRequest &&
        (args.usedToolNames.includes('sync_project_documents_to_ai') ||
            args.usedToolNames.includes('record_rfi_response'))
    ) {
        return false;
    }
    const unsupportedEvidenceAnswer =
        UNSUPPORTED_EVIDENCE_ANSWER_RE.test(args.finalText) ||
        UNSYNCED_DOCUMENT_STOP_RE.test(args.finalText) ||
        (isRfiEvidenceRequest && RFI_CONSULTANT_HANDOFF_RE.test(args.finalText));
    const evidenceToolUseCount = args.usedToolNames.filter((name) =>
        PROJECT_EVIDENCE_TOOL_NAMES.has(name)
    ).length;
    if (
        isRfiEvidenceRequest &&
        unsupportedEvidenceAnswer &&
        (!args.usedToolNames.includes('search_rag') ||
            (
                args.allowedToolNames.includes('list_project_documents') &&
                !args.usedToolNames.includes('list_project_documents')
            ) ||
            evidenceToolUseCount < 4)
    ) {
        return true;
    }
    if (evidenceToolUseCount === 0) {
        return args.usedToolNames.length === 0 || unsupportedEvidenceAnswer;
    }
    return (
        evidenceToolUseCount < 3 &&
        isTechnicalServicesDocumentReviewRequest(args.latestUserMessage) &&
        unsupportedEvidenceAnswer
    );
}

export function shouldRecoverLightingScheduleGrounding(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
    allowedToolNames: string[];
}): boolean {
    const isLightingScheduleRequest =
        LIGHTING_SCHEDULE_CONTEXT_RE.test(args.latestUserMessage) ||
        (isRfiReferenceRequest(args.latestUserMessage) &&
            LIGHTING_SCHEDULE_CONTEXT_RE.test(args.finalText));

    if (!isLightingScheduleRequest) return false;
    if (!args.allowedToolNames.includes('search_rag')) return false;
    if (
        args.usedToolNames.includes('record_rfi_response') ||
        args.usedToolNames.includes('sync_project_documents_to_ai')
    ) {
        return false;
    }
    if (looksLikeUngroundedLightingScheduleAnswer(args.finalText)) return true;

    const usedEvidenceTools = args.usedToolNames.some((name) =>
        PROJECT_EVIDENCE_TOOL_NAMES.has(name)
    );
    return (
        !usedEvidenceTools &&
        /\b(?:downlights?|exit signs?|light fittings?|fixtures?|led)\b/i.test(args.finalText) &&
        LIGHTING_UNSUPPORTED_QUANTITY_RE.test(args.finalText)
    );
}

export function shouldRecoverEvidenceMismatchNonAnswer(args: {
    latestUserMessage: string;
    finalText: string;
    usedToolNames: string[];
}): boolean {
    if (!isTechnicalServicesQuestion(args.latestUserMessage)) return false;
    if (!args.usedToolNames.some((name) => PROJECT_EVIDENCE_TOOL_NAMES.has(name))) return false;
    return (
        PROJECT_MISMATCH_EVIDENCE_RE.test(args.finalText) &&
        PROJECT_MISMATCH_NON_ANSWER_RE.test(args.finalText)
    );
}

function missingEvidenceSearchRecoveryPrompt(): string {
    return (
        'You answered a technical services/specification or existing-RFI question without sufficiently searching project evidence. ' +
        'Do not answer from the cost plan, general project context, or training knowledge alone. ' +
        'If the user references an existing RFI such as "RFI 001", call list_rfis with query set to that reference, use the returned RFI question and responsible party as the search brief, then call list_project_documents with includeDocuments=true using the discipline and title/topic terms from the RFI. ' +
        'For an electrical lighting RFI, search the document register with disciplineOrTrade="Electrical" and documentName terms like "lighting", "light", and "schedule"; select the likely documentIds with select_project_documents so the document repo highlights them. If likely documents are uploaded but not AI-synced, do not merely tell the user to review or sync them; call sync_project_documents_to_ai with those documentIds and use attach_rfi_evidence when they are clearly relevant to the RFI. ' +
        'If the documents are synced, call search_rag with focused queries such as "light fittings", "lighting schedule", "luminaire schedule", and "electrical lighting layout"; when the evidence is sufficient, call record_rfi_response with the drafted answer and evidence document IDs. ' +
        'If list_project_documents finds likely uploaded documents but search_rag cannot find contents, call sync_project_documents_to_ai and attach_rfi_evidence before ending the turn. Only then explain that the answer can be generated after approval and background sync completes. ' +
        'If the user names a note or review, call list_notes first with includeContent=true and a focused query for that note title. ' +
        'If the user says the document was just ingested, call list_project_documents with aiIngestionStatus="synced", includeDocuments=true, and a title or discipline filter if one is available. ' +
        'Then call search_rag with focused and broad queries for the technical issue, such as hydraulic specification scope, mechanical systems, apartment HVAC, car park exhaust, CO monitoring, major equipment, pumps, tanks, valves, fixtures, meters, hot water, sanitary drainage, stormwater, testing, commissioning, and authority interfaces. ' +
        'For requests asking for cost components or long-lead items, do not search only for those labels; infer likely cost drivers and early-order items from the retrieved technical scope and clearly label them as inferred, not priced. ' +
        'Answer from the returned note content or document excerpts and cite the note title or document name. ' +
        'If neither source returns relevant evidence, say that project evidence was not found and name the search limitation.'
    );
}

function lightingScheduleGroundingRecoveryPrompt(): string {
    return (
        'The lighting schedule/RFI answer appears to use generic or unsupported fitting names or quantities. ' +
        'Re-read project evidence and answer only from retrieved rows. ' +
        'For lighting schedules, extract exact schedule fields as a table with Reference, Type, Location, Watts, Lumens, Supplier, Catalogue Reference, and Source. ' +
        'Do not invent common/apartment/external categories, action items, quantities, suppliers, wattages, or catalogue numbers. ' +
        'Lighting schedules usually define fitting types/specifications; quantities must come from a layout, takeoff, or explicit schedule quantity column. ' +
        'If no quantity is in the evidence, write "Quantity not provided in the lighting schedule." ' +
        'For an existing RFI, if evidence is sufficient, call record_rfi_response with that grounded answer and evidence document IDs; if likely documents are present but not searchable, use the sync/evidence tools instead.'
    );
}

function evidenceMismatchAnswerRecoveryPrompt(): string {
    return (
        'You found relevant project evidence, but it appears to be from a specification or review for a different project. ' +
        'Do not stop at the mismatch and do not ask to search again unless no evidence was returned. ' +
        'Answer the user in two parts: first call out that the source project/name/address appears to differ from the current project and should be treated as reference evidence, not confirmed current-project scope; then answer the technical question directly from the returned evidence. ' +
        'Use specific systems or requirements from the retrieved excerpts, and state that the current Mechanical consultant should confirm whether those same requirements apply to Lighthouse.'
    );
}

function missingDocumentSelectionRecoveryPrompt(): string {
    return (
        'You told the user documents were selected, but select_project_documents was not called. ' +
        'Do not answer in prose. Call select_project_documents now. ' +
        'For "mech", "mechanical", "mechanical services", or "HVAC" documents, use disciplineOrTrade="Mechanical" and mode="replace" unless the user asked to add/remove. ' +
        'For requests like "select drawing CC-20" or "select drawing number A-101", use drawingNumber set to that drawing number. ' +
        'For requests like "select all section drawings", use documentName="section". ' +
        'For topic/title requests like "select all documents about stairs", use documentName set to the topic, such as "stairs". ' +
        'If the tool returns zero selected documents, ask one concise clarifying question.'
    );
}

function missingApprovalRecoveryPrompt(): string {
    return (
        'You told the user a change is awaiting approval, but no mutating approval-gated tool call was made. ' +
        'Do not answer in prose. Call the appropriate mutating tool now using the data already supplied or read in this run. ' +
        'Use record_invoice only for invoices/progress claims; do not create notes or programme milestones for invoice dates, paid status, or allocation wording unless the user explicitly requested those separate artefacts; for record_invoice, use costCategory and costLineReference when the user supplied labels such as "Developer Expenses / Long Service Levy"; start_issue_variation_workflow for variation requests that imply cost, programme, note, or correspondence follow-through; create_variation or update_variation for standalone variations; ' +
        'for create_variation, use costLineReference and disciplineOrTrade when the user supplied labels instead of an id, and use list_cost_lines query rather than section for fuzzy cost-line labels; variation statuses are only Forecast, Approved, Rejected, or Withdrawn; ' +
        'create_addendum for stakeholder addenda and attached transmittal documents; ' +
        'create_transmittal for Notes-section transmittals from selected or filtered documents, or targeted project transmittals when a stakeholder/subcategory is supplied; ' +
        'create_weekly_report_draft for weekly briefing/report drafts that need grounded records, typed RFIs, citations, assumptions, and recommendations; create_report for empty or generic project reports, monthly reports, and PCG (Project Control Group) reports; use list_reports first if the existing report naming/cadence matters; do not treat PCG report as progress claim unless the user explicitly writes "progress claim"; ' +
        'create_risk or update_risk for risks; record_rfi_response for populated answers to existing RFIs; attach_rfi_evidence for RFI evidence links; sync_project_documents_to_ai for approval-gated document AI sync; attach_documents_to_note, create_note, or update_note for notes; ' +
        'create_meeting for meeting records; ' +
        'set_project_objectives for project brief/objective rows, using only the latest explicit objective wording when the user supplies a specific list; ' +
        'add_tender_firms for adding consultant, contractor, builder, or tenderer firms to tender panels/lists; ' +
        'list_stakeholders then update_rft_brief for RFT brief content because the RFT Brief section, first RFT record when missing, and Fee table need one structured proposal; ' +
        'create_cost_line or update_cost_line for cost lines; replace_program for whole-programme replacement requests; create_program_activity, update_program_activity, create_program_milestone, or update_program_milestone for incremental programme changes; ' +
        'update_stakeholder for stakeholder/contact changes. ' +
        'If you cannot call the right mutating tool because a required field is missing, ask one concise clarifying question and explicitly say no approval card has been created yet.'
    );
}

export function writeRefusalRecoveryPrompt(latestUserMessage: string): string {
    if (INVOICE_LOG_READ_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused an invoice register/log request, but this agent can read the project invoice ledger. ' +
            'Do not call record_invoice for this request and do not send the user to accounts. ' +
            'Call list_invoices now, using periodYear and periodMonth when the user supplied a period such as April 2026. ' +
            'Then answer with a concise invoice log table and period totals. If no rows are returned, say there are no invoice records in this project workspace for that period.'
        );
    }

    if (isIssueVariationWorkflowRequest(latestUserMessage)) {
        return (
            'You refused or drifted from an issue-variation workflow request, but this agent can prepare it through start_issue_variation_workflow. ' +
            'Do not use create_note, create_variation, update_cost_line, create_program_activity, or update_program_activity directly for this request. ' +
            'Do not answer in prose. Use read tools to resolve the cost line and programme activity if possible; for cost-line labels, use list_cost_lines query so close labels and typos can match. Use only Forecast, Approved, Rejected, or Withdrawn for variation.status. Do not include costLineUpdate money fields unless the user explicitly asked to update the cost plan, approved contract, contract sum, or budget. Then call start_issue_variation_workflow. ' +
            'If a required mapping is genuinely ambiguous, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (PROGRAMME_REPLACEMENT_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused or drifted from a whole-programme replacement request, but this agent can propose the replacement through replace_program. ' +
            'Do not answer in prose and do not create individual programme activities. ' +
            'Call list_program first to read the current programme, then call replace_program once with the complete replacement activity list. ' +
            'The single approval card should clear the old programme and create the replacement programme.'
        );
    }

    if (TRANSMITTAL_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused or handed off a transmittal request, but this agent can propose transmittals through create_transmittal. ' +
            'Do not answer in prose and do not hand this to Document Control or Procurement. ' +
            'For generic drawing-set transmittals, use destination="note" so the result appears in the Notes section. Use destination="project" only with a resolved stakeholderId or subcategoryId. ' +
            'If the user says "the selection", "current selection", or "selected documents/drawings", use the Current selected document ids from the app view exactly and ignore older chat document filters or names. ' +
            'If the user asked to select documents and create the transmittal, call select_project_documents first when it has not already been called, then use its returned documentIds for create_transmittal. ' +
            'If select_project_documents already returned documentIds in this run, call create_transmittal with destination="note", those exact documentIds, and a concise name. ' +
            'For requests like "create a transmittal for basement drawings", use destination="note" and documentName="basement" if explicit documentIds are not already available. ' +
            'If no matching documents are found, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (isRfiReferenceRequest(latestUserMessage) && !isRfiWriteRequest(latestUserMessage)) {
        return (
            'You refused or drifted from an existing RFI response request, but this agent can resolve typed RFIs and propose updates. ' +
            'Do not answer in prose and do not create a duplicate RFI or a legacy note. ' +
            'Call list_rfis with the RFI reference, then use list_project_documents and search_rag for evidence. Select clearly relevant documentIds with select_project_documents. ' +
            'If likely uploaded documents are not AI-synced, call sync_project_documents_to_ai and use attach_rfi_evidence for clearly relevant source documents. ' +
            'If the evidence is searchable and sufficient, call record_rfi_response with the drafted answer and evidence document IDs so the response is populated in the RFI.'
        );
    }

    if (isRfiWriteRequest(latestUserMessage)) {
        return (
            'You refused or drifted from an RFI drafting request, but this agent can propose typed RFIs through create_rfi. ' +
            'Do not answer in prose and do not create a legacy note. ' +
            'Use list_rfis when existing RFI context could matter, resolve the responsible stakeholder with list_stakeholders where possible, and use list_project_documents or search_rag for material document evidence. ' +
            'Then call create_rfi with the typed RFI title, request/question text, priority, responsibleStakeholderId when known, dueDate only when known, and evidence citations. ' +
            'If a required RFI fact is genuinely ambiguous, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (DOCUMENT_SELECTION_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused a document-selection request, but this agent can select project documents in the current UI. ' +
            'Do not answer in prose and do not hand this to a Document Controller or Admin Agent. ' +
            'Call select_project_documents now. For "mech", "mechanical", "mechanical services", or "HVAC" documents, use disciplineOrTrade="Mechanical" and mode="replace" unless the user asked to add/remove. ' +
            'For requests like "select drawing CC-20" or "select drawing number A-101", use drawingNumber set to that drawing number. ' +
            'For requests like "select all section drawings", use documentName="section". ' +
            'For topic/title requests like "select all documents about stairs", use documentName set to the topic, such as "stairs". ' +
            'If the tool returns zero selected documents, ask one concise clarifying question.'
        );
    }

    if (PROJECT_REPORT_REQUEST_RE.test(latestUserMessage)) {
        if (/\bweekly\b[\s\S]{0,120}\b(briefing|report|draft|status)\b|\b(briefing|report|draft|status)\b[\s\S]{0,120}\bweekly\b/i.test(latestUserMessage)) {
            return (
                'You refused or drifted from a weekly briefing/report draft request, but this agent can propose it through create_weekly_report_draft. ' +
                'Do not answer in prose and do not create only an empty report shell. ' +
                'Call create_weekly_report_draft with any supplied report/reporting-period dates. The draft must remain reviewable and is not issued or sent.'
            );
        }
        return (
            'You refused or drifted from a project-report request, but this agent can propose project reports through create_report. ' +
            'Do not answer in prose and do not hand this to Finance or Document Control. ' +
            'If the user says PCG report, treat PCG as Project Control Group, not progress claim. ' +
            'Call list_reports with query="PCG" if existing PCG naming or cadence is relevant, then call create_report with a concise title, contentsType="standard" unless the user asks for detailed/custom contents, and any supplied report/reporting-period dates. ' +
            'If a required title or date is genuinely ambiguous, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (RFT_REQUEST_RE.test(latestUserMessage) && !NOTE_REQUEST_RE.test(latestUserMessage)) {
        return (
            'You refused or drifted from an RFT content request, but this agent can propose structured RFT brief updates. ' +
            'Do not use create_note, update_note, attach_documents_to_note, or create_addendum. ' +
            'Do not answer in prose. Use list_stakeholders with stakeholderGroup="consultant" to resolve the relevant consultant, then call update_rft_brief with briefServices, briefDeliverables, briefFee, and feeRows when the user requests staged fee lines; it creates the first RFT record if none exists. ' +
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
            'Treat any earlier refusal, handoff, addendum recipient, or addendum name in the conversation as outdated unless the latest request repeats it. ' +
            'For consultant addenda, use list_stakeholders with stakeholderGroup="consultant" to resolve the recipient. If the request names a discipline such as Structural, Mechanical, Electrical, or Hydraulic, match the consultant by disciplineOrTrade/name/role. ' +
            'For contractor, general contractor, builder, or tenderer addenda, use list_stakeholders with stakeholderGroup="contractor" and match the latest contractor recipient. ' +
            'If the user says "the selection", "selected set", or "selected documents/drawings", use the Current selected document ids from the app view exactly and ignore older chat document filters. ' +
            'If the user says "call it X", put X in create_addendum.content. ' +
            'For "all mechanical documents" or similar, use list_project_documents with disciplineOrTrade set to the discipline and includeDocuments=true. ' +
            'Then call create_addendum with stakeholderId, content, and documentIds. ' +
            'If the stakeholder or documents cannot be found, ask one concise clarifying question and explicitly say no approval card has been created yet.'
        );
    }

    if (TENDER_FIRM_REQUEST_RE.test(latestUserMessage) || FIRM_CONTACT_LIST_RE.test(latestUserMessage)) {
        return (
            'You refused or handed off a tender-panel firm request, but this agent can propose tender-panel firms through add_tender_firms. ' +
            'Do not answer in prose and do not hand this to Procurement, Delivery, or Finance. ' +
            'If the latest message is only a list of firm names, addresses, phone numbers, and emails, use the prior tender-panel request in this chat to determine firmType and disciplineOrTrade. ' +
            'Use firmType="consultant" for consultant tender panels and firmType="contractor" for contractor, trade, builder, or tenderer panels. ' +
            'Create one firm object per named company, preserving companyName, address, phone, email, and contactPerson when supplied. ' +
            'If the tender panel cannot be resolved, ask one concise clarifying question and explicitly say no approval card has been created yet.'
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
    input?: unknown;
}): void {
    const latestRequest = originalUserRequest(args.latestUserMessage);

    if (
        args.toolName === 'record_invoice' &&
        (INVOICE_LOG_READ_REQUEST_RE.test(latestRequest) || !INVOICE_REQUEST_RE.test(latestRequest))
    ) {
        throw new Error(
            'The latest request is not an invoice/progress-claim entry. Do not reuse invoice details from earlier chat turns. Use the tool for the current request instead, or ask one concise clarifying question before creating an approval card.'
        );
    }

    if (args.toolName === 'list_project_documents' && DOCUMENT_INGESTION_QUERY_RE.test(args.latestUserMessage)) {
        const input = asInputRecord(args.input);
        if (typeof input.aiIngestionStatus !== 'string' || input.aiIngestionStatus !== 'synced') {
            throw new Error(
                'The user asked about ingested documents, which means documents synced to AI/RAG knowledge, not merely uploaded to the document repository. Call list_project_documents with aiIngestionStatus="synced"; includeDocuments=true when the user asks to list names.'
            );
        }
    }

    if (
        args.toolName === 'record_rfi_response' &&
        isRfiReferenceRequest(latestRequest) &&
        !isRfiWriteRequest(latestRequest)
    ) {
        const input = asInputRecord(args.input);
        const responseText = typeof input.responseText === 'string' ? input.responseText : '';
        if (looksLikeUngroundedLightingScheduleAnswer(responseText)) {
            throw new Error(
                'The RFI response appears to use generic or unsupported lighting schedule content. Re-read the exact project evidence, list only fitting rows that appear in the source, and do not include quantities unless a schedule quantity, layout count, or takeoff evidence supports them.'
            );
        }
    }

    if (
        INVOICE_REQUEST_RE.test(args.latestUserMessage) &&
        NOTE_TOOL_NAMES.has(args.toolName) &&
        !NOTE_REQUEST_RE.test(args.latestUserMessage)
    ) {
        throw new Error(
            'This is an invoice request, not a note request. Use record_invoice for the ledger entry. ' +
                'Do not create a note unless the user explicitly asks for a separate note.'
        );
    }

    if (
        INVOICE_REQUEST_RE.test(args.latestUserMessage) &&
        PROGRAM_TOOL_NAMES.has(args.toolName) &&
        !PROGRAM_CONTEXT_RE.test(args.latestUserMessage)
    ) {
        throw new Error(
            'This is an invoice request, not a programme request. Use record_invoice for the ledger entry. ' +
                'Do not create or update programme milestones from invoice dates or paid status unless the user explicitly asks for a programme change.'
        );
    }

    if (
        PROGRAMME_REPLACEMENT_REQUEST_RE.test(args.latestUserMessage) &&
        PROGRAMME_INCREMENTAL_TOOL_NAMES.has(args.toolName)
    ) {
        throw new Error(
            'This is a whole-programme replacement request, not an incremental programme edit. ' +
                'Call list_program first, then call replace_program once with the complete replacement activity list. ' +
                'Do not create individual programme activities or milestones for this request because the old programme must be cleared in the same approval.'
        );
    }

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
        isRfiWriteRequest(args.latestUserMessage) &&
        NOTE_TOOL_NAMES.has(args.toolName) &&
        !NOTE_REQUEST_RE.test(args.latestUserMessage)
    ) {
        throw new Error(
            'This is an RFI drafting request, not a note request. Use create_rfi for the typed RFI proposal. ' +
                'Do not create a legacy note unless the user explicitly asks for a separate note.'
        );
    }

    if (
        isRfiReferenceRequest(args.latestUserMessage) &&
        !isRfiWriteRequest(args.latestUserMessage) &&
        NOTE_TOOL_NAMES.has(args.toolName) &&
        !NOTE_REQUEST_RE.test(args.latestUserMessage)
    ) {
        throw new Error(
            'This is an existing RFI response request, not a note request. Use list_rfis, project evidence tools, record_rfi_response, attach_rfi_evidence, or sync_project_documents_to_ai as appropriate.'
        );
    }

    if (
        isRfiReferenceRequest(args.latestUserMessage) &&
        !isRfiWriteRequest(args.latestUserMessage) &&
        args.toolName === 'create_rfi'
    ) {
        throw new Error(
            'This request references an existing RFI. Do not create a duplicate RFI; use record_rfi_response or attach_rfi_evidence after resolving the existing RFI.'
        );
    }

    if (
        RFT_REQUEST_RE.test(args.latestUserMessage) &&
        !NOTE_REQUEST_RE.test(args.latestUserMessage) &&
        NOTE_TOOL_NAMES.has(args.toolName)
    ) {
        throw new Error(
            'This is an RFT content request, not a note request. Do not use create_note, update_note, or attach_documents_to_note. ' +
                'Resolve the relevant consultant with list_stakeholders, then use update_rft_brief to update the RFT Brief fields and any requested fee-stage rows.'
        );
    }
    if (
        RFT_REQUEST_RE.test(args.latestUserMessage) &&
        !NOTE_REQUEST_RE.test(args.latestUserMessage) &&
        args.toolName === 'update_stakeholder'
    ) {
        throw new Error(
            'This is an RFT content request. Use update_rft_brief so services, deliverables, fee instructions, and fee-stage rows are proposed together. ' +
                'Do not use plain update_stakeholder for RFT brief content.'
        );
    }
    if (
        RFT_REQUEST_RE.test(args.latestUserMessage) &&
        !ADDENDUM_REQUEST_RE.test(args.latestUserMessage) &&
        args.toolName === 'create_addendum'
    ) {
        throw new Error(
            'This is an RFT content request, not an addendum request. Do not use create_addendum. ' +
                'Resolve the relevant consultant with list_stakeholders, then use update_rft_brief to update the RFT Brief fields and any requested fee-stage rows.'
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

export function guardToolAgainstViewContextIntent(args: {
    latestUserMessage: string;
    toolName: string;
    input: unknown;
    viewContext?: ChatViewContext | null;
}): void {
    guardToolAgainstCurrentDocumentSelection(args);
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
    const system = [agent.buildSystemPrompt({ assembledContext }), buildCurrentDatePrompt(), viewContextPrompt]
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
                        }) ||
                        shouldRecoverMissingEvidenceSearch({
                            latestUserMessage: triggeringUserText,
                            finalText,
                            usedToolNames,
                            allowedToolNames: agent.allowedTools,
                        }) ||
                        shouldRecoverLightingScheduleGrounding({
                            latestUserMessage: triggeringUserText,
                            finalText,
                            usedToolNames,
                            allowedToolNames: agent.allowedTools,
                        }) ||
                        shouldRecoverEvidenceMismatchNonAnswer({
                            latestUserMessage: triggeringUserText,
                            finalText,
                            usedToolNames,
                        })) &&
                    turn < MAX_TURNS
                ) {
                    let recoveryPrompt = missingApprovalRecoveryPrompt();
                    if (shouldRecoverEvidenceMismatchNonAnswer({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                    })) {
                        recoveryPrompt = evidenceMismatchAnswerRecoveryPrompt();
                    } else if (shouldRecoverLightingScheduleGrounding({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                        allowedToolNames: agent.allowedTools,
                    })) {
                        recoveryPrompt = lightingScheduleGroundingRecoveryPrompt();
                    } else if (shouldRecoverMissingEvidenceSearch({
                        latestUserMessage: triggeringUserText,
                        finalText,
                        usedToolNames,
                        allowedToolNames: agent.allowedTools,
                    })) {
                        recoveryPrompt = missingEvidenceSearchRecoveryPrompt();
                    } else if (shouldRecoverWriteRefusal({
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
            const approvalCountBeforeToolDispatch = approvalToolNames.length;

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
                        input: tu.input,
                    });
                    guardProjectObjectivesAgainstLatestRequest({
                        latestUserMessage: triggeringUserText,
                        toolName: tu.name,
                        input: tu.input,
                    });
                    guardToolAgainstViewContextIntent({
                        latestUserMessage: triggeringUserText,
                        toolName: tu.name,
                        input: tu.input,
                        viewContext: ctx.viewContext,
                    });
                    await guardAddendumStakeholderAgainstLatestRequest({
                        latestUserMessage: triggeringUserText,
                        toolName: tu.name,
                        input: tu.input,
                        projectId: ctx.projectId,
                    });
                    guardTenderFirmAgainstLatestRequest({
                        latestUserMessage: triggeringUserText,
                        toolName: tu.name,
                        input: tu.input,
                        history: args.history,
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

            if (approvalToolNames.length > approvalCountBeforeToolDispatch) {
                stopReason = 'awaiting_approval';
                break;
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

function buildCurrentDatePrompt(): string {
    const timeZone = 'Australia/Sydney';
    const parts = new Intl.DateTimeFormat('en-AU', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const today = `${value('year')}-${value('month')}-${value('day')}`;

    return (
        '## Current date\n' +
        `Today is ${today} (${timeZone}). Resolve "today" or "today's date" to ${today} in tool inputs.`
    );
}
