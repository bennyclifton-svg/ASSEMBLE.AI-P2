/**
 * applyApproval(create_transmittal) behavior.
 *
 * Pins the agent path where an approved transmittal proposal creates the
 * correct storage shape for Notes-section and project transmittals.
 */

const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));
const queryResult = <T>(rows: T[]) =>
    Object.assign(Promise.resolve(rows), {
        limit: jest.fn().mockResolvedValue(rows),
    });

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockTx = {
    insert: mockInsert,
};
const mockTransaction = jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));

let mockUuidIndex = 0;
const mockUuids = ['note-id', 'item-1', 'item-2', 'transmittal-id', 'project-item-1', 'project-item-2'];

jest.mock('uuid', () => ({
    v4: () => mockUuids[mockUuidIndex++] ?? `uuid-${mockUuidIndex}`,
}));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
        transaction: (callback: (tx: typeof mockTx) => unknown) => mockTransaction(callback),
    },
}));

import { applyApproval } from '../applicators';

describe('applyApproval - create_transmittal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUuidIndex = 0;
    });

    it('creates a transmittal note with attached documents by default', async () => {
        mockSelectWhere.mockReturnValueOnce(queryResult([
            { id: 'doc-1', latestVersionId: 'version-1' },
            { id: 'doc-2', latestVersionId: 'version-2' },
        ]));

        const result = await applyApproval({
            toolName: 'create_transmittal',
            input: {
                name: 'Basement Drawings Transmittal',
                documentIds: ['doc-1', 'doc-2'],
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalledTimes(2);
        expect(mockInsertValues.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                id: 'note-id',
                projectId: 'project-1',
                organizationId: 'org-1',
                title: 'Basement Drawings Transmittal',
                type: 'transmittal',
            })
        );
        expect(mockInsertValues.mock.calls[1][0]).toEqual([
            {
                id: 'item-1',
                noteId: 'note-id',
                documentId: 'doc-1',
                addedAt: expect.any(String),
            },
            {
                id: 'item-2',
                noteId: 'note-id',
                documentId: 'doc-2',
                addedAt: expect.any(String),
            },
        ]);
        expect(result).toEqual(
            expect.objectContaining({
                output: expect.objectContaining({
                    id: 'note-id',
                    transmittalTarget: 'note',
                    attachedDocumentIds: ['doc-1', 'doc-2'],
                    documentCount: 2,
                }),
            })
        );
    });

    it('creates a targeted project transmittal with latest document versions', async () => {
        mockUuidIndex = 3;
        mockSelectWhere
            .mockReturnValueOnce(queryResult([{ id: 'sub-1' }]))
            .mockReturnValueOnce(queryResult([
                { id: 'doc-1', latestVersionId: 'version-1' },
                { id: 'doc-2', latestVersionId: 'version-2' },
            ]));

        const result = await applyApproval({
            toolName: 'create_transmittal',
            input: {
                name: 'Basement Drawings Transmittal',
                destination: 'project',
                subcategoryId: 'sub-1',
                documentIds: ['doc-1', 'doc-2'],
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalledTimes(2);
        expect(mockInsertValues.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                id: 'transmittal-id',
                projectId: 'project-1',
                stakeholderId: null,
                subcategoryId: 'sub-1',
                name: 'Basement Drawings Transmittal',
                status: 'DRAFT',
            })
        );
        expect(mockInsertValues.mock.calls[1][0]).toEqual([
            {
                id: 'project-item-1',
                transmittalId: 'transmittal-id',
                versionId: 'version-1',
            },
            {
                id: 'project-item-2',
                transmittalId: 'transmittal-id',
                versionId: 'version-2',
            },
        ]);
        expect(result).toEqual(
            expect.objectContaining({
                output: expect.objectContaining({
                    id: 'transmittal-id',
                    transmittalTarget: 'project',
                    documentIds: ['doc-1', 'doc-2'],
                    documentCount: 2,
                }),
            })
        );
    });

    it('does not create a transmittal if a document is outside the project', async () => {
        mockSelectWhere.mockReturnValueOnce(queryResult([{ id: 'doc-1', latestVersionId: 'version-1' }]));

        const result = await applyApproval({
            toolName: 'create_transmittal',
            input: {
                name: 'Basement Drawings Transmittal',
                documentIds: ['doc-1', 'missing-doc'],
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result).toEqual({
            kind: 'gone',
            reason: 'Document(s) not found in this project: missing-doc',
        });
        expect(mockTransaction).not.toHaveBeenCalled();
        expect(mockInsertValues).not.toHaveBeenCalled();
    });

    it('requires a target for project transmittals', async () => {
        const result = await applyApproval({
            toolName: 'create_transmittal',
            input: {
                name: 'Basement Drawings Transmittal',
                destination: 'project',
                documentIds: ['doc-1'],
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result).toEqual({
            kind: 'gone',
            reason:
                'Project transmittals require a stakeholder or subcategory target. Use a Notes section transmittal for untargeted drawing sets.',
        });
        expect(mockSelectWhere).not.toHaveBeenCalled();
        expect(mockTransaction).not.toHaveBeenCalled();
        expect(mockInsertValues).not.toHaveBeenCalled();
    });
});
