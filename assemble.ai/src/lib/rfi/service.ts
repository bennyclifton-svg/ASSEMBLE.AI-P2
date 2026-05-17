import { and, asc, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    correspondence,
    documents,
    fileAssets,
    notes,
    projectStakeholders,
    projects,
    rfiAuditEvents,
    rfiEvidenceLinks,
    rfiRecords,
    versions,
} from '@/lib/db/pg-schema';
import {
    deriveRfiDisplayState,
    formatRfiNumber,
    isRfiEvidenceTargetType,
    isRfiFilter,
    isRfiPriority,
    isRfiStatus,
    isValidIsoDate,
    matchesRfiFilter,
    toLocalIsoDate,
    type AddRfiEvidenceRequest,
    type CreateRfiRequest,
    type RecordRfiResponseRequest,
    type RfiAuditAction,
    type RfiAuditEvent,
    type RfiEvidenceLink,
    type RfiEvidenceTargetType,
    type RfiFilter,
    type RfiPriority,
    type RfiRecord,
    type RfiResponsibleParty,
    type RfiStatus,
    type RfiSourceNote,
    type UpdateRfiRequest,
} from '@/types/rfi';

export type RfiServiceErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN';

export class RfiServiceError extends Error {
    code: RfiServiceErrorCode;
    status: number;

    constructor(code: RfiServiceErrorCode, message: string, status: number) {
        super(message);
        this.name = 'RfiServiceError';
        this.code = code;
        this.status = status;
    }
}

type TimestampValue = Date | string | null | undefined;

export interface RfiRepositoryRow {
    id: string;
    projectId: string;
    organizationId: string;
    rfiNumber: number;
    title: string;
    question: string;
    status: RfiStatus;
    priority: RfiPriority;
    responsibleStakeholderId: string | null;
    responsibleName: string | null;
    responsibleOrganization: string | null;
    responsibleRole: string | null;
    responsibleDisciplineOrTrade: string | null;
    dueDate: string | null;
    responseText: string | null;
    responseDate: string | null;
    sourceNoteId: string | null;
    sourceNoteTitle: string | null;
    rowVersion: number;
    createdAt: TimestampValue;
    updatedAt: TimestampValue;
    deletedAt: TimestampValue;
}

export interface RfiEvidenceLinkRepositoryRow {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
    createdAt: TimestampValue;
}

export interface RfiAuditEventRepositoryRow {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    action: RfiAuditAction;
    actorId: string;
    actorName: string | null;
    previousStatus: RfiStatus;
    newStatus: RfiStatus;
    createdAt: TimestampValue;
}

export interface EvidenceTarget {
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
}

export interface InsertRfiEvidenceLinkValues {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
    createdAt: Date;
}

export interface InsertRfiAuditEventValues {
    id: string;
    rfiId: string;
    projectId: string;
    organizationId: string;
    action: RfiAuditAction;
    actorId: string;
    actorName: string | null;
    previousStatus: RfiStatus;
    newStatus: RfiStatus;
    createdAt: Date;
}

export interface LegacyRfiNote {
    id: string;
    projectId: string;
    organizationId: string;
    title: string;
    content: string | null;
    type: string;
    status: string;
    noteDate: string | null;
}

export interface InsertRfiValues {
    id: string;
    projectId: string;
    organizationId: string;
    rfiNumber: number;
    title: string;
    question: string;
    status: RfiStatus;
    priority: RfiPriority;
    responsibleStakeholderId: string | null;
    dueDate: string | null;
    responseText: string | null;
    responseDate: string | null;
    sourceNoteId: string | null;
    rowVersion: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateRfiValues {
    title?: string;
    question?: string;
    status?: RfiStatus;
    priority?: RfiPriority;
    responsibleStakeholderId?: string | null;
    dueDate?: string | null;
    responseText?: string | null;
    responseDate?: string | null;
    updatedAt: Date;
}

export interface RfiLifecycleActor {
    actorId: string;
    actorName?: string | null;
}

export interface RfiRepository {
    ensureProjectAccess(projectId: string, organizationId: string): Promise<boolean>;
    nextRfiNumber(projectId: string): Promise<number>;
    findResponsibleParty(projectId: string, stakeholderId: string): Promise<RfiResponsibleParty | null>;
    listRfis(projectId: string, organizationId: string): Promise<RfiRepositoryRow[]>;
    getRfiById(id: string, organizationId: string, projectId?: string): Promise<RfiRepositoryRow | null>;
    getRfiBySourceNoteId(noteId: string, organizationId: string, projectId: string): Promise<RfiRepositoryRow | null>;
    insertRfi(values: InsertRfiValues): Promise<RfiRepositoryRow>;
    updateRfi(id: string, organizationId: string, values: UpdateRfiValues): Promise<RfiRepositoryRow | null>;
    listEvidenceLinks(rfiIds: string[], organizationId: string): Promise<RfiEvidenceLinkRepositoryRow[]>;
    listAuditEvents(rfiIds: string[], organizationId: string): Promise<RfiAuditEventRepositoryRow[]>;
    findEvidenceTarget(
        projectId: string,
        organizationId: string,
        targetType: RfiEvidenceTargetType,
        targetId: string
    ): Promise<EvidenceTarget | null>;
    insertEvidenceLink(values: InsertRfiEvidenceLinkValues): Promise<RfiEvidenceLinkRepositoryRow>;
    deleteEvidenceLink(linkId: string, rfiId: string, organizationId: string): Promise<void>;
    insertAuditEvent(values: InsertRfiAuditEventValues): Promise<RfiAuditEventRepositoryRow>;
    getLegacyRfiNote(noteId: string, projectId: string, organizationId: string): Promise<LegacyRfiNote | null>;
}

export interface RfiServiceOptions {
    now?: () => Date;
    idFactory?: () => string;
}

const ISO_DATE_ERROR = 'Use YYYY-MM-DD for dueDate.';
const RESPONSE_DATE_ERROR = 'Use YYYY-MM-DD for responseDate.';

function makeId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `rfi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toIsoString(value: TimestampValue, fallback: Date): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return fallback.toISOString();
}

function normalizeText(value: unknown, field: string): string {
    if (typeof value !== 'string') {
        throw new RfiServiceError('VALIDATION', `${field} is required.`, 400);
    }
    const trimmed = value.trim();
    if (!trimmed) {
        throw new RfiServiceError('VALIDATION', `${field} is required.`, 400);
    }
    return trimmed;
}

function normalizeOptionalDate(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (!isValidIsoDate(value)) {
        throw new RfiServiceError('VALIDATION', ISO_DATE_ERROR, 400);
    }
    return value;
}

function normalizeRequiredDate(value: unknown, message: string): string {
    if (!isValidIsoDate(value)) {
        throw new RfiServiceError('VALIDATION', message, 400);
    }
    return value;
}

function normalizeOptionalActorName(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function normalizeResponsibleStakeholderId(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    if (typeof value !== 'string' || !value.trim()) {
        throw new RfiServiceError('VALIDATION', 'responsibleStakeholderId must be a stakeholder id or null.', 400);
    }
    return value.trim();
}

function normalizeEvidenceTargetType(value: unknown): RfiEvidenceTargetType {
    if (!isRfiEvidenceTargetType(value)) {
        throw new RfiServiceError('VALIDATION', 'Invalid RFI evidence target type.', 400);
    }
    return value;
}

function normalizeTargetId(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new RfiServiceError('VALIDATION', 'targetId is required.', 400);
    }
    return value.trim();
}

function normalizeNoteId(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new RfiServiceError('VALIDATION', 'noteId is required.', 400);
    }
    return value.trim();
}

function normalizeStatus(value: unknown, fallback: RfiStatus): RfiStatus {
    if (value === undefined || value === null || value === '') return fallback;
    if (!isRfiStatus(value)) {
        throw new RfiServiceError('VALIDATION', 'Invalid RFI status.', 400);
    }
    return value;
}

function assertEditableStatusTransition(previousStatus: RfiStatus, nextStatus: RfiStatus): void {
    if (previousStatus === nextStatus) return;
    const lifecycleStatus = nextStatus === 'responded' || nextStatus === 'closed' ||
        previousStatus === 'responded' || previousStatus === 'closed';
    if (lifecycleStatus) {
        throw new RfiServiceError(
            'VALIDATION',
            'Use the RFI response, close, or reopen action for lifecycle status changes.',
            400
        );
    }
}

function assertLifecycleStatus(row: RfiRepositoryRow, expected: RfiStatus, action: string): void {
    if (row.status !== expected) {
        throw new RfiServiceError('VALIDATION', `Only ${expected} RFIs can be ${action}.`, 400);
    }
}

function normalizePriority(value: unknown, fallback: RfiPriority): RfiPriority {
    if (value === undefined || value === null || value === '') return fallback;
    if (!isRfiPriority(value)) {
        throw new RfiServiceError('VALIDATION', 'Invalid RFI priority.', 400);
    }
    return value;
}

function normalizeFilter(value: unknown): RfiFilter {
    return isRfiFilter(value) ? value : 'all';
}

function responsiblePartyLabel(party: RfiResponsibleParty | null): string {
    if (!party) return 'Unassigned';
    return party.disciplineOrTrade || party.organization || party.name;
}

function toEvidenceLink(row: RfiEvidenceLinkRepositoryRow, fallbackDate: Date): RfiEvidenceLink {
    return {
        id: row.id,
        rfiId: row.rfiId,
        projectId: row.projectId,
        organizationId: row.organizationId,
        targetType: row.targetType,
        targetId: row.targetId,
        label: row.label,
        createdAt: toIsoString(row.createdAt, fallbackDate),
    };
}

function toAuditEvent(row: RfiAuditEventRepositoryRow, fallbackDate: Date): RfiAuditEvent {
    return {
        id: row.id,
        rfiId: row.rfiId,
        projectId: row.projectId,
        organizationId: row.organizationId,
        action: row.action,
        actorId: row.actorId,
        actorName: row.actorName,
        previousStatus: row.previousStatus,
        newStatus: row.newStatus,
        createdAt: toIsoString(row.createdAt, fallbackDate),
    };
}

function toSourceNote(row: RfiRepositoryRow): RfiSourceNote | null {
    if (!row.sourceNoteId || !row.sourceNoteTitle) return null;
    return {
        id: row.sourceNoteId,
        title: row.sourceNoteTitle,
    };
}

function toRfiRecord(
    row: RfiRepositoryRow,
    today: string,
    fallbackDate: Date,
    evidenceRows: RfiEvidenceLinkRepositoryRow[] = [],
    auditRows: RfiAuditEventRepositoryRow[] = []
): RfiRecord {
    const responsibleParty = row.responsibleStakeholderId && row.responsibleName
        ? {
              id: row.responsibleStakeholderId,
              name: row.responsibleName,
              organization: row.responsibleOrganization,
              role: row.responsibleRole,
              disciplineOrTrade: row.responsibleDisciplineOrTrade,
          }
        : null;
    const displayState = deriveRfiDisplayState({ status: row.status, dueDate: row.dueDate }, today);

    return {
        id: row.id,
        projectId: row.projectId,
        organizationId: row.organizationId,
        rfiNumber: row.rfiNumber,
        reference: formatRfiNumber(row.rfiNumber),
        title: row.title,
        question: row.question,
        status: row.status,
        priority: row.priority,
        responsibleStakeholderId: row.responsibleStakeholderId,
        responsibleParty,
        responsiblePartyLabel: responsiblePartyLabel(responsibleParty),
        dueDate: row.dueDate,
        responseText: row.responseText,
        responseDate: row.responseDate,
        sourceNoteId: row.sourceNoteId,
        sourceNote: toSourceNote(row),
        evidenceLinks: evidenceRows.map((link) => toEvidenceLink(link, fallbackDate)),
        auditTrail: auditRows.map((event) => toAuditEvent(event, fallbackDate)),
        displayState,
        isOverdue: displayState === 'overdue',
        rowVersion: row.rowVersion,
        createdAt: toIsoString(row.createdAt, fallbackDate),
        updatedAt: toIsoString(row.updatedAt, fallbackDate),
        deletedAt: row.deletedAt ? toIsoString(row.deletedAt, fallbackDate) : null,
    };
}

async function assertProjectAccess(repository: RfiRepository, projectId: string, organizationId: string): Promise<void> {
    const allowed = await repository.ensureProjectAccess(projectId, organizationId);
    if (!allowed) {
        throw new RfiServiceError('NOT_FOUND', 'Project not found.', 404);
    }
}

async function assertResponsibleParty(
    repository: RfiRepository,
    projectId: string,
    responsibleStakeholderId: string | null | undefined
): Promise<void> {
    if (!responsibleStakeholderId) return;
    const party = await repository.findResponsibleParty(projectId, responsibleStakeholderId);
    if (!party) {
        throw new RfiServiceError('VALIDATION', 'Responsible party must be an active stakeholder on this project.', 400);
    }
}

export function createRfiService(repository: RfiRepository, options: RfiServiceOptions = {}) {
    const now = options.now ?? (() => new Date());
    const idFactory = options.idFactory ?? makeId;

    async function evidenceByRfiId(rows: RfiRepositoryRow[]): Promise<Map<string, RfiEvidenceLinkRepositoryRow[]>> {
        const ids = rows.map((row) => row.id);
        if (ids.length === 0) return new Map();
        const evidenceRows = await repository.listEvidenceLinks(ids, rows[0]?.organizationId ?? '');
        const byRfiId = new Map<string, RfiEvidenceLinkRepositoryRow[]>();
        for (const link of evidenceRows) {
            const current = byRfiId.get(link.rfiId) ?? [];
            current.push(link);
            byRfiId.set(link.rfiId, current);
        }
        return byRfiId;
    }

    async function auditByRfiId(rows: RfiRepositoryRow[]): Promise<Map<string, RfiAuditEventRepositoryRow[]>> {
        const ids = rows.map((row) => row.id);
        if (ids.length === 0) return new Map();
        const auditRows = await repository.listAuditEvents(ids, rows[0]?.organizationId ?? '');
        const byRfiId = new Map<string, RfiAuditEventRepositoryRow[]>();
        for (const event of auditRows) {
            const current = byRfiId.get(event.rfiId) ?? [];
            current.push(event);
            byRfiId.set(event.rfiId, current);
        }
        return byRfiId;
    }

    async function recordFromRow(row: RfiRepositoryRow, timestamp = now()): Promise<RfiRecord> {
        const [evidenceRows, auditRows] = await Promise.all([
            repository.listEvidenceLinks([row.id], row.organizationId),
            repository.listAuditEvents([row.id], row.organizationId),
        ]);
        return toRfiRecord(row, toLocalIsoDate(timestamp), timestamp, evidenceRows, auditRows);
    }

    async function insertAuditEvent(
        row: RfiRepositoryRow,
        action: RfiAuditAction,
        previousStatus: RfiStatus,
        newStatus: RfiStatus,
        actor: RfiLifecycleActor,
        timestamp: Date
    ): Promise<void> {
        await repository.insertAuditEvent({
            id: idFactory(),
            rfiId: row.id,
            projectId: row.projectId,
            organizationId: row.organizationId,
            action,
            actorId: normalizeText(actor.actorId, 'actorId'),
            actorName: normalizeOptionalActorName(actor.actorName),
            previousStatus,
            newStatus,
            createdAt: timestamp,
        });
    }

    return {
        async list(input: { projectId: string; organizationId: string; filter?: unknown }) {
            await assertProjectAccess(repository, input.projectId, input.organizationId);
            const filter = normalizeFilter(input.filter);
            const today = toLocalIsoDate(now());
            const rows = await repository.listRfis(input.projectId, input.organizationId);
            const [evidenceRowsByRfiId, auditRowsByRfiId] = await Promise.all([
                evidenceByRfiId(rows),
                auditByRfiId(rows),
            ]);
            const rfis = rows
                .filter((row) => matchesRfiFilter({ status: row.status, dueDate: row.dueDate }, filter, today))
                .map((row) => toRfiRecord(
                    row,
                    today,
                    now(),
                    evidenceRowsByRfiId.get(row.id) ?? [],
                    auditRowsByRfiId.get(row.id) ?? []
                ));

            return { rfis, total: rfis.length, filter };
        },

        async get(input: { id: string; projectId?: string; organizationId: string }) {
            const row = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            return recordFromRow(row);
        },

        async create(input: { projectId: string; organizationId: string } & CreateRfiRequest) {
            await assertProjectAccess(repository, input.projectId, input.organizationId);
            const title = normalizeText(input.title, 'title');
            const question = normalizeText(input.question, 'question');
            const status = normalizeStatus(input.status, 'draft');
            const priority = normalizePriority(input.priority, 'medium');
            const dueDate = normalizeOptionalDate(input.dueDate) ?? null;
            const responsibleStakeholderId = normalizeResponsibleStakeholderId(input.responsibleStakeholderId) ?? null;
            await assertResponsibleParty(repository, input.projectId, responsibleStakeholderId);

            const timestamp = now();
            const row = await repository.insertRfi({
                id: idFactory(),
                projectId: input.projectId,
                organizationId: input.organizationId,
                rfiNumber: await repository.nextRfiNumber(input.projectId),
                title,
                question,
                status,
                priority,
                responsibleStakeholderId,
                dueDate,
                responseText: null,
                responseDate: null,
                sourceNoteId: null,
                rowVersion: 1,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            return recordFromRow(row, timestamp);
        },

        async update(input: { id: string; projectId: string; organizationId: string } & UpdateRfiRequest) {
            const existing = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!existing) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }

            const values: UpdateRfiValues = { updatedAt: now() };
            if (input.title !== undefined) values.title = normalizeText(input.title, 'title');
            if (input.question !== undefined) values.question = normalizeText(input.question, 'question');
            if (input.status !== undefined) {
                values.status = normalizeStatus(input.status, existing.status);
                assertEditableStatusTransition(existing.status, values.status);
            }
            if (input.priority !== undefined) values.priority = normalizePriority(input.priority, existing.priority);
            if (input.dueDate !== undefined) values.dueDate = normalizeOptionalDate(input.dueDate) ?? null;
            if (input.responsibleStakeholderId !== undefined) {
                values.responsibleStakeholderId =
                    normalizeResponsibleStakeholderId(input.responsibleStakeholderId) ?? null;
                await assertResponsibleParty(repository, existing.projectId, values.responsibleStakeholderId);
            }

            const row = await repository.updateRfi(input.id, input.organizationId, values);
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            return recordFromRow(row, values.updatedAt);
        },

        async recordResponse(input: {
            id: string;
            projectId: string;
            organizationId: string;
        } & RecordRfiResponseRequest & RfiLifecycleActor) {
            const existing = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!existing) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            assertLifecycleStatus(existing, 'open', 'recorded as responded');

            const responseText = normalizeText(input.responseText, 'responseText');
            const responseDate = normalizeRequiredDate(input.responseDate, RESPONSE_DATE_ERROR);
            const timestamp = now();
            const previousStatus = existing.status;

            if (input.evidence) {
                const targetType = normalizeEvidenceTargetType(input.evidence.targetType);
                const targetId = normalizeTargetId(input.evidence.targetId);
                const target = await repository.findEvidenceTarget(
                    input.projectId,
                    input.organizationId,
                    targetType,
                    targetId
                );
                if (!target) {
                    throw new RfiServiceError('NOT_FOUND', 'Evidence target not found in this project.', 404);
                }
                await repository.insertEvidenceLink({
                    id: idFactory(),
                    rfiId: existing.id,
                    projectId: existing.projectId,
                    organizationId: existing.organizationId,
                    targetType,
                    targetId,
                    label: target.label,
                    createdAt: timestamp,
                });
            }

            const row = await repository.updateRfi(input.id, input.organizationId, {
                status: 'responded',
                responseText,
                responseDate,
                updatedAt: timestamp,
            });
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            await insertAuditEvent(existing, 'response_recorded', previousStatus, 'responded', input, timestamp);
            return recordFromRow(row, timestamp);
        },

        async close(input: { id: string; projectId: string; organizationId: string } & RfiLifecycleActor) {
            const existing = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!existing) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            assertLifecycleStatus(existing, 'responded', 'closed');

            const timestamp = now();
            const previousStatus = existing.status;
            const row = await repository.updateRfi(input.id, input.organizationId, {
                status: 'closed',
                updatedAt: timestamp,
            });
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            await insertAuditEvent(existing, 'closed', previousStatus, 'closed', input, timestamp);
            return recordFromRow(row, timestamp);
        },

        async reopen(input: { id: string; projectId: string; organizationId: string } & RfiLifecycleActor) {
            const existing = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!existing) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            assertLifecycleStatus(existing, 'closed', 'reopened');

            const timestamp = now();
            const previousStatus = existing.status;
            const row = await repository.updateRfi(input.id, input.organizationId, {
                status: 'open',
                updatedAt: timestamp,
            });
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            await insertAuditEvent(existing, 'reopened', previousStatus, 'open', input, timestamp);
            return recordFromRow(row, timestamp);
        },

        async addEvidence(input: { id: string; projectId: string; organizationId: string } & AddRfiEvidenceRequest) {
            const row = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }

            const targetType = normalizeEvidenceTargetType(input.targetType);
            const targetId = normalizeTargetId(input.targetId);
            const target = await repository.findEvidenceTarget(input.projectId, input.organizationId, targetType, targetId);
            if (!target) {
                throw new RfiServiceError('NOT_FOUND', 'Evidence target not found in this project.', 404);
            }

            await repository.insertEvidenceLink({
                id: idFactory(),
                rfiId: row.id,
                projectId: row.projectId,
                organizationId: row.organizationId,
                targetType,
                targetId,
                label: target.label,
                createdAt: now(),
            });

            const updated = await repository.getRfiById(row.id, row.organizationId, row.projectId);
            if (!updated) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            return recordFromRow(updated);
        },

        async removeEvidence(input: {
            id: string;
            projectId: string;
            organizationId: string;
            linkId: string;
        }) {
            const row = await repository.getRfiById(input.id, input.organizationId, input.projectId);
            if (!row) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            await repository.deleteEvidenceLink(normalizeTargetId(input.linkId), row.id, input.organizationId);
            const updated = await repository.getRfiById(row.id, row.organizationId, row.projectId);
            if (!updated) {
                throw new RfiServiceError('NOT_FOUND', 'RFI not found.', 404);
            }
            return recordFromRow(updated);
        },

        async promoteFromNote(input: { projectId: string; organizationId: string; noteId: unknown }) {
            await assertProjectAccess(repository, input.projectId, input.organizationId);
            const noteId = normalizeNoteId(input.noteId);
            const note = await repository.getLegacyRfiNote(noteId, input.projectId, input.organizationId);
            if (!note) {
                throw new RfiServiceError('NOT_FOUND', 'RFI note not found.', 404);
            }
            if (note.type !== 'rfi') {
                throw new RfiServiceError('VALIDATION', 'Only notes with type rfi can be promoted.', 400);
            }

            const existing = await repository.getRfiBySourceNoteId(note.id, input.organizationId, input.projectId);
            if (existing) {
                return recordFromRow(existing);
            }

            const timestamp = now();
            const title = normalizeText(note.title || 'Promoted RFI note', 'title');
            const question = normalizeText(note.content || note.title, 'question');
            const row = await repository.insertRfi({
                id: idFactory(),
                projectId: input.projectId,
                organizationId: input.organizationId,
                rfiNumber: await repository.nextRfiNumber(input.projectId),
                title,
                question,
                status: 'draft',
                priority: 'medium',
                responsibleStakeholderId: null,
                dueDate: null,
                responseText: null,
                responseDate: null,
                sourceNoteId: note.id,
                rowVersion: 1,
                createdAt: timestamp,
                updatedAt: timestamp,
            });

            await repository.insertEvidenceLink({
                id: idFactory(),
                rfiId: row.id,
                projectId: row.projectId,
                organizationId: row.organizationId,
                targetType: 'note',
                targetId: note.id,
                label: note.title,
                createdAt: timestamp,
            });

            return recordFromRow(row, timestamp);
        },
    };
}

const rfiSelect = {
    id: rfiRecords.id,
    projectId: rfiRecords.projectId,
    organizationId: rfiRecords.organizationId,
    rfiNumber: rfiRecords.rfiNumber,
    title: rfiRecords.title,
    question: rfiRecords.question,
    status: rfiRecords.status,
    priority: rfiRecords.priority,
    responsibleStakeholderId: rfiRecords.responsibleStakeholderId,
    responsibleName: projectStakeholders.name,
    responsibleOrganization: projectStakeholders.organization,
    responsibleRole: projectStakeholders.role,
    responsibleDisciplineOrTrade: projectStakeholders.disciplineOrTrade,
    dueDate: rfiRecords.dueDate,
    responseText: rfiRecords.responseText,
    responseDate: rfiRecords.responseDate,
    sourceNoteId: rfiRecords.sourceNoteId,
    sourceNoteTitle: notes.title,
    rowVersion: rfiRecords.rowVersion,
    createdAt: rfiRecords.createdAt,
    updatedAt: rfiRecords.updatedAt,
    deletedAt: rfiRecords.deletedAt,
};

async function selectRfiById(id: string, organizationId: string, projectId?: string): Promise<RfiRepositoryRow | null> {
    const conditions = [
        eq(rfiRecords.id, id),
        eq(rfiRecords.organizationId, organizationId),
        isNull(rfiRecords.deletedAt),
    ];
    if (projectId) conditions.push(eq(rfiRecords.projectId, projectId));

    const [row] = await db
        .select(rfiSelect)
        .from(rfiRecords)
        .leftJoin(projectStakeholders, eq(rfiRecords.responsibleStakeholderId, projectStakeholders.id))
        .leftJoin(notes, eq(rfiRecords.sourceNoteId, notes.id))
        .where(and(...conditions))
        .limit(1);

    return row ?? null;
}

export const drizzleRfiRepository: RfiRepository = {
    async ensureProjectAccess(projectId, organizationId) {
        const [project] = await db
            .select({ id: projects.id })
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
            .limit(1);
        return Boolean(project);
    },

    async nextRfiNumber(projectId) {
        const [row] = await db
            .select({ maxNumber: max(rfiRecords.rfiNumber) })
            .from(rfiRecords)
            .where(eq(rfiRecords.projectId, projectId));
        return Number(row?.maxNumber ?? 0) + 1;
    },

    async findResponsibleParty(projectId, stakeholderId) {
        const [row] = await db
            .select({
                id: projectStakeholders.id,
                name: projectStakeholders.name,
                organization: projectStakeholders.organization,
                role: projectStakeholders.role,
                disciplineOrTrade: projectStakeholders.disciplineOrTrade,
            })
            .from(projectStakeholders)
            .where(
                and(
                    eq(projectStakeholders.id, stakeholderId),
                    eq(projectStakeholders.projectId, projectId),
                    isNull(projectStakeholders.deletedAt)
                )
            )
            .limit(1);
        return row ?? null;
    },

    async listRfis(projectId, organizationId) {
        return db
            .select(rfiSelect)
            .from(rfiRecords)
            .leftJoin(projectStakeholders, eq(rfiRecords.responsibleStakeholderId, projectStakeholders.id))
            .leftJoin(notes, eq(rfiRecords.sourceNoteId, notes.id))
            .where(
                and(
                    eq(rfiRecords.projectId, projectId),
                    eq(rfiRecords.organizationId, organizationId),
                    isNull(rfiRecords.deletedAt)
                )
            )
            .orderBy(asc(rfiRecords.rfiNumber));
    },

    getRfiById: selectRfiById,

    async getRfiBySourceNoteId(noteId, organizationId, projectId) {
        const [row] = await db
            .select(rfiSelect)
            .from(rfiRecords)
            .leftJoin(projectStakeholders, eq(rfiRecords.responsibleStakeholderId, projectStakeholders.id))
            .leftJoin(notes, eq(rfiRecords.sourceNoteId, notes.id))
            .where(
                and(
                    eq(rfiRecords.sourceNoteId, noteId),
                    eq(rfiRecords.organizationId, organizationId),
                    eq(rfiRecords.projectId, projectId),
                    isNull(rfiRecords.deletedAt)
                )
            )
            .limit(1);
        return row ?? null;
    },

    async insertRfi(values) {
        const [inserted] = await db
            .insert(rfiRecords)
            .values(values)
            .returning({ id: rfiRecords.id });
        const row = await selectRfiById(inserted.id, values.organizationId, values.projectId);
        if (!row) {
            throw new RfiServiceError('NOT_FOUND', 'RFI not found after create.', 404);
        }
        return row;
    },

    async updateRfi(id, organizationId, values) {
        await db
            .update(rfiRecords)
            .set({
                ...values,
                rowVersion: sql`${rfiRecords.rowVersion} + 1`,
            })
            .where(and(eq(rfiRecords.id, id), eq(rfiRecords.organizationId, organizationId), isNull(rfiRecords.deletedAt)));
        return selectRfiById(id, organizationId);
    },

    async listEvidenceLinks(rfiIds, organizationId) {
        if (rfiIds.length === 0) return [];
        return db
            .select({
                id: rfiEvidenceLinks.id,
                rfiId: rfiEvidenceLinks.rfiId,
                projectId: rfiEvidenceLinks.projectId,
                organizationId: rfiEvidenceLinks.organizationId,
                targetType: rfiEvidenceLinks.targetType,
                targetId: rfiEvidenceLinks.targetId,
                label: rfiEvidenceLinks.label,
                createdAt: rfiEvidenceLinks.createdAt,
            })
            .from(rfiEvidenceLinks)
            .where(
                and(
                    eq(rfiEvidenceLinks.organizationId, organizationId),
                    inArray(rfiEvidenceLinks.rfiId, rfiIds)
                )
            )
            .orderBy(asc(rfiEvidenceLinks.createdAt));
    },

    async listAuditEvents(rfiIds, organizationId) {
        if (rfiIds.length === 0) return [];
        return db
            .select({
                id: rfiAuditEvents.id,
                rfiId: rfiAuditEvents.rfiId,
                projectId: rfiAuditEvents.projectId,
                organizationId: rfiAuditEvents.organizationId,
                action: rfiAuditEvents.action,
                actorId: rfiAuditEvents.actorId,
                actorName: rfiAuditEvents.actorName,
                previousStatus: rfiAuditEvents.previousStatus,
                newStatus: rfiAuditEvents.newStatus,
                createdAt: rfiAuditEvents.createdAt,
            })
            .from(rfiAuditEvents)
            .where(
                and(
                    eq(rfiAuditEvents.organizationId, organizationId),
                    inArray(rfiAuditEvents.rfiId, rfiIds)
                )
            )
            .orderBy(asc(rfiAuditEvents.createdAt));
    },

    async findEvidenceTarget(projectId, organizationId, targetType, targetId) {
        if (targetType === 'document') {
            const [row] = await db
                .select({
                    id: documents.id,
                    originalName: fileAssets.originalName,
                    drawingName: fileAssets.drawingName,
                })
                .from(documents)
                .leftJoin(versions, eq(documents.latestVersionId, versions.id))
                .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                .where(and(eq(documents.id, targetId), eq(documents.projectId, projectId)))
                .limit(1);
            if (!row) return null;
            return {
                targetType,
                targetId: row.id,
                label: row.drawingName ?? row.originalName ?? row.id,
            };
        }

        if (targetType === 'note') {
            const [row] = await db
                .select({ id: notes.id, title: notes.title })
                .from(notes)
                .where(
                    and(
                        eq(notes.id, targetId),
                        eq(notes.projectId, projectId),
                        eq(notes.organizationId, organizationId),
                        isNull(notes.deletedAt)
                    )
                )
                .limit(1);
            if (!row) return null;
            return { targetType, targetId: row.id, label: row.title };
        }

        const [row] = await db
            .select({ id: correspondence.id, subject: correspondence.subject })
            .from(correspondence)
            .where(and(eq(correspondence.id, targetId), eq(correspondence.projectId, projectId)))
            .limit(1);
        if (!row) return null;
        return { targetType, targetId: row.id, label: row.subject };
    },

    async insertEvidenceLink(values) {
        const [existing] = await db
            .select({
                id: rfiEvidenceLinks.id,
                rfiId: rfiEvidenceLinks.rfiId,
                projectId: rfiEvidenceLinks.projectId,
                organizationId: rfiEvidenceLinks.organizationId,
                targetType: rfiEvidenceLinks.targetType,
                targetId: rfiEvidenceLinks.targetId,
                label: rfiEvidenceLinks.label,
                createdAt: rfiEvidenceLinks.createdAt,
            })
            .from(rfiEvidenceLinks)
            .where(
                and(
                    eq(rfiEvidenceLinks.rfiId, values.rfiId),
                    eq(rfiEvidenceLinks.targetType, values.targetType),
                    eq(rfiEvidenceLinks.targetId, values.targetId)
                )
            )
            .limit(1);
        if (existing) return existing;

        const [created] = await db
            .insert(rfiEvidenceLinks)
            .values(values)
            .returning();
        return created;
    },

    async deleteEvidenceLink(linkId, rfiId, organizationId) {
        await db
            .delete(rfiEvidenceLinks)
            .where(
                and(
                    eq(rfiEvidenceLinks.id, linkId),
                    eq(rfiEvidenceLinks.rfiId, rfiId),
                    eq(rfiEvidenceLinks.organizationId, organizationId)
                )
            );
    },

    async insertAuditEvent(values) {
        const [created] = await db
            .insert(rfiAuditEvents)
            .values(values)
            .returning();
        return created;
    },

    async getLegacyRfiNote(noteId, projectId, organizationId) {
        const [row] = await db
            .select({
                id: notes.id,
                projectId: notes.projectId,
                organizationId: notes.organizationId,
                title: notes.title,
                content: notes.content,
                type: notes.type,
                status: notes.status,
                noteDate: notes.noteDate,
            })
            .from(notes)
            .where(
                and(
                    eq(notes.id, noteId),
                    eq(notes.projectId, projectId),
                    eq(notes.organizationId, organizationId),
                    isNull(notes.deletedAt)
                )
            )
            .limit(1);
        return row ?? null;
    },
};

export const rfiService = createRfiService(drizzleRfiRepository);
