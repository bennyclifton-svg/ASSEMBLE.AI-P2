'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageBubble, type ChatMessageView } from './MessageBubble';
import { ToolCallCard } from './ToolCallCard';
import { AgentBadge } from './AgentBadge';
import { ApprovalGate } from './ApprovalGate';
import type { ActiveRunView, PendingApprovalView } from '@/lib/hooks/use-chat-stream';

interface MessageListProps {
    messages: ChatMessageView[];
    activeRun: ActiveRunView | null;
    approvals: Record<string, PendingApprovalView>;
    pendingStatus?: string | null;
}

const WORKFLOW_SCAFFOLD_RE =
    /i prepared the contractor variation workflow for review[\s\S]*dependent steps will unlock in order/i;

export function MessageList({ messages, activeRun, approvals, pendingStatus }: MessageListProps) {
    const endRef = useRef<HTMLDivElement | null>(null);

    const allApprovals = Object.values(approvals);
    const approvalList = allApprovals;
    const allApprovalsResolved =
        approvalList.length > 0 && approvalList.every((approval) => approval.resolution);
    const visibleMessages = allApprovalsResolved
        ? messages.filter((message) => !isWorkflowScaffoldMessage(message))
        : messages;
    const timelineItems = [
        ...visibleMessages.map((message, index) => ({
            kind: 'message' as const,
            id: message.id,
            timestamp: toTimestamp(message.createdAt),
            index,
            message,
        })),
        ...approvalList.map((approval, index) => ({
            kind: 'approval' as const,
            id: approval.id,
            timestamp: toTimestamp(approval.createdAt),
            index: visibleMessages.length + index,
            approval,
        })),
    ].sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        return a.index - b.index;
    });
    const timelineOrderKey = timelineItems
        .map((item) => `${item.kind}:${item.id}:${item.timestamp}`)
        .join('|');
    const approvalResolutionKey = allApprovals
        .map((approval) => approval.resolution?.status ?? '')
        .join(',');

    useEffect(() => {
        // Keep the newest message, tool activity, or approval visible.
        endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
    }, [
        timelineOrderKey,
        activeRun?.toolCalls.length,
        activeRun?.isThinking,
        pendingStatus,
        approvalResolutionKey,
    ]);

    return (
        <div className="flex-1 overflow-y-auto px-1.5 py-2 flex flex-col gap-3">
            {messages.length === 0 && !activeRun && !pendingStatus && approvalList.length === 0 && (
                <div
                    className="text-xs text-center mt-6"
                    style={{ color: 'var(--color-text-tertiary)' }}
                >
                    Ask about cost, programme, documents, or any project decision.
                </div>
            )}

            {timelineItems.map((item) =>
                item.kind === 'message' ? (
                    <MessageBubble key={`message-${item.id}`} message={item.message} />
                ) : (
                    <ApprovalGate key={`approval-${item.id}`} approval={item.approval} />
                )
            )}

            {pendingStatus && !activeRun && (
                <div className="flex flex-col gap-1 items-start" data-testid="chat-pending-status">
                    <div className="ml-1">
                        <AgentBadge name="Project Assistant" />
                    </div>
                    <div
                        className="max-w-[88%] rounded px-3 py-2 text-sm w-full"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-subtle)',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        <div className="flex items-center gap-2 text-xs">
                            <Loader2
                                size={14}
                                className="animate-spin"
                                style={{ color: 'var(--color-accent-primary)' }}
                            />
                            <span>{pendingStatus}</span>
                        </div>
                    </div>
                </div>
            )}

            {activeRun && (
                <div className="flex flex-col gap-1 items-start">
                    <div className="ml-1">
                        <AgentBadge name="Project Assistant" />
                    </div>
                    <div
                        className="max-w-[88%] rounded px-3 py-2 text-sm w-full"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-subtle)',
                            color: 'var(--color-text-secondary)',
                        }}
                    >
                        <div className="flex items-start gap-2 text-xs">
                            <Loader2
                                size={14}
                                className="animate-spin mt-0.5"
                                style={{ color: 'var(--color-accent-primary)' }}
                            />
                            <div className="min-w-0">
                                <div style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                                    {activeRunStatus(activeRun)}
                                </div>
                                <div style={{ color: 'var(--color-text-tertiary)' }}>
                                    {activeRunDetail(activeRun)}
                                </div>
                            </div>
                        </div>
                        {activeRun.toolCalls.map((tc) => (
                            <ToolCallCard key={tc.id} toolCall={tc} />
                        ))}
                    </div>
                </div>
            )}

            <div ref={endRef} />
        </div>
    );
}

function isWorkflowScaffoldMessage(message: ChatMessageView): boolean {
    return message.role === 'assistant' && WORKFLOW_SCAFFOLD_RE.test(message.content);
}

function toTimestamp(value: string | Date | null | undefined): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function activeRunStatus(activeRun: ActiveRunView): string {
    if (activeRun.toolCalls.length === 0) {
        return 'Reading your request and choosing the first step';
    }
    const running = activeRun.toolCalls.find((toolCall) => toolCall.status === 'running');
    if (running) return 'Working through the next project command';
    if (activeRun.isThinking) return 'Reading the results and deciding what to do next';
    return 'Working through the request';
}

function activeRunDetail(activeRun: ActiveRunView): string {
    const total = activeRun.toolCalls.length;
    if (total === 0) return 'No project data has been changed yet.';
    const completed = activeRun.toolCalls.filter((toolCall) => toolCall.status === 'complete').length;
    const failed = activeRun.toolCalls.filter((toolCall) => toolCall.status === 'error').length;
    const running = activeRun.toolCalls.filter((toolCall) => toolCall.status === 'running').length;
    const parts = [`${completed}/${total} step${total === 1 ? '' : 's'} complete`];
    if (running > 0) parts.push(`${running} running`);
    if (failed > 0) parts.push(`${failed} needs attention`);
    return parts.join(' - ');
}
