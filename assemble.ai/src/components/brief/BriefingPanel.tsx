'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, RotateCw, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type Coverage = Record<'planning' | 'functional' | 'quality' | 'compliance', boolean>;

interface BriefingSession {
    id: string;
    status: 'active' | 'completed' | 'abandoned';
    coverage: Coverage;
    isComplete?: boolean;
}

interface BriefingMessage {
    id: string;
    role: 'system' | 'assistant' | 'user' | 'tool';
    content: string;
    toolCalls?: Array<{
        name: string;
        input: unknown;
        output?: { label?: string; data?: unknown };
        error?: string;
    }> | null;
    createdAt?: string;
}

interface BriefingPanelProps {
    projectId: string;
    autoStartKey: number;
    restartKey?: number;
    onClose: () => void;
    onSessionChange?: () => void;
    onObjectivesUpdated?: () => void;
}

const CATEGORIES: Array<keyof Coverage> = ['planning', 'functional', 'quality', 'compliance'];
const BRIEFING_LOAD_TIMEOUT_MS = 15000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), BRIEFING_LOAD_TIMEOUT_MS);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        window.clearTimeout(timeout);
    }
}

function cleanAnswerLabel(value: string): string {
    return value.trim().replace(/^(?:[-*]|\d+[.)]|[A-D][.)])\s*/i, '');
}

function parseRecommendedAnswer(content: string): string {
    const match = content.match(/Recommended answer:\s*([\s\S]*?)(?:\n\s*Source:|$)/i);
    return match?.[1] ? cleanAnswerLabel(match[1]) : '';
}

function parseBriefingQuestion(content: string): {
    question: string | null;
    options: string[];
    recommendedAnswer: string;
    source: string | null;
} {
    const question = content.match(/Question:\s*([\s\S]*?)(?:\n\s*Options?:|\n\s*Recommended answer:|$)/i)?.[1]?.trim() ?? null;
    const optionBlock = content.match(/Options?:\s*([\s\S]*?)(?:\n\s*Recommended answer:|\n\s*Source:|$)/i)?.[1] ?? '';
    const options = optionBlock
        .split(/\r?\n/)
        .map(cleanAnswerLabel)
        .filter(Boolean)
        .slice(0, 4);
    const recommendedAnswer = parseRecommendedAnswer(content);
    const source = content.match(/\n\s*Source:\s*([^\n]+)\s*$/i)?.[1]?.trim() ?? null;
    return { question, options, recommendedAnswer, source };
}

function isWriteTool(name: string): boolean {
    return name === 'updateProfileField' || name === 'upsertObjective' || name === 'markCategoryCovered';
}

function summariseWrites(messages: BriefingMessage[]) {
    let objectives = 0;
    let profile = 0;
    for (const message of messages) {
        for (const call of message.toolCalls ?? []) {
            if (call.error) continue;
            if (call.name === 'upsertObjective') objectives++;
            if (call.name === 'updateProfileField') profile++;
        }
    }
    return { objectives, profile };
}

export function BriefingPanel({
    projectId,
    autoStartKey,
    restartKey = 0,
    onClose,
    onSessionChange,
    onObjectivesUpdated,
}: BriefingPanelProps) {
    const { toast } = useToast();
    const [session, setSession] = useState<BriefingSession | null>(null);
    const [messages, setMessages] = useState<BriefingMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draftAnswer, setDraftAnswer] = useState('');
    const startedKeysRef = useRef(new Set<number>());
    const restartedKeysRef = useRef(new Set<number>());
    const streamTextRef = useRef('');

    const refreshSession = useCallback(async () => {
        setLoadError(null);
        const res = await fetchWithTimeout(`/api/projects/${projectId}/briefing`);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            const message = typeof body.error === 'string'
                ? body.error
                : `Briefing load failed (${res.status})`;
            throw new Error(message);
        }
        const json = await res.json();
        setSession(json.session ?? null);
        setMessages(Array.isArray(json.messages) ? json.messages : []);
    }, [projectId]);

    const consumeStream = useCallback(async (res: Response) => {
        if (!res.body) throw new Error('No briefing stream returned');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        streamTextRef.current = '';
        setIsStreaming(true);
        setMessages((prev) => [
            ...prev.filter((message) => message.id !== 'streaming-assistant'),
            { id: 'streaming-assistant', role: 'assistant', content: '' },
        ]);

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() ?? '';

                for (const chunk of chunks) {
                    const dataLine = chunk
                        .split('\n')
                        .find((line) => line.startsWith('data: '));
                    if (!dataLine) continue;
                    const event = JSON.parse(dataLine.slice(6));

                    if (event.type === 'text-delta') {
                        streamTextRef.current += event.text;
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === 'streaming-assistant'
                                    ? { ...message, content: streamTextRef.current }
                                    : message
                            )
                        );
                    }

                    if (event.type === 'status' && !streamTextRef.current) {
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === 'streaming-assistant'
                                    ? { ...message, content: event.message }
                                    : message
                            )
                        );
                    }

                    if (event.type === 'tool-call-result') {
                        const result = event.result;
                        if (isWriteTool(result.name)) {
                            if (result.error) {
                                toast({
                                    title: 'Briefing write failed',
                                    description: result.error,
                                    variant: 'destructive',
                                });
                            } else {
                                toast({
                                    title: 'Saved',
                                    description: result.output?.label ?? result.name,
                                });
                                onObjectivesUpdated?.();
                            }
                        }
                    }

                    if (event.type === 'coverage') {
                        setSession((current) =>
                            current ? { ...current, coverage: event.coverage } : current
                        );
                    }

                    if (event.type === 'error') {
                        toast({
                            title: 'Briefing interrupted',
                            description: event.error,
                            variant: 'destructive',
                        });
                    }

                    if (event.type === 'done') {
                        setSession(event.session);
                    }
                }
            }
        } finally {
            setIsStreaming(false);
            try {
                await refreshSession();
                onObjectivesUpdated?.();
                onSessionChange?.();
            } catch (error) {
                setLoadError(error instanceof Error ? error.message : 'Could not refresh Briefing');
            }
        }
    }, [onObjectivesUpdated, onSessionChange, refreshSession, toast]);

    const startBriefing = useCallback(async () => {
        setLoadError(null);
        const res = await fetchWithTimeout(`/api/projects/${projectId}/briefing/start`, { method: 'POST' });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(typeof body.error === 'string' ? body.error : `Start failed (${res.status})`);
        }
        setSession(null);
        setMessages([]);
        await consumeStream(res);
    }, [consumeStream, projectId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            try {
                await refreshSession();
                if (cancelled) return;
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error instanceof Error ? error.message : 'Could not load Briefing');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshSession]);

    useEffect(() => {
        if (isLoading || isStreaming || autoStartKey === 0 || startedKeysRef.current.has(autoStartKey)) {
            return;
        }
        if (session?.status === 'active' || session?.status === 'completed') return;
        startedKeysRef.current.add(autoStartKey);
        void startBriefing().catch((error) => {
            toast({
                title: 'Could not start Briefing',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        });
    }, [autoStartKey, isLoading, isStreaming, session?.status, startBriefing, toast]);

    useEffect(() => {
        if (restartKey === 0 || restartedKeysRef.current.has(restartKey)) {
            return;
        }
        if (isStreaming) {
            restartedKeysRef.current.add(restartKey);
            return;
        }
        if (isLoading) return;
        restartedKeysRef.current.add(restartKey);
        void startBriefing().catch((error) => {
            toast({
                title: 'Could not restart Briefing',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        });
    }, [isLoading, isStreaming, restartKey, startBriefing, toast]);

    const lastAssistant = useMemo(
        () => [...messages].reverse().find((message) => message.role === 'assistant'),
        [messages]
    );
    const lastAssistantPrompt = useMemo(
        () => (lastAssistant ? parseBriefingQuestion(lastAssistant.content) : null),
        [lastAssistant]
    );

    useEffect(() => {
        setDraftAnswer(lastAssistant ? parseRecommendedAnswer(lastAssistant.content) : '');
    }, [lastAssistant?.id, lastAssistant?.content]);

    const sendTurn = useCallback(async (content: string, action: 'accept' | 'edit' | 'skip') => {
        if (isStreaming) return;
        setLoadError(null);
        const res = await fetchWithTimeout(`/api/projects/${projectId}/briefing/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, action }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(typeof body.error === 'string' ? body.error : `Briefing message failed (${res.status})`);
        }
        await consumeStream(res);
    }, [consumeStream, isStreaming, projectId]);

    const handleSendTurn = useCallback((content: string, action: 'accept' | 'edit' | 'skip') => {
        void sendTurn(content, action).catch((error) => {
            const message = error instanceof Error ? error.message : 'Briefing message failed';
            setLoadError(message);
            toast({
                title: 'Briefing message failed',
                description: message,
                variant: 'destructive',
            });
        });
    }, [sendTurn, toast]);

    const handleEnd = useCallback(async () => {
        if (!session) return;
        const complete = CATEGORIES.every((category) => session.coverage?.[category]);
        if (!complete && !window.confirm('End Briefing before all categories are covered?')) {
            return;
        }
        const res = await fetchWithTimeout(`/api/projects/${projectId}/briefing/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: complete ? 'agent' : 'user' }),
        });
        if (!res.ok) return;
        await refreshSession();
        onSessionChange?.();
    }, [onSessionChange, projectId, refreshSession, session]);

    const handleRestart = useCallback(() => {
        if (isStreaming) return;
        void startBriefing().catch((error) => {
            toast({
                title: 'Could not restart Briefing',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive',
            });
        });
    }, [isStreaming, startBriefing, toast]);

    const activePromptId = session?.status === 'active' ? lastAssistant?.id : null;
    const visibleMessages = messages.filter(
        (message) =>
            (message.role === 'assistant' || message.role === 'user') &&
            message.id !== activePromptId
    );
    const writeSummary = summariseWrites(messages);
    const sessionCompleted = session?.status === 'completed';

    return (
        <section
            className="flex min-h-[680px] flex-col border border-[var(--sw-rule)] bg-white"
            style={{ maxHeight: 'calc(100vh - 150px)' }}
        >
            <header className="flex items-start justify-between border-b border-[var(--sw-rule)] px-3 py-3">
                <div>
                    <h2
                        className="m-0 text-sm font-semibold text-[var(--sw-ink)]"
                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' }}
                    >
                        Briefing
                    </h2>
                    <p className="mt-1 text-xs text-[var(--sw-muted)]">
                        {sessionCompleted ? 'review' : session?.status === 'active' ? 'live interview' : 'ready'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </header>

            <div className="border-b border-[var(--sw-rule)] px-3 py-2">
                <div className="grid grid-cols-4 gap-1">
                    {CATEGORIES.map((category) => {
                        const covered = Boolean(session?.coverage?.[category]);
                        return (
                            <span
                                key={category}
                                className="px-2 py-1 text-center text-[10px] font-medium uppercase"
                                style={{
                                    fontFamily: 'var(--sw-font-mono)',
                                    background: covered ? 'var(--sw-ink)' : 'var(--sw-paper)',
                                    color: covered ? 'var(--sw-paper)' : 'var(--sw-muted)',
                                    border: '1px solid var(--sw-rule)',
                                }}
                            >
                                {category}
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center text-[var(--sw-muted)]">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Briefing
                    </div>
                ) : sessionCompleted ? (
                    <div className="border border-[var(--sw-rule)] bg-[var(--sw-paper)] p-3">
                        <h3 className="text-sm font-semibold text-[var(--sw-ink)]">Briefing complete</h3>
                        <p className="mt-2 text-sm text-[var(--sw-muted)]">
                            Filled {writeSummary.objectives} objective draft{writeSummary.objectives === 1 ? '' : 's'} and updated {writeSummary.profile} profile field{writeSummary.profile === 1 ? '' : 's'}.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-3 rounded-none"
                            disabled={isStreaming}
                            onClick={handleRestart}
                        >
                            <RotateCw className="mr-1.5 h-4 w-4" />
                            Restart briefing
                        </Button>
                    </div>
                ) : loadError ? (
                    <div className="border border-[var(--sw-rule)] bg-[var(--sw-rose-tint)] p-3">
                        <h3 className="text-sm font-semibold text-[var(--sw-ink)]">
                            Briefing could not load
                        </h3>
                        <p className="mt-2 text-sm text-[var(--sw-muted)]">{loadError}</p>
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-3 rounded-none"
                            onClick={() => {
                                setIsLoading(true);
                                void refreshSession()
                                    .catch((error) =>
                                        setLoadError(error instanceof Error ? error.message : 'Could not load Briefing')
                                    )
                                    .finally(() => setIsLoading(false));
                            }}
                        >
                            Retry
                        </Button>
                    </div>
                ) : null}

                <div className="space-y-3">
                    {visibleMessages.map((message) => (
                        <article
                            key={message.id}
                            className="border border-[var(--sw-rule)] p-3"
                            style={{
                                background: message.role === 'assistant' ? 'var(--sw-paper-2)' : 'white',
                            }}
                        >
                            <div
                                className="mb-2 text-[10px] font-semibold uppercase text-[var(--sw-muted)]"
                                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
                            >
                                {message.role}
                            </div>
                            <BriefingMessageBody message={message} />
                        </article>
                    ))}
                </div>
            </div>

            {session?.status === 'active' && (
                <footer className="border-t border-[var(--sw-rule)] p-3">
                    {lastAssistant && (
                        <div className="space-y-3">
                            <div className="border border-[var(--sw-rule)] bg-[var(--sw-paper)] p-3">
                                <div
                                    className="mb-2 text-[10px] font-semibold uppercase text-[var(--sw-muted)]"
                                    style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
                                >
                                    Current question
                                </div>
                                {lastAssistantPrompt?.question ? (
                                    <p className="mb-3 text-sm font-medium leading-6 text-[var(--sw-ink)]">
                                        {lastAssistantPrompt.question}
                                    </p>
                                ) : (
                                    <p className="mb-3 text-sm leading-6 text-[var(--sw-muted)]">
                                        {lastAssistant.content || 'Preparing next question...'}
                                    </p>
                                )}
                                {lastAssistantPrompt?.options.length ? (
                                    <div className="grid gap-2">
                                        {lastAssistantPrompt.options.map((option) => {
                                            const selected = draftAnswer.trim() === option;
                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    disabled={isStreaming}
                                                    onClick={() => setDraftAnswer(option)}
                                                    className="min-h-10 border px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                                                    style={{
                                                        borderColor: selected ? 'var(--sw-ink)' : 'var(--sw-rule)',
                                                        background: selected ? 'var(--sw-ink)' : 'white',
                                                        color: selected ? 'var(--sw-paper)' : 'var(--sw-ink)',
                                                    }}
                                                >
                                                    {option}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}
                                {lastAssistantPrompt?.source ? (
                                    <p className="mt-2 text-xs text-[var(--sw-muted)]">
                                        Source: {lastAssistantPrompt.source}
                                    </p>
                                ) : null}
                            </div>
                            <textarea
                                value={draftAnswer}
                                onChange={(event) => setDraftAnswer(event.target.value)}
                                rows={2}
                                placeholder="Answer or edit the selected answer"
                                className="w-full resize-none border border-[var(--sw-rule)] bg-white px-3 py-2 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-ink)]"
                            />
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                                <Button
                                    type="button"
                                    className="rounded-none"
                                    disabled={isStreaming || !draftAnswer.trim()}
                                    onClick={() => handleSendTurn(draftAnswer, 'edit')}
                                >
                                    {isStreaming ? (
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="mr-1.5 h-4 w-4" />
                                    )}
                                    Submit
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-none"
                                    disabled={isStreaming}
                                    onClick={() => handleSendTurn('', 'skip')}
                                >
                                    <SkipForward className="mr-1.5 h-4 w-4" />
                                    Skip
                                </Button>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleEnd}
                        className="mt-3 text-xs text-[var(--sw-muted)] underline underline-offset-2"
                    >
                        End briefing
                    </button>
                </footer>
            )}
        </section>
    );
}

function BriefingMessageBody({ message }: { message: BriefingMessage }) {
    if (message.role !== 'assistant') {
        return (
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--sw-ink)]">
                {message.content}
            </p>
        );
    }

    const parsed = parseBriefingQuestion(message.content);
    if (!parsed.question) {
        return (
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--sw-ink)]">
                {message.content}
            </p>
        );
    }

    return (
        <div className="space-y-2 text-sm text-[var(--sw-ink)]">
            <p className="m-0 leading-6">{parsed.question}</p>
            {parsed.options.length > 0 ? (
                <div className="grid gap-1.5">
                    {parsed.options.map((option) => (
                        <div
                            key={option}
                            className="border border-[var(--sw-rule)] bg-white px-2 py-1.5 text-xs"
                        >
                            {option}
                        </div>
                    ))}
                </div>
            ) : null}
            {parsed.recommendedAnswer ? (
                <p className="m-0 text-xs text-[var(--sw-muted)]">
                    Recommended: {parsed.recommendedAnswer}
                </p>
            ) : null}
            {parsed.source ? (
                <p className="m-0 text-xs text-[var(--sw-muted)]">
                    Source: {parsed.source}
                </p>
            ) : null}
        </div>
    );
}
