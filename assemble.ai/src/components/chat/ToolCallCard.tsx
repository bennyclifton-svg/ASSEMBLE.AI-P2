'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ToolCallView } from '@/lib/hooks/use-chat-stream';

interface ToolCallCardProps {
    toolCall: ToolCallView;
}

const TOOL_LABELS: Record<string, string> = {
    search_rag: 'Searching documents',
    list_project_documents: 'Reading document repository',
    select_project_documents: 'Selecting documents',
    attach_documents_to_note: 'Attaching documents to note',
    list_cost_lines: 'Reading cost plan',
};

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
    const [expanded, setExpanded] = useState(false);
    const label = TOOL_LABELS[toolCall.name] ?? toolCall.name;

    let icon: React.ReactNode;
    if (toolCall.status === 'running') {
        icon = (
            <Loader2
                size={14}
                className="animate-spin"
                style={{ color: 'var(--color-accent-primary)' }}
            />
        );
    } else if (toolCall.status === 'error') {
        icon = <AlertCircle size={14} style={{ color: 'var(--color-error)' }} />;
    } else {
        icon = <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />;
    }

    return (
        <div
            className="my-1 rounded text-xs"
            style={{
                border: '1px solid var(--color-border-subtle)',
                backgroundColor: 'var(--color-bg-tertiary)',
            }}
        >
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {icon}
                <span className="font-medium">{label}</span>
                {toolCall.status === 'complete' && toolCall.durationMs !== null && (
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {toolCall.durationMs}ms
                    </span>
                )}
                {toolCall.status === 'error' && toolCall.error && (
                    <span style={{ color: 'var(--color-error)' }} className="truncate">
                        — {toolCall.error}
                    </span>
                )}
            </button>
            {expanded && (
                <div
                    className="px-2 py-1.5 font-mono whitespace-pre-wrap break-words"
                    style={{
                        borderTop: '1px solid var(--color-border-subtle)',
                        color: 'var(--color-text-tertiary)',
                        fontSize: 11,
                        lineHeight: 1.4,
                    }}
                >
                    {JSON.stringify(toolCall.input, null, 2)}
                </div>
            )}
        </div>
    );
}
