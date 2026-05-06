import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApprovalGate } from '../ApprovalGate';
import type { PendingApprovalView } from '@/lib/hooks/use-chat-stream';
import { ADDENDUM_CREATED_EVENT } from '@/lib/chat/addendum-events';
import { TENDER_FIRMS_ADDED_EVENT } from '@/lib/chat/tender-firms-events';

const mockGlobalMutate = jest.fn();

jest.mock('swr', () => ({
    mutate: (...args: unknown[]) => mockGlobalMutate(...args),
}));

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

    it('refreshes and focuses procurement addenda after applying create_addendum', async () => {
        const onAddendumCreated = jest.fn();
        window.addEventListener(ADDENDUM_CREATED_EVENT, onAddendumCreated);
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'applied',
                output: {
                    id: 'addendum-2',
                    projectId: 'project-1',
                    stakeholderId: 'stakeholder-structural',
                },
            }),
        }) as jest.Mock;

        try {
            render(
                <ApprovalGate
                    approval={{
                        ...approval(),
                        toolName: 'create_addendum',
                        proposedDiff: {
                            entity: 'addendum',
                            entityId: null,
                            summary: 'Create addendum - Structural Update',
                            changes: [],
                        },
                    }}
                />
            );

            fireEvent.click(screen.getByTestId('approve-approval-1'));

            await waitFor(() => {
                expect(screen.getByText('Applied')).toBeInTheDocument();
            });
            expect(mockGlobalMutate).toHaveBeenCalledWith(
                '/api/addenda?projectId=project-1&stakeholderId=stakeholder-structural'
            );
            expect(mockGlobalMutate).toHaveBeenCalledWith('/api/addenda/addendum-2');
            expect(mockGlobalMutate).toHaveBeenCalledWith('/api/addenda/addendum-2/transmittal');
            expect(onAddendumCreated).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        projectId: 'project-1',
                        stakeholderId: 'stakeholder-structural',
                        addendumId: 'addendum-2',
                    },
                })
            );
        } finally {
            window.removeEventListener(ADDENDUM_CREATED_EVENT, onAddendumCreated);
        }
    });

    it('refreshes tender firm panels after applying add_tender_firms', async () => {
        const onTenderFirmsAdded = jest.fn();
        window.addEventListener(TENDER_FIRMS_ADDED_EVENT, onTenderFirmsAdded);
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'applied',
                output: {
                    projectId: 'project-1',
                    firmType: 'contractor',
                    disciplineOrTrade: 'Mechanical',
                    firmIds: ['firm-1', 'firm-2', 'firm-3'],
                },
            }),
        }) as jest.Mock;

        try {
            render(
                <ApprovalGate
                    approval={{
                        ...approval(),
                        toolName: 'add_tender_firms',
                        proposedDiff: {
                            entity: 'tender_firm',
                            entityId: null,
                            summary: 'Add 3 tender firms - Mechanical contractor tender panel',
                            changes: [],
                        },
                    }}
                />
            );

            fireEvent.click(screen.getByTestId('approve-approval-1'));

            await waitFor(() => {
                expect(screen.getByText('Applied')).toBeInTheDocument();
            });
            expect(mockGlobalMutate).toHaveBeenCalledWith(
                '/api/contractors/firms?projectId=project-1&trade=Mechanical'
            );
            expect(onTenderFirmsAdded).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        projectId: 'project-1',
                        firmType: 'contractor',
                        disciplineOrTrade: 'Mechanical',
                        firmIds: ['firm-1', 'firm-2', 'firm-3'],
                    },
                })
            );
        } finally {
            window.removeEventListener(TENDER_FIRMS_ADDED_EVENT, onTenderFirmsAdded);
        }
    });

    it('refreshes project reports after applying create_report', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'applied',
                output: {
                    id: 'report-1',
                    projectId: 'project-1',
                    groupId: 'group-1',
                    title: 'May 2026 Monthly PCG Report',
                },
            }),
        }) as jest.Mock;

        render(
            <ApprovalGate
                approval={{
                    ...approval(),
                    toolName: 'create_report',
                    proposedDiff: {
                        entity: 'report',
                        entityId: null,
                        summary: 'Create report - May 2026 Monthly PCG Report',
                        changes: [],
                    },
                }}
            />
        );

        fireEvent.click(screen.getByTestId('approve-approval-1'));

        await waitFor(() => {
            expect(screen.getByText('Applied')).toBeInTheDocument();
        });
        expect(mockGlobalMutate).toHaveBeenCalledWith('/api/project-reports?projectId=project-1');
        expect(mockGlobalMutate).toHaveBeenCalledWith(
            '/api/project-reports?projectId=project-1&groupId=group-1'
        );
        expect(mockGlobalMutate).toHaveBeenCalledWith('/api/project-reports/report-1');
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
