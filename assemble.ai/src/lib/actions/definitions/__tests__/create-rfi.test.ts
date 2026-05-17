/**
 * @jest-environment node
 */

const mockFindResponsibleParty = jest.fn();
const mockFindEvidenceTarget = jest.fn();
const mockCreateRfi = jest.fn();
const mockAddEvidence = jest.fn();

jest.mock('@/lib/rfi/service', () => ({
    drizzleRfiRepository: {
        findResponsibleParty: (...args: unknown[]) => mockFindResponsibleParty(...args),
        findEvidenceTarget: (...args: unknown[]) => mockFindEvidenceTarget(...args),
    },
    rfiService: {
        create: (...args: unknown[]) => mockCreateRfi(...args),
        addEvidence: (...args: unknown[]) => mockAddEvidence(...args),
    },
}));

jest.mock('@/lib/actions/registry', () => ({
    registerAction: <T>(action: T) => action,
}));

import { createRfiAction } from '../create-rfi';
import type { ActionContext } from '../../types';

const ctx: ActionContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    actorKind: 'agent',
    actorId: 'run-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

function rfi(overrides: Record<string, unknown> = {}) {
    return {
        id: 'rfi-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        reference: 'RFI-001',
        title: 'Plant noise',
        question: 'Please confirm rooftop plant acoustic attenuation.',
        status: 'draft',
        priority: 'high',
        evidenceLinks: [],
        ...overrides,
    };
}

describe('createRfiAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFindResponsibleParty.mockResolvedValue({
            id: 'stakeholder-1',
            name: 'Acoustic Consultant',
            organization: 'Acme Acoustics',
            role: 'Consultant',
            disciplineOrTrade: 'Acoustic',
        });
        mockFindEvidenceTarget.mockResolvedValue({
            targetType: 'document',
            targetId: 'document-1',
            label: 'Acoustic Report.pdf',
        });
        mockCreateRfi.mockResolvedValue(rfi());
        mockAddEvidence.mockResolvedValue(rfi({
            evidenceLinks: [
                {
                    id: 'link-1',
                    targetType: 'document',
                    targetId: 'document-1',
                    label: 'Acoustic Report.pdf',
                },
            ],
        }));
    });

    it('validates the required typed RFI fields', () => {
        expect(createRfiAction.inputSchema.safeParse({
            title: 'Plant noise',
            question: 'Please confirm.',
            priority: 'urgent',
            evidence: [{ targetType: 'document', targetId: 'document-1' }],
        }).success).toBe(true);

        expect(createRfiAction.inputSchema.safeParse({
            title: '',
            question: 'Please confirm.',
        }).success).toBe(false);

        expect(createRfiAction.inputSchema.safeParse({
            title: 'Plant noise',
            question: 'Please confirm.',
            evidence: [{ targetType: 'spreadsheet', targetId: 'document-1' }],
        }).success).toBe(false);
    });

    it('builds a user-readable approval preview with responsible party and citations', async () => {
        const prepared = await createRfiAction.prepareProposal!(ctx, {
            title: 'Plant noise',
            question: 'Please confirm rooftop plant acoustic attenuation.',
            priority: 'high',
            responsibleStakeholderId: 'stakeholder-1',
            dueDate: '2026-05-20',
            evidence: [
                {
                    targetType: 'document',
                    targetId: 'document-1',
                    citation: 'Section 4.2 requires acoustic review.',
                },
            ],
            assumptions: ['No email will be sent by this action.'],
        });

        expect(prepared.proposedDiff).toEqual(
            expect.objectContaining({
                entity: 'rfi',
                entityId: null,
                summary: 'Create RFI - Plant noise',
                changes: expect.arrayContaining([
                    expect.objectContaining({ field: 'responsibleParty', after: 'Acoustic' }),
                    expect.objectContaining({ field: 'dueDate', after: '2026-05-20' }),
                    expect.objectContaining({
                        field: 'evidence',
                        after: expect.stringContaining('Acoustic Report.pdf'),
                    }),
                    expect.objectContaining({
                        field: 'assumptions',
                        after: 'No email will be sent by this action.',
                    }),
                ]),
            })
        );
        expect((prepared.proposedDiff.changes.find((change) => change.field === 'evidence')?.after as string))
            .toContain('Section 4.2 requires acoustic review.');
    });

    it('creates the typed RFI and links evidence only after approval apply', async () => {
        const output = await createRfiAction.apply!(ctx, {
            title: 'Plant noise',
            question: 'Please confirm rooftop plant acoustic attenuation.',
            status: 'draft',
            priority: 'high',
            responsibleStakeholderId: 'stakeholder-1',
            dueDate: '2026-05-20',
            evidence: [{ targetType: 'document', targetId: 'document-1' }],
        });

        expect(mockCreateRfi).toHaveBeenCalledWith({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Plant noise',
            question: 'Please confirm rooftop plant acoustic attenuation.',
            status: 'draft',
            priority: 'high',
            responsibleStakeholderId: 'stakeholder-1',
            dueDate: '2026-05-20',
        });
        expect(mockAddEvidence).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            targetType: 'document',
            targetId: 'document-1',
        });
        expect(output).toEqual(expect.objectContaining({ id: 'rfi-1' }));
    });

    it('rejects missing evidence targets before creating an RFI', async () => {
        mockFindEvidenceTarget.mockResolvedValueOnce(null);

        await expect(createRfiAction.apply!(ctx, {
            title: 'Plant noise',
            question: 'Please confirm rooftop plant acoustic attenuation.',
            evidence: [{ targetType: 'document', targetId: 'missing-document' }],
        })).rejects.toThrow('Evidence target not found');

        expect(mockCreateRfi).not.toHaveBeenCalled();
        expect(mockAddEvidence).not.toHaveBeenCalled();
    });
});
