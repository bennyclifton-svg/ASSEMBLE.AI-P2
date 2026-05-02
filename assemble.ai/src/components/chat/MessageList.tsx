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

export function MessageList({ messages, activeRun, approvals, pendingStatus }: MessageListProps) {
    const endRef = useRef<HTMLDivElement | null>(null);

    const allApprovals = Object.values(approvals);
    const approvalList = allApprovals;
    const timelineItems = [
        ...messages.map((message, index) => ({
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
            index: messages.length + index,
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
        // block: 'end' aligns the bottom of endRef with the bottom of the
        // scroll container, so the last message and approval cards stay visible.
        // 'instant' (not 'smooth') because smooth schedules rAF frames that
        // never fire when the main thread is blocked on a heavy render — the
        // scroll silently stalls and the approval card stays below the fold.
        endRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
    }, [
        timelineOrderKey,
        activeRun?.toolCalls.length,
        activeRun?.isThinking,
        pendingStatus,
        // re-scroll when any approval transitions to a resolved state
        approvalResolutionKey,
    ]);

    return (
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-3">
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
                        {activeRun.isThinking && (
                            <div className="flex items-center gap-2 text-xs">
                                <Loader2
                                    size={14}
                                    className="animate-spin"
                                    style={{ color: 'var(--color-accent-primary)' }}
                                />
                                <span>Thinking…</span>
                            </div>
                        )}
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

function toTimestamp(value: string | Date | null | undefined): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}
