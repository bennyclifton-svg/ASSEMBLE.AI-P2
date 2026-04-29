import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChatDock } from '../ChatDock';

const mockUseChatStream = jest.fn();

jest.mock('@/lib/hooks/use-chat-stream', () => ({
    useChatStream: () => mockUseChatStream(),
}));

jest.mock('../MessageList', () => ({
    MessageList: ({ approvals }: { approvals: Record<string, unknown> }) => (
        <div data-testid="message-list">{Object.keys(approvals).join(',')}</div>
    ),
}));

beforeEach(() => {
    jest.clearAllMocks();
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

describe('ChatDock approvals', () => {
    it('hydrates pending approval cards from the thread response', async () => {
        render(<ChatDock projectId="proj-1" />);

        fireEvent.click(screen.getByTestId('chat-dock-toggle'));

        await waitFor(() => {
            expect(screen.getByTestId('message-list')).toHaveTextContent('approval-1');
        });
    });
});
