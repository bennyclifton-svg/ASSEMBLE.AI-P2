import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import type { ActiveRunView, PendingApprovalView } from '@/lib/hooks/use-chat-stream';

beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
});

function approval(
    id: string,
    resolution: PendingApprovalView['resolution'],
    createdAt: string | null = null
): PendingApprovalView {
    return {
        id,
        runId: 'run-1',
        toolName: 'update_cost_line',
        proposedDiff: {
            entity: 'cost_line',
            entityId: 'cl-1',
            summary: `Approval ${id}`,
            changes: [
                {
                    field: 'budgetCents',
                    label: 'Budget',
                    before: '$1,000',
                    after: '$2,000',
                },
            ],
        },
        createdAt,
        resolution,
    };
}

describe('MessageList approvals', () => {
    it('shows local pending feedback before a streamed run starts', () => {
        render(
            <MessageList
                messages={[]}
                activeRun={null}
                approvals={{}}
                pendingStatus="Assistant is working..."
            />
        );

        expect(screen.getByTestId('chat-pending-status')).toHaveTextContent(
            'Assistant is working...'
        );
        expect(
            screen.queryByText('Ask the Finance agent about your cost plan or project documents.')
        ).not.toBeInTheDocument();
    });

    it('shows plain-language live tool activity while the agent is working', () => {
        const activeRun: ActiveRunView = {
            runId: 'run-1',
            agentName: 'design',
            turn: 1,
            isThinking: true,
            toolCalls: [
                {
                    id: 'tool-1',
                    name: 'list_project_documents',
                    input: { disciplineOrTrade: 'Electrical' },
                    status: 'complete',
                    durationMs: 52,
                    error: null,
                },
                {
                    id: 'tool-2',
                    name: 'sync_project_documents_to_ai',
                    input: { documentIds: ['doc-1', 'doc-2'], documentSetName: 'Electrical AI Documents' },
                    status: 'running',
                    durationMs: null,
                    error: null,
                },
            ],
        };

        render(
            <MessageList
                messages={[]}
                activeRun={activeRun}
                approvals={{}}
            />
        );

        expect(screen.getByText('Working through the next project command')).toBeInTheDocument();
        expect(screen.getByText('1/2 steps complete - 1 running')).toBeInTheDocument();
        expect(screen.getByText('Reading document repository')).toBeInTheDocument();
        expect(screen.getByText('Looking through uploaded documents for "Electrical".')).toBeInTheDocument();
        expect(screen.getByText('Preparing AI document sync')).toBeInTheDocument();
        expect(screen.getByText('Preparing to sync 2 documents into Electrical AI Documents.')).toBeInTheDocument();
    });

    it('keeps resolved approval cards visible so users see the apply result', () => {
        render(
            <MessageList
                messages={[]}
                activeRun={null}
                approvals={{
                    applied: approval('applied', { status: 'applied' }),
                    pending: approval('pending', null),
                }}
            />
        );

        expect(screen.getByText('Approval pending')).toBeInTheDocument();
        expect(screen.getByText('Approval applied')).toBeInTheDocument();
        expect(screen.getByText('Applied')).toBeInTheDocument();
    });

    it('interleaves approval cards with later chat messages by timestamp', () => {
        render(
            <MessageList
                messages={[
                    {
                        id: 'message-before',
                        role: 'user',
                        content: 'Before approval',
                        agentName: null,
                        createdAt: '2026-05-02T01:00:00.000Z',
                    },
                    {
                        id: 'message-after',
                        role: 'user',
                        content: 'After approval',
                        agentName: null,
                        createdAt: '2026-05-02T01:02:00.000Z',
                    },
                ]}
                activeRun={null}
                approvals={{
                    pending: approval('pending', null, '2026-05-02T01:01:00.000Z'),
                }}
            />
        );

        const before = screen.getByText('Before approval');
        const card = screen.getByText('Approval pending');
        const after = screen.getByText('After approval');

        expect(before.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(card.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('hides workflow scaffold chatter after all approval cards resolve', () => {
        const scaffold =
            'I prepared the contractor variation workflow for review. Start with the available approval card, then the dependent steps will unlock in order.';

        const { rerender } = render(
            <MessageList
                messages={[
                    {
                        id: 'scaffold',
                        role: 'assistant',
                        content: scaffold,
                        agentName: 'delivery',
                        createdAt: '2026-05-07T01:00:00.000Z',
                    },
                ]}
                activeRun={null}
                approvals={{
                    pending: approval('pending', null, '2026-05-07T01:01:00.000Z'),
                }}
            />
        );

        expect(screen.getByText(scaffold)).toBeInTheDocument();

        rerender(
            <MessageList
                messages={[
                    {
                        id: 'scaffold',
                        role: 'assistant',
                        content: scaffold,
                        agentName: 'delivery',
                        createdAt: '2026-05-07T01:00:00.000Z',
                    },
                ]}
                activeRun={null}
                approvals={{
                    applied: approval('applied', { status: 'applied' }, '2026-05-07T01:01:00.000Z'),
                }}
            />
        );

        expect(screen.queryByText(scaffold)).not.toBeInTheDocument();
        expect(screen.getByText('Approval applied')).toBeInTheDocument();
    });
});
