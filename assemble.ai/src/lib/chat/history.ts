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
    return compactChatRows(rows, MAX_AGENT_HISTORY_MESSAGES).map((row) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content,
    }));
}
