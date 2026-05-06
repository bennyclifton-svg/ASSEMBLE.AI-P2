/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/agents/applicators', () => ({
    applyCreateAddendum: jest.fn(),
    applyCreateTransmittal: jest.fn(),
    applyUpdateNote: jest.fn(),
}));

import { attachDocumentsToNoteAction } from '../attach-documents-to-note';
import { createAddendumAction } from '../create-addendum';
import { createTransmittalAction } from '../create-transmittal';
import { updateNoteAction } from '../update-note';

describe('correspondence note/transmittal actions', () => {
    it('uses friendly tracer tool names', () => {
        expect(updateNoteAction.toolName).toBe('update_note');
        expect(attachDocumentsToNoteAction.toolName).toBe('attach_documents_to_note');
        expect(createAddendumAction.toolName).toBe('create_addendum');
        expect(createTransmittalAction.toolName).toBe('create_transmittal');
    });

    it('preserves update_note attachment guard', () => {
        expect(
            updateNoteAction.inputSchema.safeParse({
                id: 'note-1',
                content: 'Attached all mechanical documents for review.',
            }).success
        ).toBe(false);
        expect(
            updateNoteAction.inputSchema.safeParse({
                id: 'note-1',
                content: 'Attached all mechanical documents for review.',
                attachDocumentIds: ['doc-1', 'doc-1'],
            }).data
        ).toEqual({
            id: 'note-1',
            content: 'Attached all mechanical documents for review.',
            attachDocumentIds: ['doc-1'],
        });
    });

    it('preserves attach_documents_to_note shortcut schema', () => {
        expect(
            attachDocumentsToNoteAction.inputSchema.safeParse({
                noteTitle: 'Mech Spec Review 2',
                disciplineOrTrade: 'Mechanical',
            }).success
        ).toBe(true);
        expect(
            attachDocumentsToNoteAction.inputSchema.safeParse({
                noteTitle: 'Mech Spec Review 2',
            }).success
        ).toBe(false);
    });

    it('preserves create_transmittal filters and limit clamping', () => {
        expect(
            createTransmittalAction.inputSchema.safeParse({
                documentName: 'basement',
                limit: 999,
            }).data
        ).toEqual({
            documentName: 'basement',
            limit: 500,
        });
        expect(
            createTransmittalAction.inputSchema.safeParse({
                name: 'Empty Transmittal',
            }).success
        ).toBe(false);
    });

    it('preserves create_addendum schema and date validation', () => {
        expect(
            createAddendumAction.inputSchema.safeParse({
                stakeholderId: 'stk-mech',
                content: 'General update to the mechanical design documents.',
                documentIds: ['doc-1', 'doc-1', 'doc-2'],
                addendumDate: '2026-05-02',
            }).data
        ).toEqual({
            stakeholderId: 'stk-mech',
            content: 'General update to the mechanical design documents.',
            documentIds: ['doc-1', 'doc-2'],
            addendumDate: '2026-05-02',
        });
        expect(
            createAddendumAction.inputSchema.safeParse({
                content: 'Missing stakeholder',
            }).success
        ).toBe(false);
        expect(
            createAddendumAction.inputSchema.safeParse({
                stakeholderId: 'stk-1',
                content: 'Bad date',
                addendumDate: '02/05/2026',
            }).success
        ).toBe(false);
    });
});
