/**
 * list_notes - read project notes for agent context.
 */

import { db } from '@/lib/db';
import { notes } from '@/lib/db/pg-schema';
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListNotesInput {
    query?: string;
    starredOnly?: boolean;
    includeContent?: boolean;
    limit?: number;
}

interface ListNotesOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    rows: Array<{
        id: string;
        title: string;
        content?: string | null;
        isStarred: boolean;
        color: string | null;
        type: string | null;
        status: string | null;
        noteDate: string | null;
        updatedAt: string | null;
        rowVersion: number;
    }>;
}

const DEFAULT_LIMIT = 25;
const HARD_LIMIT = 100;

const definition: AgentToolDefinition<ListNotesInput, ListNotesOutput> = {
    spec: {
        name: 'list_notes',
        description:
            'List project notes, optionally filtered by text query or starred-only. Use before updating notes and to find current note ids and row versions.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Optional search across title/content.' },
                starredOnly: { type: 'boolean', description: 'Only return starred notes.' },
                includeContent: {
                    type: 'boolean',
                    description: 'Include note content in results. Defaults to true.',
                },
                limit: { type: 'integer', minimum: 1, maximum: HARD_LIMIT },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListNotesInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('list_notes: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListNotesInput = {};
        if (obj.query !== undefined) {
            if (typeof obj.query !== 'string') throw new Error('list_notes: "query" must be a string');
            const query = obj.query.trim();
            if (query) out.query = query;
        }
        if (obj.starredOnly !== undefined) {
            if (typeof obj.starredOnly !== 'boolean') throw new Error('list_notes: "starredOnly" must be a boolean');
            out.starredOnly = obj.starredOnly;
        }
        if (obj.includeContent !== undefined) {
            if (typeof obj.includeContent !== 'boolean') throw new Error('list_notes: "includeContent" must be a boolean');
            out.includeContent = obj.includeContent;
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_notes: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListNotesInput): Promise<ListNotesOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [
            eq(notes.projectId, ctx.projectId),
            eq(notes.organizationId, ctx.organizationId),
            isNull(notes.deletedAt),
        ];
        if (input.starredOnly) conditions.push(eq(notes.isStarred, true));
        if (input.query) {
            conditions.push(
                or(
                    ilike(notes.title, `%${input.query}%`),
                    ilike(notes.content, `%${input.query}%`)
                )!
            );
        }

        const rows = await db
            .select({
                id: notes.id,
                title: notes.title,
                content: notes.content,
                isStarred: notes.isStarred,
                color: notes.color,
                type: notes.type,
                status: notes.status,
                noteDate: notes.noteDate,
                updatedAt: notes.updatedAt,
                rowVersion: notes.rowVersion,
            })
            .from(notes)
            .where(and(...conditions))
            .orderBy(desc(notes.updatedAt))
            .limit(limit + 1);

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;
        const includeContent = input.includeContent ?? true;

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            truncated,
            rows: trimmed.map((row) => ({
                id: row.id,
                title: row.title,
                ...(includeContent ? { content: row.content ?? null } : {}),
                isStarred: row.isStarred ?? false,
                color: row.color ?? null,
                type: row.type ?? 'note',
                status: row.status ?? 'open',
                noteDate: row.noteDate ?? null,
                updatedAt: row.updatedAt ?? null,
                rowVersion: row.rowVersion ?? 1,
            })),
        };
    },
};

registerTool(definition);

export { definition as listNotesTool };
