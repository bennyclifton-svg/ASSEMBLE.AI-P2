/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));

import crypto from 'crypto';
import {
    createRfiIssuedArtefactService,
    type InsertRfiFileAssetValues,
    type InsertRfiIssuedArtefactValues,
    type RfiIssuedArtefactRepository,
    type RfiIssuedArtefactRepositoryRow,
} from '../issued-artefacts';
import { buildRfiExportHtml } from '../export';
import type { RfiRecord } from '@/types/rfi';

function rfi(overrides: Partial<RfiRecord> = {}): RfiRecord {
    return {
        id: 'rfi-1',
        projectId: 'project-1',
        organizationId: 'org-1',
        rfiNumber: 1,
        reference: 'RFI-001',
        title: 'Plant noise',
        question: 'Please confirm rooftop plant acoustic attenuation.',
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
        auditTrail: [],
        displayState: 'upcoming',
        isOverdue: false,
        rowVersion: 4,
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
        ...overrides,
    };
}

class FakeIssuedArtefactRepository implements RfiIssuedArtefactRepository {
    rfiRows = new Map<string, RfiRecord>([['project-1:org-1:rfi-1', rfi()]]);
    fileRows: InsertRfiFileAssetValues[] = [];
    issuedRows: RfiIssuedArtefactRepositoryRow[] = [];

    async getRfi(id: string, projectId: string, organizationId: string): Promise<RfiRecord | null> {
        return this.rfiRows.get(`${projectId}:${organizationId}:${id}`) ?? null;
    }

    async getProjectDetails(projectId: string, organizationId: string) {
        if (projectId !== 'project-1' || organizationId !== 'org-1') return null;
        return {
            projectName: 'Demo Project',
            projectCode: 'DP-001',
            address: '1 Demo Street',
        };
    }

    async nextVersionNumber(rfiId: string, organizationId: string): Promise<number> {
        const max = this.issuedRows
            .filter((row) => row.rfiId === rfiId && row.organizationId === organizationId)
            .reduce((value, row) => Math.max(value, row.versionNumber), 0);
        return max + 1;
    }

    async insertFileAsset(values: InsertRfiFileAssetValues): Promise<void> {
        this.fileRows.push(values);
    }

    async insertIssuedArtefact(values: InsertRfiIssuedArtefactValues): Promise<RfiIssuedArtefactRepositoryRow> {
        const file = this.fileRows.find((row) => row.id === values.fileAssetId);
        const row: RfiIssuedArtefactRepositoryRow = {
            ...values,
            storagePath: file?.storagePath ?? `/uploads/${values.filename}`,
        };
        this.issuedRows.push(row);
        return row;
    }

    async listIssuedArtefacts(
        rfiId: string,
        projectId: string,
        organizationId: string
    ): Promise<RfiIssuedArtefactRepositoryRow[]> {
        return this.issuedRows
            .filter((row) =>
                row.rfiId === rfiId &&
                row.projectId === projectId &&
                row.organizationId === organizationId
            )
            .sort((a, b) => b.versionNumber - a.versionNumber);
    }

    async getIssuedArtefact(
        id: string,
        rfiId: string,
        projectId: string,
        organizationId: string
    ): Promise<RfiIssuedArtefactRepositoryRow | null> {
        return this.issuedRows.find((row) =>
            row.id === id &&
            row.rfiId === rfiId &&
            row.projectId === projectId &&
            row.organizationId === organizationId
        ) ?? null;
    }
}

function makeService() {
    let id = 0;
    const renderInputs: unknown[] = [];
    const repository = new FakeIssuedArtefactRepository();
    const storage = {
        async save(file: File, buffer: Buffer) {
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');
            return { path: `/uploads/${file.name}`, hash, size: buffer.length };
        },
        async delete() {},
        async get() {
            return Buffer.from('stored');
        },
    };
    const service = createRfiIssuedArtefactService(repository, {
        now: () => new Date('2026-05-14T10:00:00.000Z'),
        idFactory: () => `id-${++id}`,
        storage,
        async render(input) {
            renderInputs.push(input);
            return {
                buffer: Buffer.from(`${input.rfi.reference}:${input.format}:v${input.rfi.rowVersion}`),
                mimeType: input.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                extension: input.format,
            };
        },
    });
    return { repository, renderInputs, service };
}

describe('RFI issued artefacts', () => {
    it('builds export HTML with project, RFI, response, and evidence content', () => {
        const html = buildRfiExportHtml({
            rfi: rfi({ responseText: 'Confirmed.', responseDate: '2026-05-14', status: 'responded' }),
            project: { projectName: 'Demo Project', projectCode: 'DP-001', address: '1 Demo Street' },
            format: 'pdf',
            generatedAt: new Date('2026-05-14T10:00:00.000Z'),
        });

        expect(html).toContain('DP-001 - Demo Project');
        expect(html).toContain('RFI-001 - Plant noise');
        expect(html).toContain('Please confirm rooftop plant acoustic attenuation.');
        expect(html).toContain('Confirmed.');
        expect(html).toContain('Acoustic Report.pdf');
    });

    it('stores a generated export as immutable version metadata', async () => {
        const { repository, renderInputs, service } = makeService();

        const artefact = await service.generate({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            actorName: 'Test User',
            format: 'pdf',
        });

        expect(artefact.versionNumber).toBe(1);
        expect(artefact.filename).toBe('RFI-001 - Plant noise - v01.pdf');
        expect(artefact.sourceRfiRowVersion).toBe(4);
        expect(artefact.generatedByName).toBe('Test User');
        expect(repository.fileRows[0]).toMatchObject({
            originalName: 'RFI-001 - Plant noise - v01.pdf',
            mimeType: 'application/pdf',
            ocrStatus: 'COMPLETED',
        });
        expect(repository.issuedRows).toHaveLength(1);
        expect(repository.issuedRows[0].hash).toBe(
            crypto.createHash('sha256').update(Buffer.from('RFI-001:pdf:v4')).digest('hex')
        );
        expect(renderInputs).toHaveLength(1);
    });

    it('regenerates by appending a new version and retrieves prior versions', async () => {
        const { service } = makeService();

        const first = await service.generate({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            format: 'pdf',
        });
        const second = await service.generate({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            format: 'docx',
        });

        const list = await service.list({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
        });
        const file = await service.getFile({
            exportId: first.id,
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
        });

        expect(second.versionNumber).toBe(2);
        expect(list.latestIssuedArtefact?.id).toBe(second.id);
        expect(list.issuedArtefacts.map((artefact) => artefact.versionNumber)).toEqual([2, 1]);
        expect(file.artefact.id).toBe(first.id);
        expect(file.storagePath).toContain('v01.pdf');
    });

    it('rejects unsupported formats and out-of-scope RFIs', async () => {
        const { service } = makeService();

        await expect(service.generate({
            id: 'rfi-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            format: 'xlsx',
        })).rejects.toThrow('Invalid RFI export format');

        await expect(service.generate({
            id: 'rfi-1',
            projectId: 'project-2',
            organizationId: 'org-1',
            actorId: 'user-1',
            format: 'pdf',
        })).rejects.toThrow('RFI not found');
    });
});
