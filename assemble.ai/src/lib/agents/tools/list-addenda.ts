/**
 * list_addenda - read addenda for a project, optionally scoped to a stakeholder.
 */

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    addenda,
    addendumTransmittals,
    documents,
    fileAssets,
    projectStakeholders,
    versions,
} from '@/lib/db/pg-schema';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    asObject,
    optionalBoolean,
    optionalNonNegativeInteger,
    optionalString,
} from './_write-helpers';

interface ListAddendaInput {
    stakeholderId?: string;
    includeDocuments?: boolean;
    limit?: number;
}

interface ListAddendaOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    rows: Array<{
        id: string;
        stakeholderId: string | null;
        stakeholderName: string | null;
        stakeholderGroup: string | null;
        disciplineOrTrade: string | null;
        addendumNumber: number;
        content: string | null;
        addendumDate: string | null;
        transmittalCount: number;
        documents?: Array<{
            id: string;
            name: string | null;
            sortOrder: number;
        }>;
    }>;
}

const TOOL = 'list_addenda';
const DEFAULT_LIMIT = 50;
const HARD_LIMIT = 200;

const definition: AgentToolDefinition<ListAddendaInput, ListAddendaOutput> = {
    spec: {
        name: TOOL,
        description:
            'List project addenda, optionally for a specific consultant, contractor, or other stakeholder. Use before creating addenda when the current addendum number or prior content matters.',
        inputSchema: {
            type: 'object',
            properties: {
                stakeholderId: {
                    type: 'string',
                    description: 'Optional stakeholder id to list addenda for a single consultant/contractor.',
                },
                includeDocuments: {
                    type: 'boolean',
                    description: 'Set true to include transmittal document ids and names for each addendum.',
                },
                limit: {
                    type: 'integer',
                    minimum: 0,
                    maximum: HARD_LIMIT,
                    description: `Maximum addenda to return. Default ${DEFAULT_LIMIT}.`,
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListAddendaInput {
        const obj = input === undefined || input === null ? {} : asObject(input, TOOL);
        const out: ListAddendaInput = {};

        const stakeholderId = optionalString(obj, 'stakeholderId', TOOL);
        if (stakeholderId) out.stakeholderId = stakeholderId;

        const includeDocuments = optionalBoolean(obj, 'includeDocuments', TOOL);
        if (includeDocuments !== undefined) out.includeDocuments = includeDocuments;

        const limit = optionalNonNegativeInteger(obj, 'limit', TOOL);
        if (limit !== undefined) out.limit = Math.min(HARD_LIMIT, limit);

        return out;
    },
    async execute(ctx: ToolContext, input: ListAddendaInput): Promise<ListAddendaOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [eq(addenda.projectId, ctx.projectId)];
        if (input.stakeholderId) conditions.push(eq(addenda.stakeholderId, input.stakeholderId));

        const rows = await db
            .select({
                id: addenda.id,
                stakeholderId: addenda.stakeholderId,
                stakeholderName: projectStakeholders.name,
                stakeholderGroup: projectStakeholders.stakeholderGroup,
                disciplineOrTrade: projectStakeholders.disciplineOrTrade,
                addendumNumber: addenda.addendumNumber,
                content: addenda.content,
                addendumDate: addenda.addendumDate,
                transmittalCount: sql<number>`count(${addendumTransmittals.id})`,
            })
            .from(addenda)
            .leftJoin(projectStakeholders, eq(addenda.stakeholderId, projectStakeholders.id))
            .leftJoin(addendumTransmittals, eq(addendumTransmittals.addendumId, addenda.id))
            .where(and(...conditions))
            .groupBy(
                addenda.id,
                addenda.stakeholderId,
                projectStakeholders.name,
                projectStakeholders.stakeholderGroup,
                projectStakeholders.disciplineOrTrade,
                addenda.addendumNumber,
                addenda.content,
                addenda.addendumDate
            )
            .orderBy(asc(addenda.addendumNumber))
            .limit(limit + 1);

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;
        const outputRows: ListAddendaOutput['rows'] = trimmed.map((row) => ({
            id: row.id,
            stakeholderId: row.stakeholderId ?? null,
            stakeholderName: row.stakeholderName ?? null,
            stakeholderGroup: row.stakeholderGroup ?? null,
            disciplineOrTrade: row.disciplineOrTrade ?? null,
            addendumNumber: row.addendumNumber,
            content: row.content ?? null,
            addendumDate: row.addendumDate ?? null,
            transmittalCount: Number(row.transmittalCount ?? 0),
        }));

        if (input.includeDocuments && outputRows.length > 0) {
            const addendumIds = outputRows.map((row) => row.id);
            const documentRows = await db
                .select({
                    addendumId: addendumTransmittals.addendumId,
                    documentId: addendumTransmittals.documentId,
                    sortOrder: addendumTransmittals.sortOrder,
                    originalName: fileAssets.originalName,
                    drawingName: fileAssets.drawingName,
                })
                .from(addendumTransmittals)
                .innerJoin(documents, eq(addendumTransmittals.documentId, documents.id))
                .leftJoin(versions, eq(documents.latestVersionId, versions.id))
                .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
                .where(inArray(addendumTransmittals.addendumId, addendumIds))
                .orderBy(asc(addendumTransmittals.sortOrder));

            const byAddendum = new Map<string, NonNullable<ListAddendaOutput['rows'][number]['documents']>>();
            for (const doc of documentRows) {
                const list = byAddendum.get(doc.addendumId) ?? [];
                list.push({
                    id: doc.documentId,
                    name: doc.drawingName ?? doc.originalName ?? null,
                    sortOrder: doc.sortOrder,
                });
                byAddendum.set(doc.addendumId, list);
            }
            for (const row of outputRows) {
                row.documents = byAddendum.get(row.id) ?? [];
            }
        }

        return {
            projectId: ctx.projectId,
            rowCount: outputRows.length,
            truncated,
            rows: outputRows,
        };
    },
};

registerTool(definition);

export { definition as listAddendaTool };
