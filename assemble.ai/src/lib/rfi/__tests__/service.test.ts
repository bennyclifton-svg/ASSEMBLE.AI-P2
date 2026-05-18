/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));

import {
    createRfiService,
    type EvidenceTarget,
    type InsertRfiAuditEventValues,
    type InsertRfiEvidenceLinkValues,
    type InsertRfiValues,
    type LegacyRfiNote,
    type RfiAuditEventRepositoryRow,
    type RfiEvidenceLinkRepositoryRow,
    type RfiRepository,
    type RfiRepositoryRow,
    type UpdateRfiValues,
} from '../service';
import type { RfiResponsibleParty } from '@/types/rfi';

class FakeRfiRepository implements RfiRepository {
    rows: RfiRepositoryRow[] = [];
    evidenceRows: RfiEvidenceLinkRepositoryRow[] = [];
    auditRows: RfiAuditEventRepositoryRow[] = [];
    projects = new Set<string>(['org-1:project-1']);
    parties = new Map<string, RfiResponsibleParty>([
        [
            'project-1:stakeholder-1',
            {
                id: 'stakeholder-1',
                name: 'Acoustic Consultant',
                organization: 'Acme Acoustics',
                role: 'Consultant',
                disciplineOrTrade: 'Acoustic',
            },
        ],
    ]);
    evidenceTargets = new Map<string, EvidenceTarget>([
        [
            'project-1:org-1:document:document-1',
            { targetType: 'document', targetId: 'document-1', label: 'Acoustic Report.pdf' },
        ],
        [
            'project-1:org-1:note:note-1',
            { targetType: 'note', targetId: 'note-1', label: 'Legacy RFI note' },
        ],
    ]);
    legacyNotes = new Map<string, LegacyRfiNote>([
        [
            'project-1:org-1:note-1',
            {
                id: 'note-1',
                projectId: 'project-1',
                organizationId: 'org-1',
                title: 'Legacy RFI note',
                content: 'Please confirm the acoustic treatment.',
                type: 'rfi',
                status: 'open',
                noteDate: '2026-05-14',
            },
        ],
    ]);

    async ensureProjectAccess(projectId: string, organizationId: string): Promise<boolean> {
        return this.projects.has(`${organizationId}:${projectId}`);
    }

    async nextRfiNumber(projectId: string): Promise<number> {
        const max = this.rows
            .filter((row) => row.projectId === projectId && !row.deletedAt)
            .reduce((value, row) => Math.max(value, row.rfiNumber), 0);
        return max + 1;
    }

    async findResponsibleParty(projectId: string, stakeholderId: string): Promise<RfiResponsibleParty | null> {
        return this.parties.get(`${projectId}:${stakeholderId}`) ?? null;
    }

    async listRfis(projectId: string, organizationId: string): Promise<RfiRepositoryRow[]> {
        return this.rows
            .filter((row) => row.projectId === projectId && row.organizationId === organizationId && !row.deletedAt)
            .sort((a, b) => a.rfiNumber - b.rfiNumber);
    }

    async getRfiById(id: string, organizationId: string, projectId?: string): Promise<RfiRepositoryRow | null> {
        return this.rows.find((row) =>
            row.id === id &&
            row.organizationId === organizationId &&
            !row.deletedAt &&
            (!projectId || row.projectId === projectId)
        ) ?? null;
    }

    async getRfiBySourceNoteId(
        noteId: string,
        organizationId: string,
        projectId: string
    ): Promise<RfiRepositoryRow | null> {
        return this.rows.find((row) =>
            row.sourceNoteId === noteId &&
            row.organizationId === organizationId &&
            row.projectId === projectId &&
            !row.deletedAt
        ) ?? null;
    }

    async insertRfi(values: InsertRfiValues): Promise<RfiRepositoryRow> {
        const party = values.responsibleStakeholderId
            ? await this.findResponsibleParty(values.projectId, values.responsibleStakeholderId)
            : null;
        const note = values.sourceNoteId
            ? this.legacyNotes.get(`${values.projectId}:${values.organizationId}:${values.sourceNoteId}`)
            : null;
        const row: RfiRepositoryRow = {
            ...values,
            responsibleName: party?.name ?? null,
            responsibleOrganization: party?.organization ?? null,
            responsibleRole: party?.role ?? null,
            responsibleDisciplineOrTrade: party?.disciplineOrTrade ?? null,
            sourceNoteTitle: note?.title ?? null,
            deletedAt: null,
        };
        this.rows.push(row);
        return row;
    }

    async updateRfi(id: string, organizationId: string, values: UpdateRfiValues): Promise<RfiRepositoryRow | null> {
        const row = await this.getRfiById(id, organizationId);
        if (!row) return null;
        Object.assign(row, values, { rowVersion: row.rowVersion + 1 });
        const party = row.responsibleStakeholderId
            ? await this.findResponsibleParty(row.projectId, row.responsibleStakeholderId)
            : null;
        row.responsibleName = party?.name ?? null;
        row.responsibleOrganization = party?.organization ?? null;
        row.responsibleRole = party?.role ?? null;
        row.responsibleDisciplineOrTrade = party?.disciplineOrTrade ?? null;
        return row;
    }

    async listEvidenceLinks(
        rfiIds: string[],
        organizationId: string
    ): Promise<RfiEvidenceLinkRepositoryRow[]> {
        return this.evidenceRows.filter((row) =>
            rfiIds.includes(row.rfiId) &&
            row.organizationId === organizationId
        );
    }

    async listAuditEvents(
        rfiIds: string[],
        organizationId: string
    ): Promise<RfiAuditEventRepositoryRow[]> {
        return this.auditRows.filter((row) =>
            rfiIds.includes(row.rfiId) &&
            row.organizationId === organizationId
        );
    }

    async findEvidenceTarget(
        projectId: string,
        organizationId: string,
        targetType: EvidenceTarget['targetType'],
        targetId: string
    ): Promise<EvidenceTarget | null> {
        return this.evidenceTargets.get(`${projectId}:${organizationId}:${targetType}:${targetId}`) ?? null;
    }

    async insertEvidenceLink(values: InsertRfiEvidenceLinkValues): Promise<RfiEvidenceLinkRepositoryRow> {
        const existing = this.evidenceRows.find((row) =>
            row.rfiId === values.rfiId &&
            row.targetType === values.targetType &&
            row.targetId === values.targetId
        );
        if (existing) return existing;
        this.evidenceRows.push(values);
        return values;
    }

    async deleteEvidenceLink(linkId: string, rfiId: string, organizationId: string): Promise<void> {
        this.evidenceRows = this.evidenceRows.filter((row) =>
            !(row.id === linkId && row.rfiId === rfiId && row.organizationId === organizationId)
        );
    }

    async insertAuditEvent(values: InsertRfiAuditEventValues): Promise<RfiAuditEventRepositoryRow> {
        this.auditRows.push(values);
        return values;
    }

    async getLegacyRfiNote(
        noteId: string,
        projectId: string,
        organizationId: string
    ): Promise<LegacyRfiNote | null> {
        return this.legacyNotes.get(`${projectId}:${organizationId}:${noteId}`) ?? null;
    }
}

function makeService(repository = new FakeRfiRepository()) {
    let id = 0;
    return {
        repository,
        service: createRfiService(repository, {
            now: () => new Date('2026-05-14T10:00:00.000Z'),
            idFactory: () => `rfi-${++id}`,
        }),
    };
}

describe('RFI service', () => {
    it('creates schema-backed RFIs with deterministic project numbering', async () => {
        const { service } = makeService();

        const first = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Plant noise',
            question: 'Please confirm rooftop plant acoustic attenuation.',
            responsibleStakeholderId: 'stakeholder-1',
            dueDate: '2026-05-20',
        });
        const second = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Fire stair clearance',
            question: 'Please confirm clearance.',
            status: 'open',
            priority: 'high',
        });

        expect(first.reference).toBe('RFI-001');
        expect(second.reference).toBe('RFI-002');
        expect(first.responsiblePartyLabel).toBe('Acoustic');
        expect(second.status).toBe('open');
        expect(second.priority).toBe('high');
    });

    it('rejects invalid responsible parties and invalid due dates', async () => {
        const { service } = makeService();

        await expect(service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Bad party',
            question: 'Who owns this?',
            responsibleStakeholderId: 'stakeholder-x',
        })).rejects.toThrow('Responsible party must be an active stakeholder');

        await expect(service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Bad date',
            question: 'When is this due?',
            dueDate: '2026-02-31',
        })).rejects.toThrow('YYYY-MM-DD');
    });

    it('derives overdue filter results from due date and non-terminal status', async () => {
        const { service } = makeService();

        await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Open overdue',
            question: 'Please respond.',
            status: 'open',
            dueDate: '2026-05-13',
        });
        await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Responded old',
            question: 'Already answered.',
            status: 'responded',
            dueDate: '2026-05-01',
        });

        const result = await service.list({
            projectId: 'project-1',
            organizationId: 'org-1',
            filter: 'overdue',
        });

        expect(result.rfis).toHaveLength(1);
        expect(result.rfis[0].title).toBe('Open overdue');
        expect(result.rfis[0].displayState).toBe('overdue');
    });

    it('updates core fields and increments row version', async () => {
        const { service } = makeService();
        const created = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Original',
            question: 'Original question',
        });

        const updated = await service.update({
            id: created.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Updated',
            question: 'Updated question',
            status: 'open',
            priority: 'urgent',
            dueDate: '2026-05-14',
        });

        expect(updated.title).toBe('Updated');
        expect(updated.status).toBe('open');
        expect(updated.priority).toBe('urgent');
        expect(updated.displayState).toBe('due_today');
        expect(updated.rowVersion).toBe(2);
    });

    it('records a response, links optional evidence, and writes an audit event', async () => {
        const { repository, service } = makeService();
        const created = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Response RFI',
            question: 'Please respond.',
            status: 'open',
        });

        const responded = await service.recordResponse({
            id: created.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            actorName: 'Test User',
            responseText: 'The acoustic treatment is confirmed.',
            responseDate: '2026-05-14',
            evidence: { targetType: 'document', targetId: 'document-1' },
        });

        expect(responded.status).toBe('responded');
        expect(responded.responseText).toBe('The acoustic treatment is confirmed.');
        expect(responded.responseDate).toBe('2026-05-14');
        expect(repository.evidenceRows).toHaveLength(1);
        expect(responded.auditTrail).toEqual([
            expect.objectContaining({
                action: 'response_recorded',
                actorId: 'user-1',
                actorName: 'Test User',
                previousStatus: 'open',
                newStatus: 'responded',
            }),
        ]);
    });

    it('closes responded RFIs and reopens closed RFIs with audit rows', async () => {
        const { service } = makeService();
        const created = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Close RFI',
            question: 'Please respond.',
            status: 'open',
        });
        const responded = await service.recordResponse({
            id: created.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            responseText: 'Answered.',
            responseDate: '2026-05-14',
        });

        const closed = await service.close({
            id: responded.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
        });
        const reopened = await service.reopen({
            id: closed.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
        });

        expect(closed.status).toBe('closed');
        expect(reopened.status).toBe('open');
        expect(reopened.auditTrail.map((event) => event.action)).toEqual([
            'response_recorded',
            'closed',
            'reopened',
        ]);
        expect(reopened.responseText).toBe('Answered.');
    });

    it('rejects invalid lifecycle transitions with clear errors', async () => {
        const { service } = makeService();
        const draftOnly = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Draft-only RFI',
            question: 'Not issued yet.',
        });
        const draft = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Draft RFI',
            question: 'Not issued yet.',
        });
        const open = await service.update({
            id: draft.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            status: 'open',
        });

        await expect(service.recordResponse({
            id: draftOnly.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            responseText: 'Too early.',
            responseDate: '2026-05-14',
        })).rejects.toThrow('Only open RFIs');

        await expect(service.close({
            id: open.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            actorId: 'user-1',
        })).rejects.toThrow('Only responded RFIs');

        await expect(service.update({
            id: open.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            status: 'closed',
        })).rejects.toThrow('Use the RFI response, close, or reopen action');
    });

    it('links document evidence idempotently and returns it on the RFI', async () => {
        const { repository, service } = makeService();
        const created = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Evidence RFI',
            question: 'Please confirm from the report.',
        });

        const first = await service.addEvidence({
            id: created.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            targetType: 'document',
            targetId: 'document-1',
        });
        const second = await service.addEvidence({
            id: created.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            targetType: 'document',
            targetId: 'document-1',
        });

        expect(repository.evidenceRows).toHaveLength(1);
        expect(first.evidenceLinks).toHaveLength(1);
        expect(second.evidenceLinks[0]).toMatchObject({
            targetType: 'document',
            targetId: 'document-1',
            label: 'Acoustic Report.pdf',
        });
    });

    it('rejects missing or out-of-project evidence targets', async () => {
        const { service } = makeService();
        const created = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            title: 'Bad evidence',
            question: 'Please confirm.',
        });

        await expect(service.addEvidence({
            id: created.id,
            projectId: 'project-1',
            organizationId: 'org-1',
            targetType: 'document',
            targetId: 'missing-document',
        })).rejects.toThrow('Evidence target not found');
    });

    it('promotes legacy RFI notes without deleting the note or duplicating the RFI', async () => {
        const { repository, service } = makeService();

        const first = await service.promoteFromNote({
            projectId: 'project-1',
            organizationId: 'org-1',
            noteId: 'note-1',
        });
        const second = await service.promoteFromNote({
            projectId: 'project-1',
            organizationId: 'org-1',
            noteId: 'note-1',
        });

        expect(repository.rows).toHaveLength(1);
        expect(first.id).toBe(second.id);
        expect(first.sourceNote).toEqual({ id: 'note-1', title: 'Legacy RFI note' });
        expect(first.question).toBe('Please confirm the acoustic treatment.');
        expect(second.evidenceLinks).toEqual([
            expect.objectContaining({
                targetType: 'note',
                targetId: 'note-1',
                label: 'Legacy RFI note',
            }),
        ]);
        expect(repository.legacyNotes.has('project-1:org-1:note-1')).toBe(true);
    });
});
