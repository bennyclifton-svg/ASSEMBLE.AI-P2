jest.mock('@/lib/db', () => ({ db: { select: jest.fn() } }));
jest.mock('../../events', () => ({ emitChatEvent: jest.fn() }));
jest.mock('../../project-events', () => ({ emitProjectEvent: jest.fn() }));

import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { listProjectDocumentsTool } from '../list-project-documents';
import { selectProjectDocumentsTool } from '../select-project-documents';
import type { ToolContext } from '../_context';

const ctx: ToolContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    threadId: 'thread-1',
    runId: 'run-1',
};

function queryBuilder(rows: unknown[], onWhere?: (condition: unknown) => void) {
    const builder: Record<string, unknown> = {
        from: jest.fn(() => builder),
        leftJoin: jest.fn(() => builder),
        orderBy: jest.fn(() => builder),
        where: jest.fn((condition: unknown) => {
            onWhere?.(condition);
            return builder;
        }),
        limit: jest.fn(() => rows),
        then: Promise.resolve(rows).then.bind(Promise.resolve(rows)),
    };
    return builder;
}

function renderSql(condition: unknown): string {
    return new PgDialect().sqlToQuery(condition as SQL).sql;
}

function expectDocumentScopeSearch(sql: string) {
    expect(sql).toContain('"subcategories"."name"');
    expect(sql).toContain('"consultant_disciplines"."discipline_name"');
    expect(sql).toContain('"contractor_trades"."trade_name"');
    expect(sql).toContain('"categories"."name"');
    expect(sql).toContain('"file_assets"."drawing_name"');
    expect(sql).toContain('"file_assets"."original_name"');
    expect(sql).toContain('"file_assets"."drawing_number"');
}

describe('document discipline filters', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists discipline requests across metadata and document titles', async () => {
        let capturedWhere: unknown;
        (db.select as jest.Mock)
            .mockReturnValueOnce(queryBuilder([{ organizationId: 'org-1' }]))
            .mockReturnValueOnce(queryBuilder([{ count: 2 }], (condition) => {
                capturedWhere = condition;
            }));

        const output = await listProjectDocumentsTool.execute(ctx, {
            disciplineOrTrade: 'Electrical',
        });

        expect(output.totalCount).toBe(2);
        expectDocumentScopeSearch(renderSql(capturedWhere));
    });

    it('selects discipline requests across metadata and document titles', async () => {
        let capturedWhere: unknown;
        (db.select as jest.Mock)
            .mockReturnValueOnce(queryBuilder([{ organizationId: 'org-1' }]))
            .mockReturnValueOnce(queryBuilder([{ id: 'doc-electrical-plan' }], (condition) => {
                capturedWhere = condition;
            }));

        const output = await selectProjectDocumentsTool.execute(ctx, {
            mode: 'replace',
            disciplineOrTrade: 'Electrical',
        });

        expect(output.selectedCount).toBe(1);
        expect(output.documentIds).toEqual(['doc-electrical-plan']);
        expectDocumentScopeSearch(renderSql(capturedWhere));
    });
});
