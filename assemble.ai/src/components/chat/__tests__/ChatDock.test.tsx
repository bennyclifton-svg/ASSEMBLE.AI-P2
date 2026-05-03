import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatDock } from '../ChatDock';
import { DOCUMENT_SELECTION_CHANGED_EVENT } from '@/lib/chat/document-selection-events';

const mockUseChatStream = jest.fn();

jest.mock('@/lib/hooks/use-chat-stream', () => ({
    useChatStream: () => mockUseChatStream(),
}));

jest.mock('../MessageList', () => ({
    MessageList: ({
        messages,
        approvals,
        pendingStatus,
    }: {
        messages: Array<{ content: string }>;
        approvals: Record<string, unknown>;
        pendingStatus?: string | null;
    }) => (
        <div data-testid="message-list">
            {pendingStatus && <span data-testid="pending-status">{pendingStatus}</span>}
            {messages.map((message) => message.content).join('|')}
            {Object.keys(approvals).join(',')}
        </div>
    ),
}));

beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/');
    mockUseChatStream.mockReturnValue({
        isConnected: true,
        activeRun: null,
        approvals: {},
        lastAssistantMessageId: null,
        error: null,
    });
    global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                threads: [{ id: 'thread-1', title: 'Thread', projectId: 'proj-1' }],
            }),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                thread: { id: 'thread-1' },
                messages: [],
                pendingApprovals: [
                    {
                        id: 'approval-1',
                        runId: 'run-1',
                        toolName: 'record_invoice',
                        proposedDiff: {
                            entity: 'invoice',
                            entityId: null,
                            summary: 'Record invoice',
                            changes: [],
                        },
                    },
                ],
            }),
        }) as jest.Mock;
    global.ResizeObserver = class {
        observe() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
});

describe('ChatDock approvals', () => {
    it('renders inside the center panel anchor when that panel is available', async () => {
        const anchor = document.createElement('div');
        anchor.setAttribute('data-chat-dock-anchor', 'center');
        document.body.appendChild(anchor);

        try {
            render(<ChatDock projectId="proj-1" />);

            await waitFor(() => {
                expect(screen.getByTestId('chat-dock').parentElement).toBe(anchor);
            });
        } finally {
            anchor.remove();
        }
    });

    it('hydrates pending approval cards from the thread response', async () => {
        render(<ChatDock projectId="proj-1" />);

        fireEvent.click(screen.getByTestId('chat-dock-toggle'));

        await waitFor(() => {
            expect(screen.getByTestId('message-list')).toHaveTextContent('approval-1');
        });
    });

    it('does not show bulk approval controls', async () => {
        render(<ChatDock projectId="proj-1" />);

        fireEvent.click(screen.getByTestId('chat-dock-toggle'));

        await waitFor(() => {
            expect(screen.getByTestId('message-list')).toHaveTextContent('approval-1');
        });
        expect(screen.queryByTestId('approval-bulk-actions')).not.toBeInTheDocument();
        expect(screen.queryByTestId('approval-chip-approve-all')).not.toBeInTheDocument();
    });

    it('compacts stale workflow chatter from saved thread messages', async () => {
        (global.fetch as jest.Mock).mockReset();
        const prompt =
            'Client asked for extra acoustic treatment to meeting rooms. Please issue a variation for about $18,750.';
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    threads: [{ id: 'thread-1', title: 'Thread', projectId: 'proj-1' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    thread: { id: 'thread-1' },
                    messages: [
                        {
                            id: 'retry-1',
                            role: 'user',
                            content: prompt,
                            agentName: null,
                            createdAt: '2026-05-02T00:59:00.000Z',
                        },
                        {
                            id: 'workflow-failure',
                            role: 'assistant',
                            content:
                                "I routed this to Finance Agent.\n\nI'm currently unable to issue the variation due to a technical error in the workflow process.",
                            agentName: 'orchestrator',
                            createdAt: '2026-05-02T01:00:00.000Z',
                        },
                        {
                            id: 'raw-db-error',
                            role: 'assistant',
                            content:
                                'I could not create an approval card. Failed query: insert into "action_invocations" (...) params: secret-values',
                            agentName: 'orchestrator',
                            createdAt: '2026-05-02T01:00:10.000Z',
                        },
                        {
                            id: 'retry-2',
                            role: 'user',
                            content: prompt,
                            agentName: null,
                            createdAt: '2026-05-02T01:00:30.000Z',
                        },
                        {
                            id: 'bad-claim',
                            role: 'assistant',
                            content: "I've put the proposed change in the approval card above.",
                            agentName: 'orchestrator',
                            createdAt: '2026-05-02T01:00:00.000Z',
                        },
                        {
                            id: 'blank',
                            role: 'assistant',
                            content: '   ',
                            agentName: 'orchestrator',
                            createdAt: '2026-05-02T01:01:00.000Z',
                        },
                        {
                            id: 'retry-3',
                            role: 'user',
                            content: prompt,
                            agentName: null,
                            createdAt: '2026-05-02T01:01:30.000Z',
                        },
                        {
                            id: 'real',
                            role: 'assistant',
                            content: 'Please confirm the cost-line mapping.',
                            agentName: 'orchestrator',
                            createdAt: '2026-05-02T01:02:00.000Z',
                        },
                    ],
                    pendingApprovals: [],
                }),
            });

        render(<ChatDock projectId="proj-1" />);
        fireEvent.click(screen.getByTestId('chat-dock-toggle'));

        await waitFor(() => {
            expect(screen.getByTestId('message-list')).toHaveTextContent(
                'Please confirm the cost-line mapping.'
            );
        });
        const transcript = screen.getByTestId('message-list').textContent ?? '';
        expect(transcript).not.toContain('approval card above');
        expect(transcript).not.toContain('technical error in the workflow process');
        expect(transcript).not.toContain('insert into "action_invocations"');
        expect(transcript.match(/extra acoustic treatment/g)).toHaveLength(1);
    });

    it('shows streamed agent run errors in the dock', async () => {
        mockUseChatStream.mockReturnValue({
            isConnected: true,
            activeRun: null,
            approvals: {},
            lastAssistantMessageId: null,
            error: 'Agent run failed',
        });

        render(<ChatDock projectId="proj-1" />);
        fireEvent.click(screen.getByTestId('chat-dock-toggle'));

        expect(await screen.findByText('Agent run failed')).toBeInTheDocument();
    });

    it('rehydrates pending approvals shortly after sending in case SSE missed the event', async () => {
        jest.useFakeTimers();
        window.history.replaceState(null, '', '/projects/proj-1?tab=brief&sub=objectives');
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    threads: [{ id: 'thread-1', title: 'Thread', projectId: 'proj-1' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    thread: { id: 'thread-1' },
                    messages: [],
                    pendingApprovals: [],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: {
                        id: 'message-1',
                        createdAt: '2026-04-30T00:00:00.000Z',
                    },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    thread: { id: 'thread-1' },
                    messages: [],
                    pendingApprovals: [
                        {
                            id: 'approval-2',
                            runId: 'run-2',
                            toolName: 'create_variation',
                            proposedDiff: {
                                entity: 'variation',
                                entityId: null,
                                summary: 'Create variation',
                                changes: [],
                            },
                        },
                    ],
                }),
            });

        render(<ChatDock projectId="proj-1" />);
        fireEvent.click(screen.getByTestId('chat-dock-toggle'));

        await waitFor(() => {
            expect(screen.getByTestId('message-list')).toHaveTextContent('');
        });

        fireEvent.change(screen.getByTestId('chat-dock-input'), {
            target: { value: 'Add a variation' },
        });
        fireEvent.click(screen.getByTestId('chat-dock-send'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });
        const sendBody = JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body);
        expect(sendBody.viewContext).toEqual(
            expect.objectContaining({
                projectId: 'proj-1',
                route: '/projects/proj-1?tab=brief&sub=objectives',
                tab: 'brief',
                sub: 'objectives',
            })
        );

        expect(screen.getByTestId('pending-status')).toHaveTextContent('Assistant is working...');

        await act(async () => {
            jest.advanceTimersByTime(800);
        });

        await waitFor(() => {
            expect(screen.getByTestId('message-list')).toHaveTextContent('approval-2');
        });
        expect(screen.queryByTestId('pending-status')).not.toBeInTheDocument();

        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('replays document selection UI actions shortly after sending', async () => {
        jest.useFakeTimers();
        window.history.replaceState(null, '', '/projects/proj-1?tab=documents');
        const onSelection = jest.fn();
        window.addEventListener(DOCUMENT_SELECTION_CHANGED_EVENT, onSelection);

        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    threads: [{ id: 'thread-1', title: 'Thread', projectId: 'proj-1' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    thread: { id: 'thread-1' },
                    messages: [],
                    pendingApprovals: [],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: {
                        id: 'message-1',
                        createdAt: '2026-04-30T00:00:00.000Z',
                    },
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    thread: { id: 'thread-1' },
                    messages: [],
                    pendingApprovals: [],
                    documentSelections: [
                        {
                            projectId: 'proj-1',
                            mode: 'replace',
                            documentIds: ['doc-1', 'doc-2'],
                            createdAt: '2026-04-30T00:00:01.000Z',
                        },
                    ],
                }),
            });

        try {
            render(<ChatDock projectId="proj-1" />);
            fireEvent.click(screen.getByTestId('chat-dock-toggle'));

            await waitFor(() => {
                expect(screen.getByTestId('message-list')).toBeInTheDocument();
            });

            fireEvent.change(screen.getByTestId('chat-dock-input'), {
                target: { value: 'select all documents' },
            });
            fireEvent.click(screen.getByTestId('chat-dock-send'));

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(3);
            });

            await act(async () => {
                jest.advanceTimersByTime(800);
            });

            await waitFor(() => {
                expect(onSelection).toHaveBeenCalledTimes(1);
            });
            const event = onSelection.mock.calls[0][0] as CustomEvent;
            expect(event.detail).toEqual({
                projectId: 'proj-1',
                mode: 'replace',
                documentIds: ['doc-1', 'doc-2'],
            });
        } finally {
            window.removeEventListener(DOCUMENT_SELECTION_CHANGED_EVENT, onSelection);
            jest.clearAllTimers();
            jest.useRealTimers();
        }
    });
});
