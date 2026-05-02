import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApprovalGate } from '../ApprovalGate';
import type { PendingApprovalView } from '@/lib/hooks/use-chat-stream';

function approval(): PendingApprovalView {
    return {
        id: 'approval-1',
        runId: 'run-1',
        toolName: 'create_note',
        proposedDiff: {
            entity: 'note',
            entityId: null,
            summary: 'Create note - Mech Spec Review 100',
            changes: [
                {
                    field: 'title',
                    label: 'Title',
                    before: '-',
                    after: 'Mech Spec Review 100',
                },
            ],
        },
        resolution: null,
    };
}

describe('ApprovalGate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows applied feedback from the response even before an SSE update arrives', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ status: 'applied', output: { id: 'note-1' } }),
        }) as jest.Mock;

        render(<ApprovalGate approval={approval()} />);

        fireEvent.click(screen.getByTestId('approve-approval-1'));

        await waitFor(() => {
            expect(screen.getByText('Applied')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('approve-approval-1')).not.toBeInTheDocument();
    });

    it('shows a conflict message when the approval cannot be applied', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 410,
            json: async () => ({ status: 'gone', error: 'Document no longer exists.' }),
        }) as jest.Mock;

        render(<ApprovalGate approval={approval()} />);

        fireEvent.click(screen.getByTestId('approve-approval-1'));

        await waitFor(() => {
            expect(screen.getByText('Document no longer exists.')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('approve-approval-1')).not.toBeInTheDocument();
    });
});
