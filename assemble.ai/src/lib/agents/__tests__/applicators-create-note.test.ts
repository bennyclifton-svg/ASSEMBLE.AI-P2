/**
 * applyApproval(create_note) attachment behavior.
 *
 * Pins the agent path where an approved note proposal includes source
 * document IDs. The note and attachment rows must be written together.
 */

const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockTx = {
    select: mockSelect,
    insert: mockInsert,
    update: jest.fn(),
};
const mockTransaction = jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));

jest.mock('uuid', () => ({
    v4: () => 'legacy-uuid',
}));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
        insert: () => mockInsert(),
        transaction: (callback: (tx: typeof mockTx) => unknown) => mockTransaction(callback),
    },
}));

import { applyApproval } from '../applicators';

describe('applyApproval - create_note attachments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates the note and attaches requested project documents', async () => {
        mockSelectWhere
            .mockResolvedValueOnce([{ id: 'doc-1' }])
            .mockResolvedValueOnce([]);

        const result = await applyApproval({
            toolName: 'create_note',
            input: {
                title: 'Mech Spec Summary',
                content: 'Summary text',
                color: 'blue',
                documentIds: ['doc-1'],
            },
            expectedRowVersion: null,
            ctx: { organizationId: 'org-1', projectId: 'project-1' },
        });

        expect(result.kind).toBe('applied');
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalledTimes(2);
        const insertedNote = mockInsertValues.mock.calls[0][0] as { id: string };
        expect(insertedNote).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                projectId: 'project-1',
                organizationId: 'org-1',
                title: 'Mech Spec Summary',
                content: 'Summary text',
                color: 'blue',
            })
        );
        expect(mockInsertValues.mock.calls[1][0]).toEqual({
            id: expect.any(String),
            noteId: insertedNote.id,
            documentId: 'doc-1',
            addedAt: expect.any(String),
        });
        expect(result).toEqual(
            expect.objectContaining({
                output: expect.objectContaining({
                    id: insertedNote.id,
                    attachedDocumentIds: ['doc-1'],
                }),
            })
        );
    });

    it('does not create a note if a requested document is outside the project', async () => {
        mockSelectWhere.mockResolvedValueOnce([]);

        const result = await applyApproval({
            toolName: 'create_note',
            input: {
                title: 'Mech Spec Summary',
                documentIds: ['missing-doc'],
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
});
