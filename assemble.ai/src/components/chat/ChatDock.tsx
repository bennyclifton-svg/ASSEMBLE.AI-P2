'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import { MessageList } from './MessageList';
import type { ChatMessageView } from './MessageBubble';
import { useChatStream, type PendingApprovalView } from '@/lib/hooks/use-chat-stream';

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
    const [error, setError] = useState<string | null>(null);

    const stream = useChatStream(thread?.id ?? null);

    // Reset thread when project changes
    useEffect(() => {
        setThread(null);
        setMessages([]);
        setHydratedApprovals({});
        setError(null);
    }, [projectId]);

    const loadMessages = useCallback(async (threadId: string) => {
        const res = await fetch(`/api/chat/threads/${threadId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(
            (data.messages ?? []).filter(
                (m: ChatMessageView) => m.role === 'user' || m.role === 'assistant'
            )
        );
        setHydratedApprovals(
            Object.fromEntries(
                (data.pendingApprovals ?? []).map((a: PendingApprovalView) => [
                    a.id,
                    {
                        id: a.id,
                        runId: a.runId,
                        toolName: a.toolName,
                        proposedDiff: a.proposedDiff,
                        resolution: null,
                    },
                ])
            )
        );
    }, []);

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
        loadMessages(thread.id);
    }, [stream.lastAssistantMessageId, thread, loadMessages]);

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
            setDraft('');
            const res = await fetch(`/api/chat/threads/${t.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text }),
            });
            if (!res.ok) {
                // Rollback optimistic if 4xx
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Send failed');
        } finally {
            setIsSending(false);
        }
    }, [draft, isSending, thread, loadOrCreateThread]);

    // Track the bounds of the center panel so the dock spans only that column
    // (not the full screen). Falls back to full-width if no anchor element is
    // present (e.g., on a layout that isn't ResizableLayout).
    //
    // The dock can mount before react-resizable-panels finishes computing its
    // widths, so we poll on requestAnimationFrame until the anchor exists and
    // reports a non-zero width, then attach a ResizeObserver for ongoing
    // updates.
    const [anchorRect, setAnchorRect] = useState<{ left: number; width: number } | null>(null);
    useLayoutEffect(() => {
        let raf = 0;
        let observer: ResizeObserver | null = null;

        const measure = (el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            setAnchorRect({ left: rect.left, width: rect.width });
        };

        const tryAttach = () => {
            const el = document.querySelector<HTMLElement>('[data-chat-dock-anchor="center"]');
            if (el && el.getBoundingClientRect().width > 0) {
                measure(el);
                observer = new ResizeObserver(() => measure(el));
                observer.observe(el);
                return;
            }
            raf = requestAnimationFrame(tryAttach);
        };

        const onWinResize = () => {
            const el = document.querySelector<HTMLElement>('[data-chat-dock-anchor="center"]');
            if (el && el.getBoundingClientRect().width > 0) measure(el);
        };

        tryAttach();
        window.addEventListener('resize', onWinResize);

        return () => {
            cancelAnimationFrame(raf);
            observer?.disconnect();
            window.removeEventListener('resize', onWinResize);
        };
    }, []);

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

    const approvals = {
        ...hydratedApprovals,
        ...stream.approvals,
    };

    return (
        <div
            data-testid="chat-dock"
            className="fixed bottom-0 z-40 flex flex-col"
            style={{
                // Anchor to the center panel if available, else full-width.
                left: anchorRect ? anchorRect.left : 0,
                width: anchorRect ? anchorRect.width : '100%',
                height: collapsed ? COLLAPSED_HEIGHT : height,
                backgroundColor: 'var(--color-bg-primary)',
                borderTop: '1px solid var(--color-border)',
                borderLeft: anchorRect ? '1px solid var(--color-border)' : undefined,
                borderRight: anchorRect ? '1px solid var(--color-border)' : undefined,
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
                    />

                    {error && (
                        <div
                            className="text-xs px-3 py-1.5 flex-shrink-0"
                            style={{
                                color: 'var(--color-error)',
                                borderTop: '1px solid var(--color-border-subtle)',
                            }}
                        >
                            {error}
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
                            placeholder="Ask about cost plan, documents, or any project question…"
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
}
