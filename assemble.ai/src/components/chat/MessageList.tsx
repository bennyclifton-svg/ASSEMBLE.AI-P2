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
}

export function MessageList({ messages, activeRun, approvals }: MessageListProps) {
    const endRef = useRef<HTMLDivElement | null>(null);

    const allApprovals = Object.values(approvals);
    const approvalList = allApprovals.filter((approval) => !approval.resolution);
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
        messages.length,
        activeRun?.toolCalls.length,
        activeRun?.isThinking,
        approvalList.length,
        // re-scroll when any approval transitions to a resolved state
        approvalResolutionKey,
    ]);

    return (
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-3">
            {messages.length === 0 && !activeRun && (
                <div
                    className="text-xs text-center mt-6"
                    style={{ color: 'var(--color-text-tertiary)' }}
                >
                    Ask the Finance agent about your cost plan or project documents.
                </div>
            )}

            {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
            ))}

            {activeRun && (
                <div className="flex flex-col gap-1 items-start">
                    <div className="ml-1">
                        <AgentBadge name={activeRun.agentName} />
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

            {approvalList.map((a) => (
                <ApprovalGate key={a.id} approval={a} />
            ))}

            <div ref={endRef} />
        </div>
    );
}
