/**
 * @jest-environment node
 */

const mockGetRfi = jest.fn();
const mockListRfis = jest.fn();
const mockRecordResponse = jest.fn();
const mockAddEvidence = jest.fn();
const mockFindEvidenceTarget = jest.fn();

jest.mock('@/lib/rfi/service', () => ({
    drizzleRfiRepository: {
        findEvidenceTarget: (...args: unknown[]) => mockFindEvidenceTarget(...args),
    },
    rfiService: {
        get: (...args: unknown[]) => mockGetRfi(...args),
        list: (...args: unknown[]) => mockListRfis(...args),
        recordResponse: (...args: unknown[]) => mockRecordResponse(...args),
        addEvidence: (...args: unknown[]) => mockAddEvidence(...args),
    },
}));

jest.mock('@/lib/actions/registry', () => ({
    registerAction: <T>(action: T) => action,
}));

import { recordRfiResponseAction } from '../record-rfi-response';
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
        rfiNumber: 1,
        reference: 'RFI-001',
        title: 'Lighting schedule',
        question: 'List all light fittings specified in the project.',
        status: 'open',
        priority: 'urgent',
        responseText: null,
        responseDate: null,
        evidenceLinks: [],
        rowVersion: 3,
        ...overrides,
    };
}

describe('recordRfiResponseAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetRfi.mockResolvedValue(rfi());
        mockListRfis.mockResolvedValue({ rfis: [rfi()], total: 1, filter: 'all' });
        mockFindEvidenceTarget.mockImplementation(
            (_projectId: string, _organizationId: string, targetType: string, targetId: string) => ({
                targetType,
                targetId,
                label: targetId === 'doc-2' ? 'Electrical Lighting Schedule.pdf' : 'E03 Lighting Layout.pdf',
            })
        );
        mockRecordResponse.mockResolvedValue(rfi({
            status: 'responded',
            responseText: 'The project specifies the listed light fittings.',
            responseDate: '2026-05-15',
        }));
        mockAddEvidence.mockResolvedValue(rfi({
            status: 'responded',
            evidenceLinks: [{ targetType: 'document', targetId: 'doc-2', label: 'Electrical Lighting Schedule.pdf' }],
        }));
    });

    it('builds an approval preview for an existing RFI response with evidence', async () => {
        const prepared = await recordRfiResponseAction.prepareProposal!(ctx, {
            rfiReference: 'RFI 001',
            responseText: 'The project specifies the listed light fittings.',
            responseDate: '2026-05-15',
            evidence: [
                { targetType: 'document', targetId: 'doc-1' },
                { targetType: 'document', targetId: 'doc-2', citation: 'Lighting schedule type list.' },
            ],
        });

        expect(prepared.expectedRowVersion).toBe(3);
        expect(prepared.input).toEqual(
            expect.objectContaining({
                rfiId: 'rfi-1',
                responseDate: '2026-05-15',
            })
        );
        expect(prepared.proposedDiff).toEqual(
            expect.objectContaining({
                entity: 'rfi',
                entityId: 'rfi-1',
                summary: 'Record response - RFI-001',
                changes: expect.arrayContaining([
                    expect.objectContaining({ field: 'status', before: 'open', after: 'responded' }),
                    expect.objectContaining({
                        field: 'evidence',
                        after: expect.stringContaining('Electrical Lighting Schedule.pdf'),
                    }),
                ]),
            })
        );
    });

    it('records the response and attaches all evidence after approval apply', async () => {
        const output = await recordRfiResponseAction.apply!(ctx, {
            rfiId: 'rfi-1',
            responseText: 'The project specifies the listed light fittings.',
            responseDate: '2026-05-15',
            evidence: [
                { targetType: 'document', targetId: 'doc-1' },
                { targetType: 'document', targetId: 'doc-2' },
            ],
        });

        expect(mockRecordResponse).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            responseText: 'The project specifies the listed light fittings.',
            responseDate: '2026-05-15',
            evidence: { targetType: 'document', targetId: 'doc-1' },
        });
        expect(mockAddEvidence).toHaveBeenCalledWith({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            targetType: 'document',
            targetId: 'doc-2',
        });
        expect(output).toEqual(expect.objectContaining({ id: 'rfi-1' }));
    });

    it('rejects responses for non-open RFIs', async () => {
        mockListRfis.mockResolvedValueOnce({ rfis: [rfi({ status: 'responded' })], total: 1, filter: 'all' });

        await expect(recordRfiResponseAction.prepareProposal!(ctx, {
            rfiReference: 'RFI 001',
            responseText: 'Already answered.',
            responseDate: '2026-05-15',
        })).rejects.toThrow(/only open RFIs/i);
    });
});
