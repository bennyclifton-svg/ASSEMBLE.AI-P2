import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RfiRegisterPanel } from '../RfiRegisterPanel';
import { useRfiExportMutations, useRfiExports, useRfiMutations, useRfis } from '@/lib/hooks/use-rfis';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import type { RfiRecord } from '@/types/rfi';

jest.mock('@/lib/hooks/use-rfis', () => ({
    useRfiExportMutations: jest.fn(),
    useRfiExports: jest.fn(),
    useRfis: jest.fn(),
    useRfiMutations: jest.fn(),
}));

jest.mock('@/lib/hooks/use-stakeholders', () => ({
    useStakeholders: jest.fn(),
}));

const mockUseRfis = useRfis as jest.MockedFunction<typeof useRfis>;
const mockUseRfiMutations = useRfiMutations as jest.MockedFunction<typeof useRfiMutations>;
const mockUseRfiExports = useRfiExports as jest.MockedFunction<typeof useRfiExports>;
const mockUseRfiExportMutations = useRfiExportMutations as jest.MockedFunction<typeof useRfiExportMutations>;
const mockUseStakeholders = useStakeholders as jest.MockedFunction<typeof useStakeholders>;

function rfi(overrides: Partial<RfiRecord> & { id: string; rfiNumber: number; title: string }): RfiRecord {
    return {
        id: overrides.id,
        projectId: 'project-1',
        organizationId: 'org-1',
        rfiNumber: overrides.rfiNumber,
        reference: `RFI-${String(overrides.rfiNumber).padStart(3, '0')}`,
        title: overrides.title,
        question: 'Please confirm the requirement.',
        status: 'open',
        priority: 'medium',
        responsibleStakeholderId: 'stakeholder-1',
        responsibleParty: {
            id: 'stakeholder-1',
            name: 'Acoustic Consultant',
            organization: 'Acme Acoustics',
            role: 'Consultant',
            disciplineOrTrade: 'Acoustic',
        },
        responsiblePartyLabel: 'Acoustic',
        dueDate: '2026-05-20',
        responseText: null,
        responseDate: null,
        sourceNoteId: null,
        sourceNote: null,
        evidenceLinks: [],
        auditTrail: [],
        displayState: 'upcoming',
        isOverdue: false,
        rowVersion: 1,
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
        ...overrides,
    };
}

describe('RfiRegisterPanel', () => {
    const createRfi = jest.fn();
    const updateRfi = jest.fn();
    const recordResponse = jest.fn();
    const closeRfi = jest.fn();
    const reopenRfi = jest.fn();
    const addEvidence = jest.fn();
    const removeEvidence = jest.fn();
    const promoteNote = jest.fn();
    const generateExport = jest.fn();
    const rows = [
        rfi({
            id: 'rfi-1',
            rfiNumber: 1,
            title: 'Rooftop plant noise',
            dueDate: '2026-05-01',
            displayState: 'overdue',
            isOverdue: true,
            priority: 'urgent',
        }),
        rfi({
            id: 'rfi-2',
            rfiNumber: 2,
            title: 'Fire stair clearance',
            status: 'draft',
            dueDate: null,
            displayState: 'none',
        }),
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        global.fetch = jest.fn((input: RequestInfo | URL) => {
            const url = String(input);
            if (url.startsWith('/api/documents')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [{ id: 'document-1', originalName: 'Acoustic Report.pdf' }],
                } as Response);
            }
            if (url.startsWith('/api/notes')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ notes: [{ id: 'note-1', title: 'Legacy RFI note', type: 'rfi' }] }),
                } as Response);
            }
            if (url.includes('/correspondence')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ correspondence: [{ id: 'correspondence-1', subject: 'Rooftop plant response' }] }),
                } as Response);
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            } as Response);
        });

        mockUseRfis.mockReturnValue({
            rfis: rows,
            total: rows.length,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });

        createRfi.mockResolvedValue(rfi({ id: 'rfi-3', rfiNumber: 3, title: 'New RFI' }));
        updateRfi.mockResolvedValue(rfi({ id: 'rfi-2', rfiNumber: 2, title: 'Updated title' }));
        recordResponse.mockResolvedValue(rfi({
            id: 'rfi-1',
            rfiNumber: 1,
            title: 'Rooftop plant noise',
            status: 'responded',
            responseText: 'Acoustic treatment confirmed.',
            responseDate: '2026-05-14',
        }));
        closeRfi.mockResolvedValue(rfi({
            id: 'rfi-3',
            rfiNumber: 3,
            title: 'Responded RFI',
            status: 'closed',
        }));
        reopenRfi.mockResolvedValue(rfi({
            id: 'rfi-4',
            rfiNumber: 4,
            title: 'Closed RFI',
            status: 'open',
        }));
        addEvidence.mockResolvedValue(rfi({
            id: 'rfi-1',
            rfiNumber: 1,
            title: 'Rooftop plant noise',
            evidenceLinks: [
                {
                    id: 'link-1',
                    rfiId: 'rfi-1',
                    projectId: 'project-1',
                    organizationId: 'org-1',
                    targetType: 'document',
                    targetId: 'document-1',
                    label: 'Acoustic Report.pdf',
                    createdAt: '2026-05-14T00:00:00.000Z',
                },
            ],
        }));
        removeEvidence.mockResolvedValue(rfi({ id: 'rfi-1', rfiNumber: 1, title: 'Rooftop plant noise' }));
        promoteNote.mockResolvedValue(rfi({ id: 'rfi-4', rfiNumber: 4, title: 'Legacy RFI note' }));

        mockUseRfiMutations.mockReturnValue({
            createRfi,
            updateRfi,
            recordResponse,
            closeRfi,
            reopenRfi,
            addEvidence,
            removeEvidence,
            promoteNote,
        });
        mockUseRfiExports.mockReturnValue({
            issuedArtefacts: [],
            latestIssuedArtefact: null,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });
        generateExport.mockResolvedValue({
            id: 'export-1',
            rfiId: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            versionNumber: 1,
            format: 'pdf',
            fileAssetId: 'file-1',
            filename: 'RFI-001 - Rooftop plant noise - v01.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            hash: 'hash-1',
            sourceRfiRowVersion: 1,
            generatedBy: 'user-1',
            generatedByName: 'Test User',
            generatedAt: '2026-05-14T00:00:00.000Z',
            createdAt: '2026-05-14T00:00:00.000Z',
        });
        mockUseRfiExportMutations.mockReturnValue({ generateExport });
        mockUseStakeholders.mockReturnValue({
            stakeholders: [
                {
                    id: 'stakeholder-1',
                    name: 'Acoustic Consultant',
                    organization: 'Acme Acoustics',
                    disciplineOrTrade: 'Acoustic',
                    stakeholderGroup: 'consultant',
                    isEnabled: true,
                },
            ],
            counts: { client: 0, authority: 0, consultant: 1, contractor: 0, total: 1 },
            isLoading: false,
            error: null,
            refetch: jest.fn(),
            createStakeholder: jest.fn(),
            updateStakeholder: jest.fn(),
            deleteStakeholder: jest.fn(),
            toggleEnabled: jest.fn(),
            updateTenderStatus: jest.fn(),
            updateSubmissionStatus: jest.fn(),
            reorderStakeholders: jest.fn(),
            generateStakeholders: jest.fn(),
            previewGeneration: jest.fn(),
        } as unknown as ReturnType<typeof useStakeholders>);
    });

    it('lists RFI rows with status, due date, and responsible party context', async () => {
        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        expect(screen.getAllByText('RFI-001').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Rooftop plant noise').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
        expect(screen.getByText('ACO')).toBeInTheDocument();
        await screen.findByRole('option', { name: 'Acoustic Report.pdf' });
    });

    it('requests the selected filter from the hook', async () => {
        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(screen.getByRole('button', { name: /^Overdue$/i }));

        expect(mockUseRfis).toHaveBeenLastCalledWith({ projectId: 'project-1', filter: 'overdue' });
        await screen.findByRole('option', { name: 'Acoustic Report.pdf' });
    });

    it('creates an RFI from the detail form', async () => {
        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(screen.getByRole('button', { name: /^NEW RFI$/i }));
        fireEvent.change(screen.getByLabelText(/^Title$/i), {
            target: { value: 'Balustrade detail' },
        });
        fireEvent.change(screen.getByLabelText(/^Request \/ question$/i), {
            target: { value: 'Please confirm the balustrade fixing detail.' },
        });
        fireEvent.change(screen.getByLabelText(/^Responsible party$/i), {
            target: { value: 'stakeholder-1' },
        });
        fireEvent.change(screen.getByLabelText(/^Due date$/i), {
            target: { value: '2026-05-21' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^SAVE$/i }));

        await waitFor(() => {
            expect(createRfi).toHaveBeenCalledWith({
                title: 'Balustrade detail',
                question: 'Please confirm the balustrade fixing detail.',
                status: 'draft',
                priority: 'medium',
                responsibleStakeholderId: 'stakeholder-1',
                dueDate: '2026-05-21',
            });
        });
    });

    it('edits an existing RFI core field', async () => {
        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(screen.getByRole('button', { name: /RFI-002/i }));
        fireEvent.change(screen.getByLabelText(/^Title$/i), {
            target: { value: 'Updated title' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^SAVE$/i }));

        await waitFor(() => {
            expect(updateRfi).toHaveBeenCalledWith('rfi-2', expect.objectContaining({
                title: 'Updated title',
                question: 'Please confirm the requirement.',
            }));
        });
    });

    it('adds document evidence to the selected RFI', async () => {
        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Acoustic Report.pdf' })).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^ADD$/i })).not.toBeDisabled();
        });

        fireEvent.click(screen.getByRole('button', { name: /^ADD$/i }));

        await waitFor(() => {
            expect(addEvidence).toHaveBeenCalledWith('rfi-1', {
                targetType: 'document',
                targetId: 'document-1',
            });
        });
    });

    it('records a response with optional evidence', async () => {
        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        await waitFor(() => {
            expect(screen.getByRole('option', { name: /Document \/ Acoustic Report\.pdf/i })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByLabelText(/^Response text$/i), {
            target: { value: 'Acoustic treatment confirmed.' },
        });
        fireEvent.change(screen.getByLabelText(/^Response evidence$/i), {
            target: { value: 'document:document-1' },
        });
        fireEvent.click(screen.getByRole('button', { name: /^RECORD$/i }));

        await waitFor(() => {
            expect(recordResponse).toHaveBeenCalledWith('rfi-1', {
                responseText: 'Acoustic treatment confirmed.',
                responseDate: expect.any(String),
                evidence: { targetType: 'document', targetId: 'document-1' },
            });
        });
    });

    it('closes responded RFIs and reopens closed RFIs', async () => {
        mockUseRfis.mockReturnValue({
            rfis: [rfi({ id: 'rfi-3', rfiNumber: 3, title: 'Responded RFI', status: 'responded' })],
            total: 1,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });
        const { rerender } = render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(await screen.findByRole('button', { name: /^CLOSE$/i }));

        await waitFor(() => {
            expect(closeRfi).toHaveBeenCalledWith('rfi-3');
        });

        mockUseRfis.mockReturnValue({
            rfis: [rfi({ id: 'rfi-4', rfiNumber: 4, title: 'Closed RFI', status: 'closed' })],
            total: 1,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });
        rerender(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        fireEvent.click(await screen.findByRole('button', { name: /^REOPEN$/i }));

        await waitFor(() => {
            expect(reopenRfi).toHaveBeenCalledWith('rfi-4');
        });
    });

    it('shows lifecycle audit history', async () => {
        mockUseRfis.mockReturnValue({
            rfis: [
                rfi({
                    id: 'rfi-5',
                    rfiNumber: 5,
                    title: 'Audited RFI',
                    status: 'responded',
                    auditTrail: [
                        {
                            id: 'audit-1',
                            rfiId: 'rfi-5',
                            projectId: 'project-1',
                            organizationId: 'org-1',
                            action: 'response_recorded',
                            actorId: 'user-1',
                            actorName: 'Test User',
                            previousStatus: 'open',
                            newStatus: 'responded',
                            createdAt: '2026-05-14T00:00:00.000Z',
                        },
                    ],
                }),
            ],
            total: 1,
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        expect(screen.getByText('Response recorded')).toBeInTheDocument();
        expect(screen.getByText(/Open to Responded \/ Test User/i)).toBeInTheDocument();
        await screen.findByRole('option', { name: 'Acoustic Report.pdf' });
    });

    it('generates and lists issued artefact versions', async () => {
        mockUseRfiExports.mockReturnValue({
            issuedArtefacts: [
                {
                    id: 'export-2',
                    rfiId: 'rfi-1',
                    projectId: 'project-1',
                    organizationId: 'org-1',
                    versionNumber: 2,
                    format: 'pdf',
                    fileAssetId: 'file-2',
                    filename: 'RFI-001 - Rooftop plant noise - v02.pdf',
                    mimeType: 'application/pdf',
                    sizeBytes: 2048,
                    hash: 'hash-2',
                    sourceRfiRowVersion: 2,
                    generatedBy: 'user-1',
                    generatedByName: 'Test User',
                    generatedAt: '2026-05-14T01:00:00.000Z',
                    createdAt: '2026-05-14T01:00:00.000Z',
                },
                {
                    id: 'export-1',
                    rfiId: 'rfi-1',
                    projectId: 'project-1',
                    organizationId: 'org-1',
                    versionNumber: 1,
                    format: 'docx',
                    fileAssetId: 'file-1',
                    filename: 'RFI-001 - Rooftop plant noise - v01.docx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    sizeBytes: 1024,
                    hash: 'hash-1',
                    sourceRfiRowVersion: 1,
                    generatedBy: 'user-1',
                    generatedByName: 'Test User',
                    generatedAt: '2026-05-14T00:00:00.000Z',
                    createdAt: '2026-05-14T00:00:00.000Z',
                },
            ],
            latestIssuedArtefact: {
                id: 'export-2',
                rfiId: 'rfi-1',
                projectId: 'project-1',
                organizationId: 'org-1',
                versionNumber: 2,
                format: 'pdf',
                fileAssetId: 'file-2',
                filename: 'RFI-001 - Rooftop plant noise - v02.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 2048,
                hash: 'hash-2',
                sourceRfiRowVersion: 2,
                generatedBy: 'user-1',
                generatedByName: 'Test User',
                generatedAt: '2026-05-14T01:00:00.000Z',
                createdAt: '2026-05-14T01:00:00.000Z',
            },
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        });

        render(<RfiRegisterPanel projectId="project-1" projectName="Demo Project" />);

        expect(screen.getByText('v2 / RFI-001 - Rooftop plant noise - v02.pdf')).toBeInTheDocument();
        expect(screen.getByText('v1 / RFI-001 - Rooftop plant noise - v01.docx')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /^PDF$/i }));

        await waitFor(() => {
            expect(generateExport).toHaveBeenCalledWith('rfi-1', { format: 'pdf' });
        });
    });
});
