import type { AgentMessage } from '@/lib/agents/completion';
import type { ChatMessageRole } from '@/lib/db/pg-schema';

export interface ChatHistoryRow {
    role: ChatMessageRole;
    content: string;
    createdAt?: Date | string | null;
}

const MAX_AGENT_HISTORY_MESSAGES = 12;
const MAX_VISIBLE_CHAT_MESSAGES = 10;

const STALE_APPROVAL_CLAIM_RE =
    /^I've put the proposed changes? in the approval cards? above\.$/i;
const STALE_WORKFLOW_FAILURE_PATTERNS = [
    /technical error in the workflow process/i,
    /failed query:\s*insert into\s+"action_invocations"/i,
    /i couldn't create an approval card[\s\S]*action_invocations/i,
    /should i attempt to issue the variation again/i,
    /would you prefer to handle it directly/i,
    /i routed this to finance agent/i,
];
const ISSUE_VARIATION_WORKFLOW_RE =
    /\b(issue|raise|submit|prepare|draft|create|add|record|log)\b[\s\S]{0,120}\bvariations?\b[\s\S]{0,240}\b(cost[-\s]?plan|cost lines?|programme|program|schedule|activities?|project notes?|notes?|link it|linked)\b|\bvariations?\b[\s\S]{0,120}\b(issue|raise|submit|prepare|draft|create|add|record|log)\b[\s\S]{0,240}\b(cost[-\s]?plan|cost lines?|programme|program|schedule|activities?|project notes?|notes?|link it|linked)\b/i;
const VARIATION_WRITE_RE =
    /\b(issue|raise|submit|prepare|draft|create|add|record|log)\b[\s\S]{0,100}\bvariations?\b|\bvariations?\b[\s\S]{0,100}\b(issue|raise|submit|prepare|draft|create|add|record|log)\b/i;
const INVOICE_WRITE_RE =
    /\b(add|record|create|enter|post|allocate|log)\b[\s\S]{0,80}\b(invoice|progress claim|claim)\b/i;
const INVOICE_LOG_READ_RE =
    /\b(summarise|summarize|summary|list|show|report|register|ledger)\b[\s\S]{0,120}\b(invoices?|progress claims?|claims?)\b|\b(invoices?|progress claims?|claims?)\b[\s\S]{0,120}\b(summary|summarise|summarize|list|report|register|ledger|log)\b|\b(log|record)\b[\s\S]{0,40}\b(of|for)\b[\s\S]{0,80}\b(?:all|existing|current)?\s*(invoices?|progress claims?|claims?)\b/i;

function normalizeContent(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isStaleAssistantWorkflowMessage(row: ChatHistoryRow): boolean {
    if (row.role !== 'assistant') return false;
    const content = row.content.trim();
    return (
        STALE_APPROVAL_CLAIM_RE.test(content) ||
        STALE_WORKFLOW_FAILURE_PATTERNS.some((pattern) => pattern.test(content))
    );
}

function compactChatRows<T extends ChatHistoryRow>(rows: T[], maxMessages: number): T[] {
    const cleanRows = rows
        .filter((row) => row.role === 'user' || row.role === 'assistant')
        .filter((row) => row.content.trim().length > 0)
        .filter((row) => !isStaleAssistantWorkflowMessage(row));

    const latestUserIndex = cleanRows.map((row) => row.role).lastIndexOf('user');
    const latestUser = latestUserIndex >= 0 ? cleanRows[latestUserIndex] : null;
    const latestUserKey = latestUser ? normalizeContent(latestUser.content) : null;

    const dedupedRows = cleanRows.filter((row, index) => {
        if (!latestUser || row.role !== 'user' || index === latestUserIndex) return true;
        return normalizeContent(row.content) !== latestUserKey;
    });

    return dedupedRows.slice(-maxMessages);
}

export function buildVisibleChatRows<T extends ChatHistoryRow>(rows: T[]): T[] {
    return compactChatRows(rows, MAX_VISIBLE_CHAT_MESSAGES);
}

export function buildAgentHistoryFromRows(rows: ChatHistoryRow[]): AgentMessage[] {
    const compactRows = compactChatRows(rows, MAX_AGENT_HISTORY_MESSAGES);
    const latestUserIndex = compactRows.map((row) => row.role).lastIndexOf('user');
    const latestUser = latestUserIndex >= 0 ? compactRows[latestUserIndex] : null;
    const currentTurnOnly =
        latestUser &&
        (ISSUE_VARIATION_WORKFLOW_RE.test(latestUser.content) ||
            VARIATION_WRITE_RE.test(latestUser.content) ||
            (INVOICE_WRITE_RE.test(latestUser.content) && !INVOICE_LOG_READ_RE.test(latestUser.content)));
    const modelRows =
        currentTurnOnly
            ? [latestUser]
            : compactRows;

    return modelRows.map((row) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content,
    }));
}
