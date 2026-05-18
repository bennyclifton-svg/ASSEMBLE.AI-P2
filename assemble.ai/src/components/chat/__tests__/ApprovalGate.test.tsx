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

    it('shows plain-language apply progress while a document sync approval is running', async () => {
        let resolveFetch!: (value: Response) => void;
        global.fetch = jest.fn().mockImplementation(
            () =>
                new Promise<Response>((resolve) => {
                    resolveFetch = resolve;
                })
        ) as jest.Mock;

        render(
            <ApprovalGate
                approval={{
                    ...approval(),
                    toolName: 'sync_project_documents_to_ai',
                    proposedDiff: {
                        entity: 'document',
                        entityId: null,
                        summary: 'Sync documents to AI',
                        changes: [],
                    },
                }}
            />
        );

        fireEvent.click(screen.getByTestId('approve-approval-1'));

        expect(await screen.findByText('Queueing the selected documents for AI sync and refreshing the Document repo.')).toBeInTheDocument();

        resolveFetch({
            ok: true,
            status: 200,
            json: async () => ({ status: 'applied', output: { projectId: 'project-1' } }),
        } as Response);

        await waitFor(() => {
            expect(screen.getByText('Applied')).toBeInTheDocument();
        });
    });

    it('renders rich-text approval diff values as readable text', () => {
        render(
            <ApprovalGate
                approval={{
                    ...approval(),
                    toolName: 'update_rft_brief',
                    proposedDiff: {
                        entity: 'stakeholder',
                        entityId: 'stakeholder-electrical',
                        summary: 'Create RFT brief - Electrical',
                        changes: [
                            {
                                field: 'briefServices',
                                label: 'Brief services',
                                before: null,
                                after:
                                    '<p><strong>Electrical</strong></p><ul><li><p>Develop electrical design documentation</p></li><li><p>Coordinate with architectural layouts</p></li></ul>',
                            },
                        ],
                    },
                }}
            />
        );

        expect(screen.getAllByText(/Electrical/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Develop electrical design documentation/)).toBeInTheDocument();
        expect(screen.queryByText(/<p>/)).not.toBeInTheDocument();
        expect(screen.queryByText(/<\/li>/)).not.toBeInTheDocument();
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

    it('refreshes RFT records after applying update_rft_brief', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                status: 'applied',
                output: {
                    id: 'stakeholder-electrical',
                    projectId: 'project-1',
                    stakeholderId: 'stakeholder-electrical',
                    rftId: 'rft-1',
                    createdRftId: 'rft-1',
                },
            }),
        }) as jest.Mock;

        render(
            <ApprovalGate
                approval={{
                    ...approval(),
                    toolName: 'update_rft_brief',
                    proposedDiff: {
                        entity: 'stakeholder',
                        entityId: 'stakeholder-electrical',
                        summary: 'Create RFT brief - Electrical',
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
            '/api/projects/project-1/stakeholders/stakeholder-electrical'
        );
        expect(mockGlobalMutate).toHaveBeenCalledWith(
            '/api/rft-new?projectId=project-1&stakeholderId=stakeholder-electrical'
        );
        expect(mockGlobalMutate).toHaveBeenCalledWith(expect.any(Function));
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
