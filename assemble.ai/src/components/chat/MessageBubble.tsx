'use client';

import { AgentBadge } from './AgentBadge';

export interface ChatMessageView {
    id: string;
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    agentName: string | null;
    createdAt: string | Date | null;
}

interface MessageBubbleProps {
    message: ChatMessageView;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    if (message.role === 'system' || message.role === 'tool') {
        return null;
    }

    return (
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
            {!isUser && message.agentName && (
                <div className="ml-1">
                    <AgentBadge name={message.agentName} />
                </div>
            )}
            <div
                className="max-w-[88%] rounded px-3 py-2 text-sm whitespace-pre-wrap break-words"
                style={
                    isUser
                        ? {
                              backgroundColor: 'var(--color-accent-primary)',
                              color: 'var(--color-on-accent)',
                          }
                        : {
                              backgroundColor: 'var(--color-bg-secondary)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border-subtle)',
                          }
                }
            >
                {message.content}
            </div>
        </div>
    );
}
