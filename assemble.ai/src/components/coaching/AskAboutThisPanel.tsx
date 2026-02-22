'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, BookmarkPlus, Copy, Pin, ChevronDown, Loader2 } from 'lucide-react';
import { getSuggestedQuestions } from '@/lib/services/coaching-suggestions';
import type { CoachingModule } from '@/lib/constants/coaching-checklists';

interface QAContext {
    module: CoachingModule;
    projectId: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: { type: string; name: string; detail: string }[];
    suggestedFollowups?: string[];
    isSaved?: boolean;
    isPinned?: boolean;
}

interface ConversationThread {
    id: string;
    title: string;
    messageCount: number;
    updatedAt: string;
}

interface AskAboutThisPanelProps {
    isOpen: boolean;
    onClose: () => void;
    context: QAContext;
}

const MODULE_LABELS: Record<string, string> = {
    cost_plan: 'Cost Plan',
    procurement: 'Procurement',
    program: 'Program',
    documents: 'Documents',
    reports: 'Reports',
    stakeholders: 'Stakeholders',
};

export function AskAboutThisPanel({ isOpen, onClose, context }: AskAboutThisPanelProps) {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [previousThreads, setPreviousThreads] = useState<ConversationThread[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showThreads, setShowThreads] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const suggestedQuestions = getSuggestedQuestions(context.module);

    // Fetch previous threads when panel opens
    useEffect(() => {
        if (isOpen && context.projectId) {
            fetchThreads();
        }
    }, [isOpen, context.projectId, context.module]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const fetchThreads = async () => {
        try {
            const res = await fetch(
                `/api/projects/${context.projectId}/coaching/conversations?module=${context.module}`
            );
            if (res.ok) {
                const data = await res.json();
                setPreviousThreads(data);
            }
        } catch {
            // Silently fail - threads are optional
        }
    };

    const loadThread = async (threadId: string) => {
        try {
            const res = await fetch(
                `/api/projects/${context.projectId}/coaching/conversations/${threadId}`
            );
            if (res.ok) {
                const data = await res.json();
                setConversationId(threadId);
                setMessages(
                    data.messages.map((m: any) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        sources: m.sources,
                        suggestedFollowups: m.suggestedFollowups,
                        isSaved: m.isSaved,
                        isPinned: m.isPinned,
                    }))
                );
                setShowThreads(false);
            }
        } catch {
            // Silently fail
        }
    };

    const askQuestion = useCallback(
        async (q: string) => {
            if (!q.trim() || isLoading) return;

            const userMessage: Message = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: q.trim(),
            };
            setMessages((prev) => [...prev, userMessage]);
            setQuestion('');
            setIsLoading(true);

            try {
                const res = await fetch('/api/ai/coaching-qa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: context.projectId,
                        question: q.trim(),
                        module: context.module,
                        conversationId,
                    }),
                });

                if (!res.ok) throw new Error('Failed to get answer');

                const data = await res.json();
                setConversationId(data.conversationId);

                const assistantMessage: Message = {
                    id: data.messageId,
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources,
                    suggestedFollowups: data.suggestedFollowups,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            } catch {
                const errorMessage: Message = {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Sorry, I was unable to generate an answer. Please try again.',
                };
                setMessages((prev) => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
            }
        },
        [context.projectId, context.module, conversationId, isLoading]
    );

    const toggleSave = async (messageId: string) => {
        if (!conversationId) return;
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) return;

        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, isSaved: !m.isSaved } : m))
        );

        try {
            await fetch(
                `/api/projects/${context.projectId}/coaching/conversations/${conversationId}/messages`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageId, isSaved: !msg.isSaved }),
                }
            );
        } catch {
            // Rollback on error
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, isSaved: msg.isSaved } : m))
            );
        }
    };

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const startNewThread = () => {
        setConversationId(null);
        setMessages([]);
        setShowThreads(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-xl"
                style={{
                    width: '400px',
                    maxWidth: '100vw',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderLeft: '1px solid var(--color-border)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 shrink-0"
                    style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: 'linear-gradient(135deg, var(--color-accent-copper-tint), transparent)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="text-sm font-medium"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            Ask About This
                        </span>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: 'var(--color-accent-copper-tint)',
                                color: 'var(--color-accent-copper)',
                            }}
                        >
                            {MODULE_LABELS[context.module] || context.module}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={startNewThread}
                            className="text-xs px-2 py-1 rounded hover:opacity-80"
                            style={{ color: 'var(--color-accent-copper)' }}
                        >
                            New
                        </button>
                        <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
                            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        </button>
                    </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {messages.length === 0 ? (
                        <>
                            {/* Suggested questions */}
                            <div className="space-y-2 mt-2">
                                <span
                                    className="text-xs font-medium"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    Suggested questions:
                                </span>
                                {suggestedQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => askQuestion(q)}
                                        className="w-full text-left text-xs p-2.5 rounded-md border hover:opacity-80 transition-opacity"
                                        style={{
                                            borderColor: 'var(--color-border)',
                                            color: 'var(--color-text-primary)',
                                            backgroundColor: 'var(--color-bg-primary)',
                                        }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            {/* Previous threads */}
                            {previousThreads.length > 0 && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowThreads(!showThreads)}
                                        className="flex items-center gap-1 text-xs"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        <ChevronDown
                                            className={`w-3 h-3 transition-transform ${
                                                showThreads ? '' : '-rotate-90'
                                            }`}
                                        />
                                        Previous threads ({previousThreads.length})
                                    </button>
                                    {showThreads && (
                                        <div className="mt-1 space-y-1">
                                            {previousThreads.map((thread) => (
                                                <button
                                                    key={thread.id}
                                                    onClick={() => loadThread(thread.id)}
                                                    className="w-full text-left text-xs p-2 rounded hover:bg-white/5"
                                                    style={{ color: 'var(--color-text-primary)' }}
                                                >
                                                    <span className="truncate block">
                                                        {thread.title || 'Untitled'}
                                                    </span>
                                                    <span
                                                        className="text-[10px]"
                                                        style={{ color: 'var(--color-text-secondary)' }}
                                                    >
                                                        {thread.messageCount} messages
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id}>
                                    {msg.role === 'user' ? (
                                        <div className="flex justify-end">
                                            <div
                                                className="max-w-[85%] rounded-lg px-3 py-2 text-xs"
                                                style={{
                                                    backgroundColor: 'var(--color-accent-copper-tint)',
                                                    color: 'var(--color-text-primary)',
                                                }}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div
                                                className="rounded-lg px-3 py-2 text-xs leading-relaxed border"
                                                style={{
                                                    borderColor: msg.isPinned
                                                        ? 'var(--color-accent-yellow)'
                                                        : 'var(--color-border)',
                                                    backgroundColor: 'var(--color-bg-primary)',
                                                    color: 'var(--color-text-primary)',
                                                    borderLeftWidth: msg.isPinned ? '3px' : '1px',
                                                }}
                                            >
                                                <div className="whitespace-pre-wrap">{msg.content}</div>

                                                {/* Sources */}
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div
                                                        className="mt-2 pt-2 space-y-0.5"
                                                        style={{
                                                            borderTop: '1px solid var(--color-border)',
                                                        }}
                                                    >
                                                        {msg.sources.map((source, i) => (
                                                            <div
                                                                key={i}
                                                                className="text-[10px]"
                                                                style={{ color: 'var(--color-text-secondary)' }}
                                                            >
                                                                {source.detail}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1 mt-1">
                                                <button
                                                    onClick={() => toggleSave(msg.id)}
                                                    className="p-1 rounded hover:bg-white/10"
                                                    title={msg.isSaved ? 'Unsave' : 'Save answer'}
                                                >
                                                    <BookmarkPlus
                                                        className="w-3 h-3"
                                                        style={{
                                                            color: msg.isSaved
                                                                ? 'var(--color-accent-copper)'
                                                                : 'var(--color-text-secondary)',
                                                        }}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(msg.content)}
                                                    className="p-1 rounded hover:bg-white/10"
                                                    title="Copy"
                                                >
                                                    <Copy
                                                        className="w-3 h-3"
                                                        style={{ color: 'var(--color-text-secondary)' }}
                                                    />
                                                </button>
                                            </div>

                                            {/* Follow-up suggestions */}
                                            {msg.suggestedFollowups &&
                                                msg.suggestedFollowups.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {msg.suggestedFollowups.map((q, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => askQuestion(q)}
                                                                className="w-full text-left text-[11px] p-1.5 rounded border hover:opacity-80"
                                                                style={{
                                                                    borderColor: 'var(--color-border)',
                                                                    color: 'var(--color-text-secondary)',
                                                                }}
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex items-center gap-2 px-3 py-2">
                                    <Loader2
                                        className="w-3.5 h-3.5 animate-spin"
                                        style={{ color: 'var(--color-accent-copper)' }}
                                    />
                                    <span
                                        className="text-xs"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        Checking your project data...
                                    </span>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input area */}
                <div
                    className="shrink-0 px-4 py-3"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                >
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    askQuestion(question);
                                }
                            }}
                            placeholder={`Ask about your ${MODULE_LABELS[context.module]?.toLowerCase() || 'project'}...`}
                            className="flex-1 text-xs resize-none rounded-md border px-3 py-2 focus:outline-none focus:ring-1"
                            style={{
                                borderColor: 'var(--color-border)',
                                backgroundColor: 'var(--color-bg-primary)',
                                color: 'var(--color-text-primary)',
                                maxHeight: '80px',
                            }}
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => askQuestion(question)}
                            disabled={!question.trim() || isLoading}
                            className="p-2 rounded-md transition-opacity disabled:opacity-30"
                            style={{
                                backgroundColor: 'var(--color-accent-copper-tint)',
                                color: 'var(--color-accent-copper)',
                            }}
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
