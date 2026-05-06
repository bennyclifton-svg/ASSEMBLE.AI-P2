'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Inbox, Loader2, Mail, Paperclip, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    CORRESPONDENCE_TYPES,
    type CorrespondenceType,
    type CorrespondenceView,
    type ProjectInboxView,
} from '@/types/correspondence';
import { cn } from '@/lib/utils';

interface CorrespondencePanelProps {
    projectId: string;
}

const TYPE_LABELS: Record<CorrespondenceType, string> = {
    rfi_response: 'RFI response',
    tender_submission: 'Tender submission',
    consultant_query: 'Consultant query',
    council_correspondence: 'Council',
    contractor_correspondence: 'Contractor',
    client_correspondence: 'Client',
    general: 'General',
};

function formatDate(value: string | null): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CorrespondencePanel({ projectId }: CorrespondencePanelProps) {
    const [inbox, setInbox] = useState<ProjectInboxView | null>(null);
    const [items, setItems] = useState<CorrespondenceView[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);

    const selected = useMemo(
        () => items.find((item) => item.id === selectedId) || items[0] || null,
        [items, selectedId]
    );

    const fetchCorrespondence = useCallback(async (background = false) => {
        if (background) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/correspondence`);
            if (!response.ok) throw new Error('Failed to fetch correspondence');
            const data = await response.json() as {
                inbox: ProjectInboxView;
                correspondence: CorrespondenceView[];
            };
            setInbox(data.inbox);
            setItems(data.correspondence);
            setSelectedId((current) => current || data.correspondence[0]?.id || null);
        } catch (error) {
            console.error('[CorrespondencePanel] Failed to fetch correspondence:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchCorrespondence();
    }, [fetchCorrespondence]);

    const copyAddress = async () => {
        if (!inbox?.emailAddress) return;
        await navigator.clipboard.writeText(inbox.emailAddress);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    const updateType = async (id: string, correspondenceType: CorrespondenceType) => {
        setItems((current) =>
            current.map((item) =>
                item.id === id
                    ? { ...item, correspondenceType, classificationStatus: 'confirmed' }
                    : item
            )
        );

        const response = await fetch(`/api/projects/${projectId}/correspondence/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correspondenceType,
                classificationStatus: 'confirmed',
            }),
        });

        if (!response.ok) {
            await fetchCorrespondence(true);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[var(--color-bg-primary)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-[var(--color-bg-primary)]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-1">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                        <Inbox className="h-4 w-4 text-[var(--color-text-secondary)]" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-medium uppercase text-[var(--color-text-muted)]">
                            Project address
                        </div>
                        <div className="truncate text-sm text-[var(--color-text-primary)]">
                            {inbox?.emailAddress || '-'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={copyAddress}
                        title="Copy address"
                    >
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => fetchCorrespondence(true)}
                        title="Refresh"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                        <Mail className="h-4 w-4" />
                        <span>No correspondence yet</span>
                    </div>
                </div>
            ) : (
                <div className="grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                    <div className="min-w-0 overflow-auto">
                        <table className="w-full table-fixed border-collapse text-sm">
                            <thead className="sticky top-0 z-10 bg-[var(--color-bg-primary)]">
                                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase text-[var(--color-text-muted)]">
                                    <th className="w-28 px-3 py-2 font-medium">Received</th>
                                    <th className="w-44 px-3 py-2 font-medium">From</th>
                                    <th className="px-3 py-2 font-medium">Subject</th>
                                    <th className="w-40 px-3 py-2 font-medium">Type</th>
                                    <th className="w-12 px-3 py-2 font-medium" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={cn(
                                            'h-11 cursor-pointer border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-hover)]',
                                            selected?.id === item.id && 'bg-[var(--color-bg-secondary)]'
                                        )}
                                        onClick={() => setSelectedId(item.id)}
                                    >
                                        <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                                            {formatDate(item.receivedAt)}
                                        </td>
                                        <td className="truncate px-3 py-2 text-[var(--color-text-secondary)]">
                                            {item.fromName || item.fromEmail}
                                        </td>
                                        <td className="truncate px-3 py-2 text-[var(--color-text-primary)]">
                                            {item.subject}
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={item.correspondenceType}
                                                onChange={(event) => updateType(item.id, event.target.value as CorrespondenceType)}
                                                onClick={(event) => event.stopPropagation()}
                                                className="h-7 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-teal)]"
                                                title="Correspondence type"
                                            >
                                                {CORRESPONDENCE_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {TYPE_LABELS[type]}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 text-[var(--color-text-muted)]">
                                            {item.attachmentCount > 0 && (
                                                <span className="inline-flex items-center gap-1 text-xs">
                                                    <Paperclip className="h-3.5 w-3.5" />
                                                    {item.attachmentCount}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex min-w-0 flex-col border-l border-[var(--color-border)]">
                        {selected && (
                            <>
                                <div className="shrink-0 border-b border-[var(--color-border)] p-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="truncate text-base font-medium text-[var(--color-text-primary)]">
                                            {selected.subject}
                                        </div>
                                        <span className={cn(
                                            'shrink-0 rounded-full px-2 py-0.5 text-xs',
                                            selected.classificationStatus === 'confirmed'
                                                ? 'bg-[var(--color-accent-teal-tint)] text-[var(--color-accent-teal)]'
                                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                                        )}>
                                            {selected.classificationStatus}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
                                        <div className="truncate">From: {selected.fromName ? `${selected.fromName} <${selected.fromEmail}>` : selected.fromEmail}</div>
                                        {selected.toEmails.length > 0 && (
                                            <div className="truncate">To: {selected.toEmails.join(', ')}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 overflow-auto p-4">
                                    <div className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">
                                        {selected.bodyText || 'No text body'}
                                    </div>
                                </div>

                                {selected.attachments.length > 0 && (
                                    <div className="shrink-0 border-t border-[var(--color-border)] p-4">
                                        <div className="mb-2 text-xs font-medium uppercase text-[var(--color-text-muted)]">
                                            Attachments
                                        </div>
                                        <div className="space-y-2">
                                            {selected.attachments.map((attachment) => (
                                                <div
                                                    key={attachment.id}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm text-[var(--color-text-primary)]">
                                                            {attachment.originalName}
                                                        </div>
                                                        <div className="text-xs text-[var(--color-text-muted)]">
                                                            {formatBytes(attachment.sizeBytes)}
                                                        </div>
                                                    </div>
                                                    <Paperclip className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
