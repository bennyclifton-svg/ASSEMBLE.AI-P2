/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
    },
}));

import {
    createAiMemoryService,
    formatAiMemoryContext,
    type AiMemoryRepository,
    type AiMemoryRepositoryRow,
    type InsertAiMemoryValues,
    type UpdateAiMemoryValues,
} from '../service';

function createRepository(initialRows: AiMemoryRepositoryRow[] = []) {
    const rows = [...initialRows];

    const repository: AiMemoryRepository = {
        ensureProjectAccess: jest.fn(async (projectId, organizationId) =>
            projectId === 'project-1' && organizationId === 'org-1'
        ),
        list: jest.fn(async (projectId, organizationId) =>
            rows.filter((row) => row.projectId === projectId && row.organizationId === organizationId)
        ),
        listActiveForContext: jest.fn(async (projectId) =>
            rows.filter((row) => row.projectId === projectId && row.status === 'active' && !row.deletedAt)
        ),
        get: jest.fn(async (id, projectId, organizationId) =>
            rows.find(
                (row) =>
                    row.id === id &&
                    row.projectId === projectId &&
                    row.organizationId === organizationId
            ) ?? null
        ),
        insert: jest.fn(async (values: InsertAiMemoryValues) => {
            const row: AiMemoryRepositoryRow = { ...values, deletedAt: null };
            rows.push(row);
            return row;
        }),
        update: jest.fn(async (
            id: string,
            projectId: string,
            organizationId: string,
            values: UpdateAiMemoryValues
        ) => {
            const index = rows.findIndex(
                (row) =>
                    row.id === id &&
                    row.projectId === projectId &&
                    row.organizationId === organizationId
            );
            if (index === -1) return null;
            rows[index] = { ...rows[index], ...values };
            return rows[index];
        }),
    };

    return { repository, rows };
}

function memoryRow(overrides: Partial<AiMemoryRepositoryRow> & { id: string }): AiMemoryRepositoryRow {
    return {
        id: overrides.id,
        projectId: 'project-1',
        organizationId: 'org-1',
        category: 'preference',
        title: 'Reporting tone',
        content: 'Use concise commercial language.',
        status: 'active',
        source: 'manual',
        createdBy: 'user-1',
        updatedBy: 'user-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        updatedAt: '2026-05-14T00:00:00.000Z',
        deletedAt: null,
        ...overrides,
    };
}

describe('ai memory service', () => {
    const now = new Date('2026-05-14T01:00:00.000Z');

    test('creates reviewable active memory entries', async () => {
        const { repository } = createRepository();
        const service = createAiMemoryService(repository, {
            now: () => now,
            idFactory: () => 'memory-1',
        });

        const entry = await service.create({
            projectId: 'project-1',
            organizationId: 'org-1',
            createdBy: 'user-1',
            title: ' Meeting style ',
            content: ' Always include decisions first. ',
        });

        expect(entry).toMatchObject({
            id: 'memory-1',
            category: 'preference',
            title: 'Meeting style',
            content: 'Always include decisions first.',
            status: 'active',
            source: 'manual',
            createdBy: 'user-1',
            updatedBy: 'user-1',
        });
        expect(repository.ensureProjectAccess).toHaveBeenCalledWith('project-1', 'org-1');
    });

    test('updates entries and removes inactive entries from context', async () => {
        const { repository } = createRepository([memoryRow({ id: 'memory-1' })]);
        const service = createAiMemoryService(repository, { now: () => now });

        const updated = await service.update({
            id: 'memory-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            updatedBy: 'user-2',
            category: 'reporting',
            title: 'Monthly reports',
            content: 'Prefer exception summaries.',
            status: 'inactive',
        });

        expect(updated).toMatchObject({
            id: 'memory-1',
            category: 'reporting',
            title: 'Monthly reports',
            content: 'Prefer exception summaries.',
            status: 'inactive',
            updatedBy: 'user-2',
            deletedAt: now.toISOString(),
        });
        await expect(service.listActiveForContext({ projectId: 'project-1' })).resolves.toEqual([]);
    });

    test('soft deletes entries by marking them inactive', async () => {
        const { repository } = createRepository([memoryRow({ id: 'memory-1' })]);
        const service = createAiMemoryService(repository, { now: () => now });

        const deleted = await service.delete({
            id: 'memory-1',
            projectId: 'project-1',
            organizationId: 'org-1',
            updatedBy: 'user-2',
        });

        expect(deleted.status).toBe('inactive');
        expect(deleted.deletedAt).toBe(now.toISOString());
        await expect(service.listActiveForContext({ projectId: 'project-1' })).resolves.toEqual([]);
    });

    test('formats memory as advisory context with explicit precedence', () => {
        const context = formatAiMemoryContext([
            {
                id: 'memory-1',
                projectId: 'project-1',
                organizationId: 'org-1',
                category: 'assumption',
                title: 'Region shorthand',
                content: 'Use NSW examples when asking for precedents.',
                status: 'active',
                source: 'manual',
                createdBy: 'user-1',
                updatedBy: 'user-1',
                createdAt: '2026-05-14T00:00:00.000Z',
                updatedAt: '2026-05-14T00:00:00.000Z',
                deletedAt: null,
            },
            {
                id: 'memory-2',
                projectId: 'project-1',
                organizationId: 'org-1',
                category: 'preference',
                title: 'Inactive',
                content: 'Do not include me.',
                status: 'inactive',
                source: 'manual',
                createdBy: 'user-1',
                updatedBy: 'user-1',
                createdAt: '2026-05-14T00:00:00.000Z',
                updatedAt: '2026-05-14T00:00:00.000Z',
                deletedAt: '2026-05-14T01:00:00.000Z',
            },
        ]);

        expect(context).toContain('AI Memory');
        expect(context).toContain('Schema-backed project records');
        expect(context).toContain('Assumption: Region shorthand - Use NSW examples');
        expect(context).not.toContain('Do not include me');
    });
});
