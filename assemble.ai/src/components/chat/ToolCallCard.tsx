'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ToolCallView } from '@/lib/hooks/use-chat-stream';

interface ToolCallCardProps {
    toolCall: ToolCallView;
}

const TOOL_LABELS: Record<string, string> = {
    list_rfis: 'Checking RFI register',
    search_rag: 'Searching documents',
    list_project_documents: 'Reading document repository',
    select_project_documents: 'Selecting documents',
    sync_project_documents_to_ai: 'Preparing AI document sync',
    attach_rfi_evidence: 'Preparing RFI evidence links',
    record_rfi_response: 'Drafting RFI response',
    attach_documents_to_note: 'Attaching documents to note',
    list_cost_lines: 'Reading cost plan',
    create_variation: 'Preparing variation approval',
    record_invoice: 'Preparing invoice approval',
    create_note: 'Preparing note approval',
};

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
    const [expanded, setExpanded] = useState(false);
    const label = TOOL_LABELS[toolCall.name] ?? toolCall.name;
    const description = describeToolCall(toolCall);
    const statusText = statusLabel(toolCall);

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
                className="w-full flex items-start gap-2 px-2 py-1.5 text-left"
                style={{ color: 'var(--color-text-secondary)' }}
            >
                <span className="mt-0.5">
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                <span className="mt-0.5">{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{label}</span>
                        <span
                            className="shrink-0"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            {statusText}
                        </span>
                    </span>
                    {description && (
                        <span
                            className="block mt-0.5"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            {description}
                        </span>
                    )}
                    {toolCall.status === 'error' && toolCall.error && (
                        <span style={{ color: 'var(--color-error)' }} className="block truncate">
                            {toolCall.error}
                        </span>
                    )}
                </span>
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
                    {toolCall.name}
                    {'\n'}
                    {JSON.stringify(toolCall.input, null, 2)}
                </div>
            )}
        </div>
    );
}

function statusLabel(toolCall: ToolCallView): string {
    if (toolCall.status === 'running') return 'In progress';
    if (toolCall.status === 'error') return 'Needs attention';
    return toolCall.durationMs !== null ? `Done in ${toolCall.durationMs}ms` : 'Done';
}

function describeToolCall(toolCall: ToolCallView): string {
    const input = asRecord(toolCall.input);
    switch (toolCall.name) {
        case 'list_rfis': {
            const query = stringValue(input, 'query') || stringValue(input, 'rfiNumber') || stringValue(input, 'reference');
            return query ? `Looking up ${query}.` : 'Finding the relevant RFI and its current status.';
        }
        case 'list_project_documents':
            return describeDocumentSearch(input);
        case 'search_rag': {
            const query = stringValue(input, 'query');
            return query ? `Searching synced AI knowledge for "${truncate(query, 90)}".` : 'Searching synced AI knowledge.';
        }
        case 'select_project_documents': {
            const count = arrayCount(input, 'documentIds');
            return count > 0
                ? `Selecting ${count} document${count === 1 ? '' : 's'} in the repository.`
                : 'Updating the visible document selection.';
        }
        case 'sync_project_documents_to_ai': {
            const count = arrayCount(input, 'documentIds');
            const setName = stringValue(input, 'documentSetName');
            const scope = count > 0
                ? `${count} document${count === 1 ? '' : 's'}`
                : 'the matching documents';
            return `Preparing to sync ${scope}${setName ? ` into ${setName}` : ''}.`;
        }
        case 'attach_rfi_evidence': {
            const count = arrayCount(input, 'documentIds');
            return count > 0
                ? `Preparing to attach ${count} source document${count === 1 ? '' : 's'} to the RFI.`
                : 'Preparing source evidence links for the RFI.';
        }
        case 'record_rfi_response': {
            const ref = stringValue(input, 'rfiNumber') || stringValue(input, 'reference') || stringValue(input, 'rfiId');
            return ref ? `Preparing the response for ${ref}.` : 'Preparing the RFI response form update.';
        }
        case 'list_cost_lines':
            return 'Checking the latest cost plan rows before proposing a change.';
        case 'record_invoice':
            return 'Validating invoice details and preparing the approval card.';
        case 'create_variation':
            return 'Building the proposed variation record for approval.';
        default:
            return 'Running this project command in the background.';
    }
}

function describeDocumentSearch(input: Record<string, unknown>): string {
    const filters = [
        stringValue(input, 'disciplineOrTrade'),
        stringValue(input, 'categoryName'),
        stringValue(input, 'subcategoryName'),
        stringValue(input, 'documentName'),
        stringValue(input, 'drawingNumber'),
        stringValue(input, 'query'),
    ].filter(Boolean);
    if (filters.length === 0) return 'Looking through the uploaded project documents.';
    return `Looking through uploaded documents for ${filters.map((item) => `"${truncate(item, 40)}"`).join(', ')}.`;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function stringValue(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}

function arrayCount(record: Record<string, unknown>, key: string): number {
    const value = record[key];
    return Array.isArray(value) ? value.length : 0;
}

function truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}
