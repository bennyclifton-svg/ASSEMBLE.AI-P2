/**
 * @jest-environment node
 */

const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

jest.mock('@/lib/db', () => ({
    db: {
        select: () => mockSelect(),
        insert: () => mockInsert(),
        update: jest.fn(),
    },
}));

import { attachDocumentsToNote, validateCommunicationDocuments } from '../artifacts';

describe('communication artifacts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('validates deduped project document ids', async () => {
        mockSelectWhere.mockResolvedValueOnce([{ id: 'doc-1' }]);

        const result = await validateCommunicationDocuments('project-1', ['doc-1', 'doc-1', 'missing-doc']);

        expect(result).toEqual({
            ok: false,
            reason: 'Document(s) not found in this project: missing-doc',
        });
    });

    it('attaches only new documents to a note', async () => {
        mockSelectWhere.mockResolvedValueOnce([{ documentId: 'doc-1' }]);

        const attachedIds = await attachDocumentsToNote('note-1', ['doc-1', 'doc-2', 'doc-2']);

        expect(attachedIds).toEqual(['doc-1', 'doc-2']);
        expect(mockInsertValues).toHaveBeenCalledTimes(1);
        expect(mockInsertValues).toHaveBeenCalledWith({
            id: expect.any(String),
            noteId: 'note-1',
            documentId: 'doc-2',
            addedAt: expect.any(String),
        });
    });
});
