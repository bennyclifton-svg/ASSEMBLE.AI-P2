'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import { MessageList } from './MessageList';
import type { ChatMessageView } from './MessageBubble';
import { useChatStream, type PendingApprovalView } from '@/lib/hooks/use-chat-stream';
import { buildVisibleChatRows } from '@/lib/chat/history';
import { sanitizeChatViewContext } from '@/lib/chat/view-context';
import { useChatViewContextPatch } from '@/lib/contexts/chat-view-context';
import {
    dispatchDocumentSelectionChanged,
    type DocumentSelectionChangedDetail,
} from '@/lib/chat/document-selection-events';

interface ChatDockProps {
    projectId: string;
}

const DEFAULT_HEIGHT = 360;
const MIN_HEIGHT = 220;
const MAX_HEIGHT_VH = 0.7;
const COLLAPSED_HEIGHT = 44;

interface ThreadShape {
    id: string;
    title: string;
    projectId: string;
}

export function ChatDock({ projectId }: ChatDockProps) {
    const [collapsed, setCollapsed] = useState(true);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [thread, setThread] = useState<ThreadShape | null>(null);
    const [messages, setMessages] = useState<ChatMessageView[]>([]);
    const [hydratedApprovals, setHydratedApprovals] = useState<Record<string, PendingApprovalView>>({});
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [pendingRunStatus, setPendingRunStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [approvalChipBusy, setApprovalChipBusy] = useState<string | null>(null);
    const [chipResolutions, setChipResolutions] = useState<Record<string, PendingApprovalView['resolution']>>({});
    const postSendRefreshTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const pendingRunStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingSendStartedAtRef = useRef<number | null>(null);
    const uiActionSinceRef = useRef<number | null>(null);
    const pendingApprovalIdsRef = useRef<string[]>([]);

    const stream = useChatStream(thread?.id ?? null);
    const { patch: viewContextPatch } = useChatViewContextPatch();

    const clearPendingRunStatus = useCallback(() => {
        setPendingRunStatus(null);
        pendingSendStartedAtRef.current = null;
        if (pendingRunStatusTimerRef.current) {
            clearTimeout(pendingRunStatusTimerRef.current);
            pendingRunStatusTimerRef.current = null;
        }
    }, []);

    const startPendingRunStatus = useCallback(() => {
        pendingSendStartedAtRef.current = Date.now();
        setPendingRunStatus('Assistant is working...');
        if (pendingRunStatusTimerRef.current) clearTimeout(pendingRunStatusTimerRef.current);
        pendingRunStatusTimerRef.current = setTimeout(() => {
            setPendingRunStatus((current) =>
                current ? 'Still waiting for the assistant response...' : null
            );
        }, 12000);
    }, []);

    const clearPostSendRefreshTimers = useCallback(() => {
        for (const timer of postSendRefreshTimersRef.current) clearTimeout(timer);
        postSendRefreshTimersRef.current = [];
    }, []);

    // Reset thread when project changes
    useEffect(() => {
        setThread(null);
        setMessages([]);
        setHydratedApprovals({});
        setChipResolutions({});
        uiActionSinceRef.current = null;
        clearPostSendRefreshTimers();
        clearPendingRunStatus();
        setError(null);
    }, [clearPendingRunStatus, clearPostSendRefreshTimers, projectId]);

    const loadMessages = useCallback(async (
        threadId: string,
        options?: { selectionSinceMs?: number | null }
    ) => {
        const url = new URL(`/api/chat/threads/${threadId}`, window.location.origin);
        if (options?.selectionSinceMs) {
            url.searchParams.set('selectionSince', new Date(options.selectionSinceMs).toISOString());
        }

        const res = await fetch(`${url.pathname}${url.search}`);
        if (!res.ok) return;
        const data = await res.json();
        const fetchedMessages = buildVisibleChatRows((data.messages ?? []) as ChatMessageView[]);
        const pendingApprovals: PendingApprovalView[] = data.pendingApprovals ?? [];
        const documentSelections: Array<DocumentSelectionChangedDetail & { createdAt?: string | Date | null }> =
            data.documentSelections ?? [];
        setMessages(fetchedMessages);
        setHydratedApprovals(
            Object.fromEntries(
                pendingApprovals.map((a: PendingApprovalView) => [
                    a.id,
                    {
                        id: a.id,
                        runId: a.runId,
                        toolName: a.toolName,
                        proposedDiff: a.proposedDiff,
                        createdAt: a.createdAt ?? null,
                        resolution: null,
                    },
                ])
            )
        );
        documentSelections.forEach((selection) => {
            dispatchDocumentSelectionChanged({
                projectId: selection.projectId,
                mode: selection.mode,
                documentIds: selection.documentIds,
            });
        });
        if (pendingSendStartedAtRef.current) {
            const startedAt = pendingSendStartedAtRef.current;
            const hasFreshAssistant = fetchedMessages.some((message) => {
                if (message.role !== 'assistant' || !message.createdAt) return false;
                const createdAt = new Date(message.createdAt).getTime();
                return Number.isFinite(createdAt) && createdAt >= startedAt - 1000;
            });
            if (pendingApprovals.length > 0 || hasFreshAssistant) {
                clearPendingRunStatus();
            }
        }
    }, [clearPendingRunStatus]);

    const schedulePostSendRehydration = useCallback(
        (threadId: string) => {
            clearPostSendRefreshTimers();
            const selectionSinceMs = uiActionSinceRef.current;
            postSendRefreshTimersRef.current = [800, 2000, 5000, 10000, 20000, 30000].map((delay) =>
                setTimeout(() => {
                    void loadMessages(threadId, { selectionSinceMs });
                }, delay)
            );
        },
        [clearPostSendRefreshTimers, loadMessages]
    );

    useEffect(() => clearPostSendRefreshTimers, [clearPostSendRefreshTimers]);

    const buildViewContext = useCallback(() => {
        const route =
            typeof window !== 'undefined'
                ? `${window.location.pathname}${window.location.search}`
                : `/projects/${projectId}`;
        const urlSearchParams =
            typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

        return sanitizeChatViewContext(
            {
                ...viewContextPatch,
                projectId,
                route,
                tab: viewContextPatch.tab ?? urlSearchParams?.get('tab') ?? undefined,
                sub: viewContextPatch.sub ?? urlSearchParams?.get('sub') ?? undefined,
                pendingApprovalIds: pendingApprovalIdsRef.current,
                recentlyViewedIds: viewContextPatch.recentlyViewedIds ?? [],
            },
            projectId
        );
    }, [projectId, viewContextPatch]);

    useEffect(
        () => () => {
            if (pendingRunStatusTimerRef.current) {
                clearTimeout(pendingRunStatusTimerRef.current);
                pendingRunStatusTimerRef.current = null;
            }
        },
        []
    );

    // Load the latest thread and rehydrate messages/approvals when the dock opens.
    const loadOrCreateThread = useCallback(async () => {
        if (thread) {
            await loadMessages(thread.id);
            return thread;
        }
        try {
            const listRes = await fetch(
                `/api/chat/threads?projectId=${encodeURIComponent(projectId)}`
            );
            if (!listRes.ok) throw new Error(`List threads failed (${listRes.status})`);
            const listData = await listRes.json();
            const existing: ThreadShape[] = listData.threads ?? [];
            if (existing.length > 0) {
                setThread(existing[0]);
                await loadMessages(existing[0].id);
                return existing[0];
            }
            const createRes = await fetch('/api/chat/threads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            if (!createRes.ok) throw new Error(`Create thread failed (${createRes.status})`);
            const createData = await createRes.json();
            setThread(createData.thread);
            return createData.thread as ThreadShape;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load chat');
            return null;
        }
    }, [loadMessages, projectId, thread]);

    // When the SSE stream reports a new assistant message, refetch the thread
    // so the canonical content (including tool-result-derived prose) shows up.
    useEffect(() => {
        if (!thread || !stream.lastAssistantMessageId) return;
        void loadMessages(thread.id, { selectionSinceMs: uiActionSinceRef.current });
        schedulePostSendRehydration(thread.id);
    }, [schedulePostSendRehydration, stream.lastAssistantMessageId, thread, loadMessages]);

    const handleToggle = useCallback(async () => {
        const next = !collapsed;
        setCollapsed(next);
        if (!next) {
            await loadOrCreateThread();
        }
    }, [collapsed, loadOrCreateThread]);

    const handleSend = useCallback(async () => {
        const text = draft.trim();
        if (!text || isSending) return;
        setError(null);
        setIsSending(true);
        try {
            const t = thread ?? (await loadOrCreateThread());
            if (!t) return;
            // Optimistic append
            const optimisticId = `optimistic-${Date.now()}`;
            setMessages((prev) => [
                ...prev,
                {
                    id: optimisticId,
                    role: 'user',
                    content: text,
                    agentName: null,
                    createdAt: new Date().toISOString(),
                },
            ]);
            startPendingRunStatus();
            uiActionSinceRef.current = Date.now();
            setDraft('');
            const res = await fetch(`/api/chat/threads/${t.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text, viewContext: buildViewContext() }),
            });
            if (!res.ok) {
                // Rollback optimistic if 4xx
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
                clearPendingRunStatus();
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || `Send failed (${res.status})`);
            }
            // Replace optimistic with real message id once persisted
            const data = await res.json();
            if (data.message) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === optimisticId
                            ? { ...m, id: data.message.id, createdAt: data.message.createdAt }
                            : m
                    )
                );
            }
            schedulePostSendRehydration(t.id);
        } catch (err) {
            clearPendingRunStatus();
            setError(err instanceof Error ? err.message : 'Send failed');
        } finally {
            setIsSending(false);
        }
    }, [
        clearPendingRunStatus,
        draft,
        isSending,
        buildViewContext,
        loadOrCreateThread,
        schedulePostSendRehydration,
        startPendingRunStatus,
        thread,
    ]);

    const resolveApprovalFromResponse = useCallback(
        async (approval: PendingApprovalView, decision: 'approve' | 'reject') => {
            const res = await fetch(`/api/chat/approvals/${approval.id}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok && res.status !== 409 && res.status !== 410) {
                throw new Error(data?.error || `Approval ${decision} failed (${res.status})`);
            }
            const status = typeof data?.status === 'string' ? data.status : null;
            const resolution: PendingApprovalView['resolution'] =
                status === 'applied'
                    ? { status: 'applied', appliedOutput: data.output }
                    : status === 'rejected' || (res.ok && decision === 'reject')
                      ? { status: 'rejected' }
                      : {
                            status: 'conflict',
                            error:
                                typeof data?.error === 'string'
                                    ? data.error
                                    : 'The approval could not be applied.',
                        };
            setChipResolutions((current) => ({
                ...current,
                [approval.id]: resolution,
            }));
        },
        []
    );

    const handleApprovalChip = useCallback(
        async (decision: 'approve' | 'reject') => {
            if (approvalChipBusy) return;
            const pending = Object.values({
                ...hydratedApprovals,
                ...stream.approvals,
            }).filter((approval) => !(approval.resolution ?? chipResolutions[approval.id]));
            if (pending.length === 0) return;

            const busyKey = `${decision}-all`;
            setApprovalChipBusy(busyKey);
            setError(null);
            try {
                for (const approval of pending) {
                    await resolveApprovalFromResponse(approval, decision);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to resolve approval');
            } finally {
                setApprovalChipBusy(null);
            }
        },
        [
            approvalChipBusy,
            chipResolutions,
            hydratedApprovals,
            resolveApprovalFromResponse,
            stream.approvals,
        ]
    );

    // Render into the center panel when that layout is present. The dock can
    // mount before the panel exists, so keep looking until the anchor appears.
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    useLayoutEffect(() => {
        let raf = 0;
        let stopped = false;

        const findAnchor = () => {
            if (stopped) return;
            const el = document.querySelector<HTMLElement>('[data-chat-dock-anchor="center"]');
            if (el) {
                setAnchorEl(el);
                return;
            }
            raf = requestAnimationFrame(findAnchor);
        };

        findAnchor();

        return () => {
            stopped = true;
            cancelAnimationFrame(raf);
        };
    }, [projectId]);

    // Drag-to-resize
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(DEFAULT_HEIGHT);

    const handleResizeMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (e.detail === 2) {
                setCollapsed(true);
                return;
            }
            isDraggingRef.current = true;
            startYRef.current = e.clientY;
            startHeightRef.current = height;
            const onMove = (ev: MouseEvent) => {
                if (!isDraggingRef.current) return;
                const delta = startYRef.current - ev.clientY;
                const maxH = window.innerHeight * MAX_HEIGHT_VH;
                setHeight(Math.min(maxH, Math.max(MIN_HEIGHT, startHeightRef.current + delta)));
            };
            const onUp = () => {
                isDraggingRef.current = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        },
        [height]
    );

    // Keep the center panel from being covered by the dock.
    // We write a CSS variable onto the anchor element so ResizableLayout can
    // reserve the right amount of space without needing prop-drilling.
    useEffect(() => {
        if (!anchorEl) return;
        anchorEl.style.setProperty('--chat-dock-height', `${collapsed ? 0 : height}px`);

        return () => {
            anchorEl.style.removeProperty('--chat-dock-height');
        };
    }, [anchorEl, collapsed, height]);

    const approvals = Object.fromEntries(
        Object.entries({
            ...hydratedApprovals,
            ...stream.approvals,
        }).map(([id, approval]) => [
            id,
            {
                ...approval,
                resolution: approval.resolution ?? chipResolutions[id] ?? null,
            },
        ])
    );
    pendingApprovalIdsRef.current = Object.values(approvals)
        .filter((approval) => !approval.resolution)
        .map((approval) => approval.id);
    const unresolvedApprovalCount = Object.values(approvals).filter(
        (approval) => !approval.resolution
    ).length;

    useEffect(() => {
        if (
            stream.activeRun ||
            stream.lastAssistantMessageId ||
            unresolvedApprovalCount > 0 ||
            stream.error
        ) {
            clearPendingRunStatus();
        }
    }, [
        clearPendingRunStatus,
        stream.activeRun,
        stream.error,
        stream.lastAssistantMessageId,
        unresolvedApprovalCount,
    ]);
    const visibleError = error ?? stream.error;

    const dock = (
        <div
            data-testid="chat-dock"
            className={`${anchorEl ? 'absolute inset-x-0' : 'fixed'} bottom-0 z-40 flex flex-col`}
            style={{
                left: anchorEl ? undefined : 0,
                right: anchorEl ? 0 : undefined,
                width: anchorEl ? undefined : '100%',
                height: collapsed ? COLLAPSED_HEIGHT : height,
                backgroundColor: 'var(--color-bg-primary)',
                borderTop: '1px solid var(--color-border)',
                borderLeft: anchorEl ? '1px solid var(--color-border)' : undefined,
                borderRight: anchorEl ? '1px solid var(--color-border)' : undefined,
                boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
                transition: collapsed ? 'height 0.15s ease' : undefined,
            }}
        >
            {/* Resize handle */}
            {!collapsed && (
                <div
                    className="w-full h-2 flex-shrink-0 cursor-row-resize select-none flex items-center justify-center"
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                    onMouseDown={handleResizeMouseDown}
                    title="Drag to resize — double-click to collapse"
                >
                    <div
                        className="w-8 h-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-border-strong)' }}
                    />
                </div>
            )}

            {/* Header */}
            <button
                type="button"
                onClick={handleToggle}
                className="flex items-center justify-between px-3 flex-shrink-0 hover:bg-[var(--color-bg-hover)] transition-colors"
                style={{
                    height: collapsed ? '100%' : 36,
                    borderBottom: collapsed ? undefined : '1px solid var(--color-border-subtle)',
                }}
                data-testid="chat-dock-toggle"
            >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                     style={{ color: 'var(--color-text-secondary)' }}>
                    <MessageSquare size={14} />
                    <span>Project Assistant</span>
                    {stream.isConnected && !collapsed && (
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: 'var(--color-success)' }}
                            title="Live"
                        />
                    )}
                </div>
                {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Body */}
            {!collapsed && (
                <>
                    <MessageList
                        messages={messages}
                        activeRun={stream.activeRun}
                        approvals={approvals}
                        pendingStatus={pendingRunStatus}
                    />

                    {visibleError && (
                        <div
                            className="text-xs px-3 py-1.5 flex-shrink-0"
                            style={{
                                color: 'var(--color-error)',
                                borderTop: '1px solid var(--color-border-subtle)',
                            }}
                        >
                            {visibleError}
                        </div>
                    )}

                    {unresolvedApprovalCount > 1 && (
                        <div
                            className="flex flex-wrap items-center gap-1.5 px-2 py-1.5"
                            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                            data-testid="approval-bulk-actions"
                        >
                            <span
                                className="px-1 text-xs font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                Bulk actions ({unresolvedApprovalCount} pending)
                            </span>
                            <button
                                type="button"
                                onClick={() => void handleApprovalChip('approve')}
                                disabled={approvalChipBusy !== null}
                                className="px-2 py-1 text-xs rounded border disabled:opacity-50"
                                style={{ borderColor: 'var(--color-border)' }}
                                data-testid="approval-chip-approve-all"
                            >
                                Approve all
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleApprovalChip('reject')}
                                disabled={approvalChipBusy !== null}
                                className="px-2 py-1 text-xs rounded border disabled:opacity-50"
                                style={{ borderColor: 'var(--color-border)' }}
                            >
                                Reject all
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    <div
                        className="flex-shrink-0 flex items-end gap-2 p-2"
                        style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                    >
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask about the project or request an action..."
                            rows={2}
                            disabled={isSending || stream.activeRun !== null}
                            className="flex-1 resize-none rounded px-2 py-1.5 text-sm focus:outline-none"
                            style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                            }}
                            data-testid="chat-dock-input"
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!draft.trim() || isSending || stream.activeRun !== null}
                            className="flex items-center justify-center w-8 h-8 rounded disabled:opacity-50 transition-colors"
                            style={{
                                backgroundColor: 'var(--color-accent-primary)',
                                color: 'var(--color-on-accent)',
                            }}
                            data-testid="chat-dock-send"
                            aria-label="Send message"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    return anchorEl ? createPortal(dock, anchorEl) : dock;
}
