import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import type { PendingApprovalView } from '@/lib/hooks/use-chat-stream';

beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
});

function approval(
    id: string,
    resolution: PendingApprovalView['resolution']
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
        resolution,
    };
}

describe('MessageList approvals', () => {
    it('renders only unresolved approval cards in the live approval area', () => {
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
        expect(screen.queryByText('Approval applied')).not.toBeInTheDocument();
        expect(screen.queryByText('Applied')).not.toBeInTheDocument();
    });
});
