/**
 * useChatStream — subscribes to /api/chat/threads/[threadId]/stream and
 * surfaces a structured live state for the ChatDock to render.
 *
 * Modelled on use-report-stream.ts.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dispatchDocumentSelectionChanged } from '@/lib/chat/document-selection-events';

export type ChatStreamEvent =
    | { type: 'connected'; threadId: string }
    | { type: 'run_started'; runId: string; agentName: string }
    | { type: 'agent_thinking'; runId: string; turn: number }
    | { type: 'tool_call_started'; runId: string; toolCallId: string; toolName: string; input: unknown }
    | {
          type: 'tool_call_finished';
          runId: string;
          toolCallId: string;
          toolName: string;
          status: 'complete' | 'error';
          durationMs: number;
          error?: string;
      }
    | {
          type: 'awaiting_approval';
          runId: string;
          approvalId: string;
          toolName: string;
          proposedDiff: unknown;
          createdAt?: string | Date | null;
      }
    | {
          type: 'approval_resolved';
          approvalId: string;
          status: 'applied' | 'rejected' | 'conflict';
          appliedOutput?: unknown;
          error?: string;
      }
    | {
          type: 'document_selection_changed';
          projectId: string;
          mode: 'replace' | 'add' | 'remove' | 'clear';
          documentIds: string[];
      }
    | { type: 'assistant_message'; runId: string; messageId: string; content: string }
    | {
          type: 'run_finished';
          runId: string;
          status: 'complete' | 'error';
          stopReason: string | null;
          inputTokens: number;
          outputTokens: number;
          error?: string;
      };

export interface ToolCallView {
    id: string;
    name: string;
    input: unknown;
    status: 'running' | 'complete' | 'error';
    durationMs: number | null;
    error: string | null;
}

export interface ActiveRunView {
    runId: string;
    agentName: string;
    turn: number;
    toolCalls: ToolCallView[];
    isThinking: boolean;
}

export interface PendingApprovalView {
    id: string;
    runId: string;
    toolName: string;
    proposedDiff: unknown;
    createdAt?: string | Date | null;
    /** Resolution status, set when an approval_resolved event arrives. */
    resolution: null | {
        status: 'applied' | 'rejected' | 'conflict';
        appliedOutput?: unknown;
        error?: string;
    };
}

export interface ChatStreamState {
    isConnected: boolean;
    activeRun: ActiveRunView | null;
    /** Approvals proposed in this connection, keyed by approvalId. */
    approvals: Record<string, PendingApprovalView>;
    /** Most recent assistant message id from the SSE stream — useful as a refetch signal. */
    lastAssistantMessageId: string | null;
    error: string | null;
}

const INITIAL_STATE: ChatStreamState = {
    isConnected: false,
    activeRun: null,
    approvals: {},
    lastAssistantMessageId: null,
    error: null,
};

export function useChatStream(threadId: string | null) {
    const [state, setState] = useState<ChatStreamState>(INITIAL_STATE);
    const sourceRef = useRef<EventSource | null>(null);

    const apply = useCallback((event: ChatStreamEvent) => {
        if (event.type === 'document_selection_changed') {
            dispatchDocumentSelectionChanged({
                projectId: event.projectId,
                mode: event.mode,
                documentIds: event.documentIds,
            });
            return;
        }

        setState((prev) => {
            switch (event.type) {
                case 'connected':
                    return { ...prev, isConnected: true, error: null };
                case 'run_started':
                    return {
                        ...prev,
                        activeRun: {
                            runId: event.runId,
                            agentName: event.agentName,
                            turn: 0,
                            toolCalls: [],
                            isThinking: true,
                        },
                    };
                case 'agent_thinking':
                    if (!prev.activeRun || prev.activeRun.runId !== event.runId) return prev;
                    return {
                        ...prev,
                        activeRun: { ...prev.activeRun, turn: event.turn, isThinking: true },
                    };
                case 'tool_call_started':
                    if (!prev.activeRun || prev.activeRun.runId !== event.runId) return prev;
                    return {
                        ...prev,
                        activeRun: {
                            ...prev.activeRun,
                            isThinking: false,
                            toolCalls: [
                                ...prev.activeRun.toolCalls,
                                {
                                    id: event.toolCallId,
                                    name: event.toolName,
                                    input: event.input,
                                    status: 'running',
                                    durationMs: null,
                                    error: null,
                                },
                            ],
                        },
                    };
                case 'tool_call_finished':
                    if (!prev.activeRun || prev.activeRun.runId !== event.runId) return prev;
                    return {
                        ...prev,
                        activeRun: {
                            ...prev.activeRun,
                            isThinking: true,
                            toolCalls: prev.activeRun.toolCalls.map((tc) =>
                                tc.id === event.toolCallId
                                    ? {
                                          ...tc,
                                          status: event.status,
                                          durationMs: event.durationMs,
                                          error: event.error ?? null,
                                      }
                                    : tc
                            ),
                        },
                    };
                case 'awaiting_approval':
                    return {
                        ...prev,
                        approvals: {
                            ...prev.approvals,
                            [event.approvalId]: {
                                id: event.approvalId,
                                runId: event.runId,
                                toolName: event.toolName,
                                proposedDiff: event.proposedDiff,
                                createdAt: event.createdAt ?? new Date().toISOString(),
                                resolution: null,
                            },
                        },
                    };
                case 'approval_resolved': {
                    const existing = prev.approvals[event.approvalId];
                    return {
                        ...prev,
                        approvals: {
                            ...prev.approvals,
                            [event.approvalId]: {
                                ...(existing ?? {
                                    id: event.approvalId,
                                    runId: '',
                                    toolName: '',
                                    proposedDiff: null,
                                    createdAt: new Date().toISOString(),
                                }),
                                resolution: {
                                    status: event.status,
                                    appliedOutput: event.appliedOutput,
                                    error: event.error,
                                },
                            },
                        },
                    };
                }
                case 'assistant_message':
                    return { ...prev, lastAssistantMessageId: event.messageId };
                case 'run_finished':
                    return {
                        ...prev,
                        activeRun: null,
                        error: event.error ?? null,
                    };
                default:
                    return prev;
            }
        });
    }, []);

    useEffect(() => {
        if (!threadId) return;
        // The stream state is scoped to a single thread; clear stale run/approval state before subscribing.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(INITIAL_STATE);

        const source = new EventSource(`/api/chat/threads/${threadId}/stream`);
        sourceRef.current = source;

        const types: ChatStreamEvent['type'][] = [
            'connected',
            'run_started',
            'agent_thinking',
            'tool_call_started',
            'tool_call_finished',
            'awaiting_approval',
            'approval_resolved',
            'document_selection_changed',
            'assistant_message',
            'run_finished',
        ];

        const listeners: Array<{ name: string; fn: (e: MessageEvent) => void }> = [];
        for (const t of types) {
            const fn = (e: MessageEvent) => {
                try {
                    apply({ type: t, ...JSON.parse(e.data) } as ChatStreamEvent);
                } catch (err) {
                    console.error(`[useChatStream] failed to parse ${t} event`, err);
                }
            };
            source.addEventListener(t, fn as EventListener);
            listeners.push({ name: t, fn });
        }

        source.onerror = () => {
            setState((prev) => ({ ...prev, isConnected: false }));
        };

        return () => {
            for (const { name, fn } of listeners) {
                source.removeEventListener(name, fn as EventListener);
            }
            source.close();
            sourceRef.current = null;
        };
    }, [threadId, apply]);

    return state;
}
