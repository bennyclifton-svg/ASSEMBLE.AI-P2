'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Copy,
    Loader2,
    Mail,
    MessageSquare,
    Paperclip,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProcurementIconButton } from '@/components/procurement';
import {
    CORRESPONDENCE_TYPES,
    type CorrespondenceType,
    type CorrespondenceView,
    type ProjectInboxView,
} from '@/types/correspondence';
import { cn } from '@/lib/utils';

interface CorrespondencePanelProps {
    projectId: string;
    projectName?: string;
}

type VariationTriageView = NonNullable<CorrespondenceView['variationTriage']>;
type VariationTraceView = VariationTriageView['trace'];

interface CorrespondenceThreadView {
    id: string;
    subject: string;
    messages: CorrespondenceView[];
    latest: CorrespondenceView;
    latestAt: number;
    attachmentCount: number;
    variationCount: number;
    correspondenceType: CorrespondenceType;
    accent: string;
}

const muted = 'var(--sw-muted)';

const TYPE_LABELS: Record<CorrespondenceType, string> = {
    rfi_response: 'RFI response',
    tender_submission: 'Tender submission',
    consultant_query: 'Consultant query',
    council_correspondence: 'Council',
    contractor_correspondence: 'Contractor',
    client_correspondence: 'Client',
    general: 'General',
};

const TYPE_ACCENTS: Record<CorrespondenceType, string> = {
    rfi_response: 'var(--sw-cyan)',
    tender_submission: 'var(--sw-peach)',
    consultant_query: 'var(--sw-lav)',
    council_correspondence: 'var(--sw-cyan)',
    contractor_correspondence: 'var(--sw-rose)',
    client_correspondence: 'var(--sw-peach)',
    general: 'var(--sw-muted)',
};

const TRIAGE_STATUS_LABELS: Record<VariationTriageView['status'], string> = {
    auto_triaged: 'Workflow prepared',
    needs_classification: 'Review needed',
    not_candidate: 'Not a claim',
};

const TRIAGE_COMPLETENESS_LABELS: Record<VariationTriageView['completeness'], string> = {
    complete_enough: 'Complete enough',
    missing_information: 'Needs particulars',
};

const TRACE_SOURCE_LABELS: Record<VariationTraceView['source'], string> = {
    inbound_email: 'Inbound email',
    manual_entry: 'Manual entry',
    unknown: 'Unknown',
};

const TRACE_TRIGGER_LABELS: Record<VariationTraceView['trigger'], string> = {
    auto_triage: 'Auto-triage',
    manual_review: 'Manual review',
    unknown: 'Unknown',
};

const TRACE_DRAFTING_LABELS: Record<VariationTraceView['draftingMode'], string> = {
    deterministic_delivery_lite_template: 'Delivery-lite template',
    llm_assisted_delivery_template: 'LLM-assisted template',
    llm_generated: 'LLM generated',
    manual: 'Manual',
    none: 'None',
};

const labelStyle: CSSProperties = {
    fontFamily: 'var(--sw-font-mono)',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'lowercase',
    color: muted,
    fontWeight: 600,
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

function getMessageTime(item: CorrespondenceView): number {
    const value = item.receivedAt || item.sentAt;
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(cents: number | null): string {
    if (cents === null) return '-';
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

function formatConfidence(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function formatAgentName(value: string): string {
    if (value === 'delivery') return 'Delivery';
    return value;
}

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function messageDateLabel(item: CorrespondenceView): string {
    return item.receivedAt ? 'Received' : 'Sent';
}

function pluralise(value: number, singular: string, plural = `${singular}s`): string {
    return `${value} ${value === 1 ? singular : plural}`;
}

function buildCorrespondenceThreads(items: CorrespondenceView[]): CorrespondenceThreadView[] {
    const groups = new Map<string, CorrespondenceView[]>();

    items.forEach((item) => {
        const key = item.threadId || item.id;
        const current = groups.get(key) || [];
        current.push(item);
        groups.set(key, current);
    });

    return Array.from(groups.entries())
        .map(([id, messages]) => {
            const sortedMessages = [...messages].sort((a, b) => getMessageTime(a) - getMessageTime(b));
            const latest = sortedMessages[sortedMessages.length - 1];

            if (!latest) return null;

            const attachmentCount = sortedMessages.reduce((total, item) => total + item.attachmentCount, 0);
            const variationCount = sortedMessages.filter(
                (item) => item.variationTriage?.classification === 'variation_claim'
            ).length;

            return {
                id,
                subject: latest.normalizedSubject || latest.subject || 'Untitled thread',
                messages: sortedMessages,
                latest,
                latestAt: getMessageTime(latest),
                attachmentCount,
                variationCount,
                correspondenceType: latest.correspondenceType,
                accent: TYPE_ACCENTS[latest.correspondenceType],
            };
        })
        .filter((thread): thread is CorrespondenceThreadView => thread !== null)
        .sort((a, b) => b.latestAt - a.latestAt || a.subject.localeCompare(b.subject));
}

function CorrespondenceBreadcrumb({
    projectName,
    activeLabel,
}: {
    projectName: string;
    activeLabel: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 12,
                color: muted,
            }}
        >
            <span className="shrink-0">{slugifyProjectName(projectName)}</span>
            <span className="shrink-0" style={{ opacity: 0.5 }}>/</span>
            <span className="shrink-0" style={{ color: 'var(--sw-ink)' }}>correspondence</span>
            <span className="shrink-0" style={{ opacity: 0.5 }}>/</span>
            <span className="truncate" style={{ color: 'var(--sw-ink)' }}>{activeLabel}</span>
        </nav>
    );
}

function CorrespondenceStatusPill({ label, tone }: { label: string; tone?: 'dark' }) {
    const isDark = tone === 'dark';
    return (
        <span
            className="max-w-[220px] truncate"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '4px 10px',
                background: isDark ? 'var(--sw-ink)' : 'var(--sw-paper)',
                border: isDark ? '1px solid var(--sw-ink)' : '1px solid var(--sw-rule)',
                color: isDark ? 'var(--sw-paper)' : 'var(--sw-ink)',
                letterSpacing: '0.02em',
            }}
            title={label}
        >
            {label}
        </span>
    );
}

function CorrespondenceMessageTabs({
    messages,
    activeMessageId,
    onSelectMessage,
}: {
    messages: CorrespondenceView[];
    activeMessageId: string | null;
    onSelectMessage: (id: string) => void;
}) {
    return (
        <div className="procurement-instance-tabs firms-scrollbar min-w-max overflow-x-auto">
            {messages.map((message, index) => {
                const label = String(index + 1).padStart(2, '0');
                const isActive = message.id === activeMessageId;
                const hasWorkflow = message.variationTriage?.classification === 'variation_claim';
                const hasAttachments = message.attachmentCount > 0;
                const title = `${label} - ${formatDate(message.receivedAt || message.sentAt)} - ${message.fromName || message.fromEmail}`;

                return (
                    <button
                        key={message.id}
                        type="button"
                        className="procurement-instance-tab group min-w-[48px] justify-center"
                        data-state={isActive ? 'active' : 'inactive'}
                        onClick={() => onSelectMessage(message.id)}
                        title={title}
                        aria-pressed={isActive}
                    >
                        <span>{label}</span>
                        {(hasWorkflow || hasAttachments) && !isActive ? (
                            <span
                                className={cn(
                                    'absolute right-1 top-1 h-1.5 w-1.5 rounded-full',
                                    hasAttachments ? 'bg-[var(--color-success)]' : 'bg-[var(--sw-cyan)]'
                                )}
                            />
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

export function CorrespondencePanel({ projectId, projectName = 'project' }: CorrespondencePanelProps) {
    const [inbox, setInbox] = useState<ProjectInboxView | null>(null);
    const [items, setItems] = useState<CorrespondenceView[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [reviewingWorkflowId, setReviewingWorkflowId] = useState<string | null>(null);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

    const threads = useMemo(() => buildCorrespondenceThreads(items), [items]);
    const selectedThread = useMemo(
        () => threads.find((thread) => thread.id === selectedThreadId) || threads[0] || null,
        [threads, selectedThreadId]
    );
    const selected = useMemo(
        () =>
            selectedThread?.messages.find((item) => item.id === selectedMessageId) ||
            selectedThread?.latest ||
            null,
        [selectedThread, selectedMessageId]
    );
    const selectedTriage =
        selected?.variationTriage?.classification === 'variation_claim'
            ? selected.variationTriage
            : null;
    const selectedTraceOpen = Boolean(selected && expandedTraceId === selected.id);
    const activeThreadLabel = selectedThread?.subject || 'register';
    const selectedMessageIndex = selectedThread && selected
        ? selectedThread.messages.findIndex((message) => message.id === selected.id)
        : -1;

    useEffect(() => {
        if (threads.length === 0) {
            if (selectedThreadId) setSelectedThreadId(null);
            if (selectedMessageId) setSelectedMessageId(null);
            return;
        }

        const thread = threads.find((item) => item.id === selectedThreadId) || threads[0];
        if (thread.id !== selectedThreadId) {
            setSelectedThreadId(thread.id);
            setSelectedMessageId(thread.latest.id);
            return;
        }

        const messageExists = thread.messages.some((item) => item.id === selectedMessageId);
        if (!messageExists) {
            setSelectedMessageId(thread.latest.id);
        }
    }, [threads, selectedThreadId, selectedMessageId]);

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

    const reviewWorkflow = async () => {
        if (!selected || !selectedTriage?.workflowRunId || reviewingWorkflowId) return;
        setReviewError(null);
        setReviewingWorkflowId(selectedTriage.workflowRunId);
        try {
            const response = await fetch(
                `/api/projects/${projectId}/correspondence/${selected.id}/variation-workflow/review`,
                { method: 'POST' }
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.error || `Review failed (${response.status})`);
            }
            window.dispatchEvent(
                new CustomEvent('assemble:open-chat-thread', {
                    detail: {
                        projectId,
                        threadId: data.threadId,
                        threadTitle: data.threadTitle,
                    },
                })
            );
            await fetchCorrespondence(true);
        } catch (error) {
            setReviewError(error instanceof Error ? error.message : 'Failed to open workflow');
        } finally {
            setReviewingWorkflowId(null);
        }
    };

    const toggleTrace = () => {
        if (!selected) return;
        setExpandedTraceId((current) => current === selected.id ? null : selected.id);
    };

    const selectThread = (thread: CorrespondenceThreadView) => {
        setSelectedThreadId(thread.id);
        setSelectedMessageId(thread.latest.id);
        setExpandedTraceId(null);
        setReviewError(null);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#F6FAFB]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--sw-muted)]" />
            </div>
        );
    }

    return (
        <div className="procurement-workspace flex h-full min-h-0 flex-col overflow-hidden bg-[#F6FAFB]">
            <header className="shrink-0 px-2 pt-2">
                <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                    <CorrespondenceBreadcrumb
                        projectName={projectName}
                        activeLabel={activeThreadLabel.toLowerCase()}
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                        <ProcurementIconButton
                            title={copied ? 'Copied project address' : 'Copy project address'}
                            onClick={() => void copyAddress()}
                            disabled={!inbox?.emailAddress}
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </ProcurementIconButton>
                        <ProcurementIconButton
                            title="Refresh correspondence"
                            onClick={() => void fetchCorrespondence(true)}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        </ProcurementIconButton>
                    </div>
                </div>

                <div className="mb-2 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 30,
                                fontWeight: 700,
                                margin: 0,
                                lineHeight: 1.1,
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Correspondence
                        </h1>
                        <div
                            className="truncate"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 12,
                                color: muted,
                                marginTop: 4,
                                minHeight: 18,
                            }}
                            title={inbox?.emailAddress || undefined}
                        >
                            {inbox?.emailAddress || 'project inbox'} - thread register
                        </div>
                    </div>
                </div>
            </header>

            {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-[var(--sw-muted)]">
                        <Mail className="h-4 w-4" />
                        <span>No correspondence yet</span>
                    </div>
                </div>
            ) : (
                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[220px_minmax(0,1fr)] gap-3 overflow-hidden p-2 xl:grid-cols-[380px_minmax(0,1fr)] xl:grid-rows-1">
                    <section
                        className="flex min-h-0 min-w-0 flex-col self-start overflow-hidden"
                        aria-label="Correspondence threads"
                        style={{
                            background: 'rgba(255, 255, 255, 0.72)',
                            border: '1px solid var(--sw-rule)',
                        }}
                    >
                        <div
                            className="grid h-8 grid-cols-[124px_minmax(0,1fr)_86px] items-center border-b border-[var(--sw-rule-2)] px-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.18em',
                                color: 'var(--sw-muted)',
                            }}
                        >
                            <span>type</span>
                            <span>thread</span>
                            <span className="text-right">state</span>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {threads.map((thread) => {
                                const isActive = thread.id === selectedThread?.id;
                                const state = thread.variationCount > 0
                                    ? 'workflow'
                                    : thread.messages.length > 1
                                      ? pluralise(thread.messages.length, 'email')
                                      : 'email';

                                return (
                                    <button
                                        key={thread.id}
                                        type="button"
                                        onClick={() => selectThread(thread)}
                                        className={cn(
                                            'grid h-8 w-full grid-cols-[124px_minmax(0,1fr)_86px] items-center border-b border-l-2 border-[var(--sw-rule-2)] px-3 text-left transition-colors last:border-b-0',
                                            isActive
                                                ? 'border-l-4 bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)]'
                                                : 'bg-transparent hover:bg-[var(--sw-canvas)]'
                                        )}
                                        style={{
                                            borderLeftColor: thread.accent,
                                            fontFamily: 'var(--sw-font-mono)',
                                        }}
                                        aria-pressed={isActive}
                                    >
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <span
                                                aria-hidden="true"
                                                className="h-1.5 w-1.5 shrink-0"
                                                style={{ background: thread.accent }}
                                            />
                                            <span
                                                className={cn(
                                                    'truncate text-[10px] font-semibold',
                                                    isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]',
                                                    isActive && 'font-bold'
                                                )}
                                                title={TYPE_LABELS[thread.correspondenceType]}
                                            >
                                                {TYPE_LABELS[thread.correspondenceType]}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                'truncate px-2 text-[11px]',
                                                isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]',
                                                isActive && 'font-semibold'
                                            )}
                                            title={thread.subject}
                                        >
                                            {thread.subject}
                                        </span>
                                        <span
                                            className={cn(
                                                'flex items-center justify-end gap-1 text-[10px]',
                                                isActive ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'
                                            )}
                                        >
                                            <span className="truncate">{state}</span>
                                            {thread.attachmentCount > 0 && !isActive ? (
                                                <Paperclip className="h-3 w-3 shrink-0" />
                                            ) : null}
                                            {isActive ? <Check className="h-3 w-3 shrink-0 text-[var(--sw-paper)]" /> : null}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section
                        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
                        style={{ background: '#F6FAFB' }}
                        data-testid="correspondence-detail-pane"
                    >
                        {selectedThread && selected ? (
                            <>
                                <header
                                    className="flex h-9 shrink-0 items-center gap-2 px-3"
                                    style={{
                                        background: 'var(--sw-ink)',
                                        color: 'var(--sw-paper)',
                                        borderBottom: '1px solid var(--sw-rule-2)',
                                    }}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="inline-block rounded-full"
                                        style={{ width: 8, height: 8, background: selectedThread.accent }}
                                    />
                                    <span
                                        className="min-w-0 truncate text-[10px] font-semibold uppercase"
                                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.18em' }}
                                    >
                                        Correspondence thread
                                    </span>
                                    <span
                                        className="ml-auto truncate text-[10px]"
                                        style={{ fontFamily: 'var(--sw-font-mono)', color: 'rgba(232,228,218,0.6)' }}
                                    >
                                        {pluralise(selectedThread.messages.length, 'email')} - {pluralise(selectedThread.attachmentCount, 'attachment')}
                                    </span>
                                </header>

                                <div
                                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                                    style={{
                                        border: '1px solid var(--sw-rule)',
                                        borderTop: 'none',
                                        borderLeft: `3px solid ${selectedThread.accent}`,
                                    }}
                                >
                                <div
                                    className="flex min-w-0 shrink-0 items-center justify-between gap-3 overflow-hidden"
                                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                                >
                                    <div className="min-w-0 flex-1 overflow-x-auto">
                                        <CorrespondenceMessageTabs
                                            messages={selectedThread.messages}
                                            activeMessageId={selected.id}
                                            onSelectMessage={(id) => {
                                                setSelectedMessageId(id);
                                                setExpandedTraceId(null);
                                                setReviewError(null);
                                            }}
                                        />
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 px-3">
                                        <span style={labelStyle}>type</span>
                                        <select
                                            value={selected.correspondenceType}
                                            onChange={(event) => void updateType(selected.id, event.target.value as CorrespondenceType)}
                                            className="h-7 w-44 border border-[var(--sw-rule)] bg-transparent px-2 text-xs text-[var(--sw-ink)] outline-none transition-colors focus:border-[var(--sw-cyan)]"
                                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            title="Correspondence type"
                                        >
                                            {CORRESPONDENCE_TYPES.map((type) => (
                                                <option key={type} value={type}>
                                                    {TYPE_LABELS[type]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                                    <div className="shrink-0 border-b border-[var(--sw-rule-2)] p-4">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-base font-medium text-[var(--sw-ink)]">
                                                    {selected.subject}
                                                </div>
                                                {selectedMessageIndex >= 0 ? (
                                                    <div
                                                        className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--sw-muted)]"
                                                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                    >
                                                        email {String(selectedMessageIndex + 1).padStart(2, '0')} of {String(selectedThread.messages.length).padStart(2, '0')}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <span
                                                className={cn(
                                                    'shrink-0 px-2 py-0.5 text-xs',
                                                    selected.classificationStatus === 'confirmed'
                                                        ? 'bg-[var(--color-accent-teal-tint)] text-[var(--color-accent-teal)]'
                                                        : 'bg-[#F6FAFB] text-[var(--sw-muted)]'
                                                )}
                                            >
                                                {selected.classificationStatus}
                                            </span>
                                        </div>
                                        <div className="grid gap-1 text-xs text-[var(--sw-muted)] md:grid-cols-2">
                                            <div className="truncate">
                                                From: {selected.fromName ? `${selected.fromName} <${selected.fromEmail}>` : selected.fromEmail}
                                            </div>
                                            <div className="truncate">
                                                {messageDateLabel(selected)}: {formatDate(selected.receivedAt || selected.sentAt)}
                                            </div>
                                            {selected.toEmails.length > 0 ? (
                                                <div className="truncate md:col-span-2">
                                                    To: {selected.toEmails.join(', ')}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {selectedTriage && (
                                        <div className="shrink-0 border-b border-[var(--sw-rule-2)] p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--sw-ink)]">
                                                    <ClipboardCheck className="h-4 w-4 shrink-0 text-[var(--color-accent-teal)]" />
                                                    <span className="truncate">Variation claim</span>
                                                </div>
                                                <span className={cn(
                                                    'inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-xs font-medium',
                                                    selectedTriage.status === 'auto_triaged'
                                                        ? 'bg-[var(--color-accent-teal-tint)] text-[var(--color-accent-teal)]'
                                                        : 'bg-[#F6FAFB] text-[var(--sw-muted)]'
                                                )}>
                                                    {selectedTriage.status !== 'auto_triaged' && (
                                                        <AlertCircle className="h-3 w-3" />
                                                    )}
                                                    {TRIAGE_STATUS_LABELS[selectedTriage.status]}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <div className="uppercase text-[var(--sw-muted)]">Status</div>
                                                    <div className="mt-1 text-[var(--sw-ink)]">
                                                        {TRIAGE_COMPLETENESS_LABELS[selectedTriage.completeness]}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="uppercase text-[var(--sw-muted)]">Confidence</div>
                                                    <div className="mt-1 text-[var(--sw-ink)]">
                                                        {formatConfidence(selectedTriage.confidence)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="uppercase text-[var(--sw-muted)]">Amount</div>
                                                    <div className="mt-1 text-[var(--sw-ink)]">
                                                        {formatCurrency(selectedTriage.facts.amountForecastCents)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="uppercase text-[var(--sw-muted)]">Submitted</div>
                                                    <div className="mt-1 text-[var(--sw-ink)]">
                                                        {selectedTriage.facts.dateSubmitted || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 overflow-hidden border border-[var(--sw-rule)] bg-[#F6FAFB]">
                                                <button
                                                    type="button"
                                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                                                    onClick={toggleTrace}
                                                    title="Show workflow trace"
                                                >
                                                    <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--sw-ink)]">
                                                        {selectedTraceOpen ? (
                                                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                                        )}
                                                        <span>Trace</span>
                                                    </span>
                                                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                                                        <span className="border border-[var(--sw-rule)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sw-muted)]">
                                                            {selectedTriage.trace.draftingMode === 'deterministic_delivery_lite_template'
                                                                ? 'Template'
                                                                : selectedTriage.trace.draftingMode === 'llm_assisted_delivery_template'
                                                                  ? 'LLM-assisted'
                                                                  : TRACE_DRAFTING_LABELS[selectedTriage.trace.draftingMode]}
                                                        </span>
                                                        <span className="border border-[var(--sw-rule)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sw-muted)]">
                                                            {selectedTriage.trace.llmUsed ? 'LLM' : 'No LLM'}
                                                        </span>
                                                        <span className="border border-[var(--sw-rule)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sw-muted)]">
                                                            {selectedTriage.trace.knowledgeLibraryUsed ? 'Library' : 'No library'}
                                                        </span>
                                                    </span>
                                                </button>
                                                {selectedTraceOpen && (
                                                    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-2 gap-y-1 border-t border-[var(--sw-rule)] px-3 py-2 text-xs">
                                                        <div className="text-[var(--sw-muted)]">Source</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {TRACE_SOURCE_LABELS[selectedTriage.trace.source]}
                                                        </div>
                                                        <div className="text-[var(--sw-muted)]">Trigger</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {TRACE_TRIGGER_LABELS[selectedTriage.trace.trigger]}
                                                        </div>
                                                        <div className="text-[var(--sw-muted)]">Agent</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {formatAgentName(selectedTriage.trace.agentName)}
                                                        </div>
                                                        <div className="text-[var(--sw-muted)]">Draft</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {TRACE_DRAFTING_LABELS[selectedTriage.trace.draftingMode]}
                                                        </div>
                                                        <div className="text-[var(--sw-muted)]">Context</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {selectedTriage.trace.llmUsed ? 'LLM used' : 'No LLM'} /{' '}
                                                            {selectedTriage.trace.knowledgeLibraryUsed
                                                                ? 'library used'
                                                                : 'no library'}
                                                        </div>
                                                        <div className="text-[var(--sw-muted)]">Approval</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {selectedTriage.trace.approvalRequired ? 'Required' : 'Not required'}
                                                        </div>
                                                        <div className="text-[var(--sw-muted)]">Workflow</div>
                                                        <div className="truncate text-[var(--sw-ink)]">
                                                            {selectedTriage.trace.workflowKey || '-'}
                                                        </div>
                                                        {selectedTriage.trace.documentsReviewed.length > 0 && (
                                                            <>
                                                                <div className="text-[var(--sw-muted)]">Docs</div>
                                                                <div
                                                                    className="truncate text-[var(--sw-ink)]"
                                                                    title={selectedTriage.trace.documentsReviewed.join(', ')}
                                                                >
                                                                    {selectedTriage.trace.documentsReviewed.join(', ')}
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="text-[var(--sw-muted)]">Actions</div>
                                                        <div
                                                            className="truncate text-[var(--sw-ink)]"
                                                            title={selectedTriage.trace.proposedActions.join(', ')}
                                                        >
                                                            {selectedTriage.trace.proposedActions.join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedTriage.missingInformation.length > 0 && (
                                                <div className="mt-3 border border-[var(--sw-rule)] bg-[#F6FAFB] p-3">
                                                    <div className="mb-2 text-xs font-medium uppercase text-[var(--sw-muted)]">
                                                        Missing particulars
                                                    </div>
                                                    <ul className="space-y-1 text-xs text-[var(--sw-ink)]">
                                                        {selectedTriage.missingInformation.map((item) => (
                                                            <li key={item}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {selectedTriage.workflowRunId && (
                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <div className="min-w-0 truncate text-xs text-[var(--sw-muted)]">
                                                        Workflow: {selectedTriage.workflowRunId}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 shrink-0 gap-2 text-xs"
                                                        onClick={reviewWorkflow}
                                                        disabled={reviewingWorkflowId === selectedTriage.workflowRunId}
                                                    >
                                                        {reviewingWorkflowId === selectedTriage.workflowRunId ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                        )}
                                                        Review
                                                    </Button>
                                                </div>
                                            )}
                                            {reviewError && (
                                                <div className="mt-2 text-xs text-[var(--color-error)]">
                                                    {reviewError}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div
                                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
                                        data-testid="correspondence-body-scroll-region"
                                    >
                                        <div className="whitespace-pre-wrap text-sm leading-6 text-[var(--sw-ink)]">
                                            {selected.bodyText || 'No text body'}
                                        </div>
                                    </div>

                                    {selected.attachments.length > 0 && (
                                        <div className="shrink-0 border-t border-[var(--sw-rule-2)] p-4">
                                            <div className="mb-2 text-xs font-medium uppercase text-[var(--sw-muted)]">
                                                Attachments
                                            </div>
                                            <div className="space-y-2">
                                                {selected.attachments.map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center justify-between gap-3 border border-[var(--sw-rule)] px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm text-[var(--sw-ink)]">
                                                                {attachment.originalName}
                                                            </div>
                                                            <div className="text-xs text-[var(--sw-muted)]">
                                                                {formatBytes(attachment.sizeBytes)}
                                                            </div>
                                                        </div>
                                                        <Paperclip className="h-4 w-4 shrink-0 text-[var(--sw-muted)]" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </div>
                            </>
                        ) : (
                            <div
                                className="flex flex-1 items-center justify-center text-sm text-[var(--sw-muted)]"
                                style={{ border: '1px solid var(--sw-rule)' }}
                            >
                                Select a thread
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
