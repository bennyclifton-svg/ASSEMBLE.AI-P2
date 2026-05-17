/**
 * @jest-environment node
 */

import path from 'node:path';
import { prepareRestoreRows, resolveLocalStoragePath } from '../project-backup';

describe('project backup restore preparation', () => {
    it('remaps project, row ids, and included foreign keys for namespace restore', () => {
        let idCounter = 0;
        const idFactory = () => `restored-row-${++idCounter}`;

        const { rows } = prepareRestoreRows(
            {
                projects: [
                    {
                        id: 'project-source',
                        name: 'Source Project',
                        organization_id: 'org-source',
                    },
                ],
                project_details: [
                    {
                        id: 'details-source',
                        project_id: 'project-source',
                        project_name: 'Source Project',
                        address: '1 Source Street',
                    },
                ],
                file_assets: [
                    {
                        id: 'file-source',
                        storage_path: '/uploads/source.txt',
                        original_name: 'source.txt',
                        mime_type: 'text/plain',
                        size_bytes: 12,
                        hash: 'source-hash',
                    },
                ],
                documents: [
                    {
                        id: 'document-source',
                        project_id: 'project-source',
                        latest_version_id: 'version-source',
                    },
                ],
                versions: [
                    {
                        id: 'version-source',
                        document_id: 'document-source',
                        file_asset_id: 'file-source',
                        version_number: 1,
                    },
                ],
                notes: [
                    {
                        id: 'note-source',
                        project_id: 'project-source',
                        organization_id: 'org-source',
                        title: 'Note',
                    },
                ],
                note_transmittals: [
                    {
                        id: 'note-transmittal-source',
                        note_id: 'note-source',
                        document_id: 'document-source',
                    },
                ],
            },
            {
                projectId: 'project-restored',
                projectName: 'Restored Project',
                organizationId: 'org-restored',
                restoredAt: new Date('2026-05-14T00:00:00.000Z'),
                idFactory,
            }
        );

        expect(rows.projects[0]).toMatchObject({
            id: 'project-restored',
            name: 'Restored Project',
            organization_id: 'org-restored',
        });
        expect(rows.project_details[0].project_id).toBe('project-restored');
        expect(rows.documents[0].project_id).toBe('project-restored');
        expect(rows.documents[0].id).not.toBe('document-source');
        expect(rows.versions[0].document_id).toBe(rows.documents[0].id);
        expect(rows.versions[0].file_asset_id).toBe(rows.file_assets[0].id);
        expect(rows.documents[0].latest_version_id).toBe(rows.versions[0].id);
        expect(rows.notes[0]).toMatchObject({
            project_id: 'project-restored',
            organization_id: 'org-restored',
        });
        expect(rows.note_transmittals[0].note_id).toBe(rows.notes[0].id);
        expect(rows.note_transmittals[0].document_id).toBe(rows.documents[0].id);
    });
});

describe('local storage path resolution', () => {
    it('accepts files under uploads', () => {
        const resolved = resolveLocalStoragePath('/uploads/file.txt', process.cwd());

        expect(resolved).toBe(path.resolve(process.cwd(), 'uploads', 'file.txt'));
    });

    it('accepts absolute paths for admin-configured storage folders', () => {
        const absolutePath = path.resolve(process.cwd(), '..', 'custom-uploads', 'file.txt');

        expect(resolveLocalStoragePath(absolutePath, process.cwd())).toBe(absolutePath);
    });

    it('rejects relative paths outside uploads', () => {
        expect(() => resolveLocalStoragePath('../file.txt', process.cwd())).toThrow(/outside uploads/);
    });

    it('rejects cloud storage payloads for the first local backup format', () => {
        expect(() => resolveLocalStoragePath('supabase://bucket/file.txt', process.cwd())).toThrow(/Cloud storage/);
    });
});
