import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiMemoryEntries, projects } from '@/lib/db/pg-schema';
import {
    AI_MEMORY_CATEGORY_LABELS,
    isAiMemoryCategory,
    isAiMemorySource,
    isAiMemoryStatus,
    type AiMemoryCategory,
    type AiMemoryEntry,
    type AiMemorySource,
    type AiMemoryStatus,
    type CreateAiMemoryEntryRequest,
    type UpdateAiMemoryEntryRequest,
} from '@/types/ai-memory';

export type AiMemoryServiceErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN';

export class AiMemoryServiceError extends Error {
    code: AiMemoryServiceErrorCode;
    status: number;

    constructor(code: AiMemoryServiceErrorCode, message: string, status: number) {
        super(message);
        this.name = 'AiMemoryServiceError';
        this.code = code;
        this.status = status;
    }
}

type TimestampValue = Date | string | null | undefined;

export interface AiMemoryRepositoryRow {
    id: string;
    projectId: string;
    organizationId: string;
    category: AiMemoryCategory;
    title: string;
    content: string;
    status: AiMemoryStatus;
    source: AiMemorySource;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: TimestampValue;
    updatedAt: TimestampValue;
    deletedAt: TimestampValue;
}

export interface InsertAiMemoryValues {
    id: string;
    projectId: string;
    organizationId: string;
    category: AiMemoryCategory;
    title: string;
    content: string;
    status: AiMemoryStatus;
    source: AiMemorySource;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateAiMemoryValues {
    category?: AiMemoryCategory;
    title?: string;
    content?: string;
    status?: AiMemoryStatus;
    updatedBy?: string | null;
    updatedAt: Date;
    deletedAt?: Date | null;
}

export interface AiMemoryRepository {
    ensureProjectAccess(projectId: string, organizationId: string): Promise<boolean>;
    list(projectId: string, organizationId: string): Promise<AiMemoryRepositoryRow[]>;
    listActiveForContext(projectId: string): Promise<AiMemoryRepositoryRow[]>;
    get(id: string, projectId: string, organizationId: string): Promise<AiMemoryRepositoryRow | null>;
    insert(values: InsertAiMemoryValues): Promise<AiMemoryRepositoryRow>;
    update(
        id: string,
        projectId: string,
        organizationId: string,
        values: UpdateAiMemoryValues
    ): Promise<AiMemoryRepositoryRow | null>;
}

export interface AiMemoryServiceOptions {
    now?: () => Date;
    idFactory?: () => string;
}

function makeId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `ai-memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toIsoString(value: TimestampValue, fallback: Date): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return fallback.toISOString();
}

function normalizeText(value: unknown, field: string): string {
    if (typeof value !== 'string') {
        throw new AiMemoryServiceError('VALIDATION', `${field} is required.`, 400);
    }
    const trimmed = value.trim();
    if (!trimmed) {
        throw new AiMemoryServiceError('VALIDATION', `${field} is required.`, 400);
    }
    return trimmed;
}

function normalizeOptionalActor(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function normalizeCategory(value: unknown, fallback: AiMemoryCategory): AiMemoryCategory {
    if (value === undefined || value === null || value === '') return fallback;
    if (!isAiMemoryCategory(value)) {
        throw new AiMemoryServiceError('VALIDATION', 'Invalid AI memory category.', 400);
    }
    return value;
}

function normalizeStatus(value: unknown, fallback: AiMemoryStatus): AiMemoryStatus {
    if (value === undefined || value === null || value === '') return fallback;
    if (!isAiMemoryStatus(value)) {
        throw new AiMemoryServiceError('VALIDATION', 'Invalid AI memory status.', 400);
    }
    return value;
}

function normalizeSource(value: unknown, fallback: AiMemorySource): AiMemorySource {
    if (value === undefined || value === null || value === '') return fallback;
    if (!isAiMemorySource(value)) {
        throw new AiMemoryServiceError('VALIDATION', 'Invalid AI memory source.', 400);
    }
    return value;
}

async function assertProjectAccess(
    repository: AiMemoryRepository,
    projectId: string,
    organizationId: string
): Promise<void> {
    const allowed = await repository.ensureProjectAccess(projectId, organizationId);
    if (!allowed) {
        throw new AiMemoryServiceError('NOT_FOUND', 'Project not found.', 404);
    }
}

function toEntry(row: AiMemoryRepositoryRow, fallbackDate: Date): AiMemoryEntry {
    return {
        id: row.id,
        projectId: row.projectId,
        organizationId: row.organizationId,
        category: row.category,
        title: row.title,
        content: row.content,
        status: row.status,
        source: row.source,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: toIsoString(row.createdAt, fallbackDate),
        updatedAt: toIsoString(row.updatedAt, fallbackDate),
        deletedAt: row.deletedAt ? toIsoString(row.deletedAt, fallbackDate) : null,
    };
}

export function formatAiMemoryContext(entries: AiMemoryEntry[]): string {
    const activeEntries = entries.filter((entry) => entry.status === 'active' && !entry.deletedAt);
    if (activeEntries.length === 0) return '';

    const lines = [
        '## AI Memory (Advisory Preferences And Context)',
        'These entries are user-reviewable preferences/context only. Schema-backed project records, stored files, document excerpts, issued artefacts, and explicit instructions in the current task override this memory if anything conflicts.',
    ];

    for (const entry of activeEntries) {
        const category = AI_MEMORY_CATEGORY_LABELS[entry.category];
        lines.push(`- ${category}: ${entry.title} - ${entry.content}`);
    }

    return lines.join('\n');
}

export function createAiMemoryService(repository: AiMemoryRepository, options: AiMemoryServiceOptions = {}) {
    const now = options.now ?? (() => new Date());
    const idFactory = options.idFactory ?? makeId;

    return {
        async list(input: { projectId: string; organizationId: string }) {
            await assertProjectAccess(repository, input.projectId, input.organizationId);
            const timestamp = now();
            const entries = (await repository.list(input.projectId, input.organizationId)).map((row) =>
                toEntry(row, timestamp)
            );
            return {
                entries,
                activeCount: entries.filter((entry) => entry.status === 'active' && !entry.deletedAt).length,
            };
        },

        async listActiveForContext(input: { projectId: string }) {
            const timestamp = now();
            return (await repository.listActiveForContext(input.projectId)).map((row) => toEntry(row, timestamp));
        },

        async get(input: { id: string; projectId: string; organizationId: string }) {
            const row = await repository.get(input.id, input.projectId, input.organizationId);
            if (!row) {
                throw new AiMemoryServiceError('NOT_FOUND', 'AI memory entry not found.', 404);
            }
            return toEntry(row, now());
        },

        async create(input: {
            projectId: string;
            organizationId: string;
            createdBy?: string | null;
            source?: unknown;
        } & CreateAiMemoryEntryRequest) {
            await assertProjectAccess(repository, input.projectId, input.organizationId);
            const timestamp = now();
            const row = await repository.insert({
                id: idFactory(),
                projectId: input.projectId,
                organizationId: input.organizationId,
                category: normalizeCategory(input.category, 'preference'),
                title: normalizeText(input.title, 'title'),
                content: normalizeText(input.content, 'content'),
                status: normalizeStatus(input.status, 'active'),
                source: normalizeSource(input.source, 'manual'),
                createdBy: normalizeOptionalActor(input.createdBy),
                updatedBy: normalizeOptionalActor(input.createdBy),
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            return toEntry(row, timestamp);
        },

        async update(input: {
            id: string;
            projectId: string;
            organizationId: string;
            updatedBy?: string | null;
        } & UpdateAiMemoryEntryRequest) {
            const existing = await repository.get(input.id, input.projectId, input.organizationId);
            if (!existing) {
                throw new AiMemoryServiceError('NOT_FOUND', 'AI memory entry not found.', 404);
            }

            const values: UpdateAiMemoryValues = {
                updatedAt: now(),
                updatedBy: normalizeOptionalActor(input.updatedBy),
            };
            if (input.category !== undefined) values.category = normalizeCategory(input.category, existing.category);
            if (input.title !== undefined) values.title = normalizeText(input.title, 'title');
            if (input.content !== undefined) values.content = normalizeText(input.content, 'content');
            if (input.status !== undefined) {
                values.status = normalizeStatus(input.status, existing.status);
                values.deletedAt = values.status === 'inactive' ? now() : null;
            }

            const row = await repository.update(input.id, input.projectId, input.organizationId, values);
            if (!row) {
                throw new AiMemoryServiceError('NOT_FOUND', 'AI memory entry not found.', 404);
            }
            return toEntry(row, values.updatedAt);
        },

        async delete(input: {
            id: string;
            projectId: string;
            organizationId: string;
            updatedBy?: string | null;
        }) {
            const existing = await repository.get(input.id, input.projectId, input.organizationId);
            if (!existing) {
                throw new AiMemoryServiceError('NOT_FOUND', 'AI memory entry not found.', 404);
            }
            const timestamp = now();
            const row = await repository.update(input.id, input.projectId, input.organizationId, {
                status: 'inactive',
                updatedBy: normalizeOptionalActor(input.updatedBy),
                updatedAt: timestamp,
                deletedAt: timestamp,
            });
            if (!row) {
                throw new AiMemoryServiceError('NOT_FOUND', 'AI memory entry not found.', 404);
            }
            return toEntry(row, timestamp);
        },
    };
}

const memorySelect = {
    id: aiMemoryEntries.id,
    projectId: aiMemoryEntries.projectId,
    organizationId: aiMemoryEntries.organizationId,
    category: aiMemoryEntries.category,
    title: aiMemoryEntries.title,
    content: aiMemoryEntries.content,
    status: aiMemoryEntries.status,
    source: aiMemoryEntries.source,
    createdBy: aiMemoryEntries.createdBy,
    updatedBy: aiMemoryEntries.updatedBy,
    createdAt: aiMemoryEntries.createdAt,
    updatedAt: aiMemoryEntries.updatedAt,
    deletedAt: aiMemoryEntries.deletedAt,
};

export const drizzleAiMemoryRepository: AiMemoryRepository = {
    async ensureProjectAccess(projectId, organizationId) {
        const [project] = await db
            .select({ id: projects.id })
            .from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
            .limit(1);
        return Boolean(project);
    },

    async list(projectId, organizationId) {
        return db
            .select(memorySelect)
            .from(aiMemoryEntries)
            .where(and(eq(aiMemoryEntries.projectId, projectId), eq(aiMemoryEntries.organizationId, organizationId)))
            .orderBy(asc(aiMemoryEntries.category), asc(aiMemoryEntries.title));
    },

    async listActiveForContext(projectId) {
        return db
            .select(memorySelect)
            .from(aiMemoryEntries)
            .where(
                and(
                    eq(aiMemoryEntries.projectId, projectId),
                    eq(aiMemoryEntries.status, 'active'),
                    isNull(aiMemoryEntries.deletedAt)
                )
            )
            .orderBy(asc(aiMemoryEntries.category), asc(aiMemoryEntries.title));
    },

    async get(id, projectId, organizationId) {
        const [row] = await db
            .select(memorySelect)
            .from(aiMemoryEntries)
            .where(
                and(
                    eq(aiMemoryEntries.id, id),
                    eq(aiMemoryEntries.projectId, projectId),
                    eq(aiMemoryEntries.organizationId, organizationId)
                )
            )
            .limit(1);
        return row ?? null;
    },

    async insert(values) {
        const [created] = await db.insert(aiMemoryEntries).values(values).returning(memorySelect);
        return created;
    },

    async update(id, projectId, organizationId, values) {
        const [updated] = await db
            .update(aiMemoryEntries)
            .set(values)
            .where(
                and(
                    eq(aiMemoryEntries.id, id),
                    eq(aiMemoryEntries.projectId, projectId),
                    eq(aiMemoryEntries.organizationId, organizationId)
                )
            )
            .returning(memorySelect);
        return updated ?? null;
    },
};

export const aiMemoryService = createAiMemoryService(drizzleAiMemoryRepository);
