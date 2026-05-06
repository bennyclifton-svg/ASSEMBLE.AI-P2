/**
 * create_transmittal - propose a draft project transmittal from existing documents.
 */

import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    categories,
    consultantDisciplines,
    contractorTrades,
    documents,
    fileAssets,
    projectStakeholders,
    subcategories,
    versions,
} from '@/lib/db/pg-schema';
import { proposeApproval, type ProposedDiff } from '../approvals';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import {
    asObject,
    copyToolUseId,
    optionalBoolean,
    optionalEnum,
    optionalNonNegativeInteger,
    optionalString,
    optionalStringArray,
    type AwaitingApprovalOutput,
} from './_write-helpers';
import { documentTitleSearchCondition } from './document-search';

interface CreateTransmittalInput extends Record<string, unknown> {
    name?: string;
    documentIds?: string[];
    categoryId?: string;
    subcategoryId?: string;
    categoryName?: string;
    subcategoryName?: string;
    disciplineOrTrade?: string;
    drawingNumber?: string;
    documentName?: string;
    stakeholderId?: string;
    destination?: 'note' | 'project';
    allProjectDocuments?: boolean;
    limit?: number;
    _toolUseId?: string;
}

interface ResolvedDocument {
    id: string;
    name: string;
    drawingNumber: string | null;
    drawingRevision: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}

const TOOL = 'create_transmittal';
const DEFAULT_LIMIT = 200;
const HARD_LIMIT = 500;
const DESTINATIONS = ['note', 'project'] as const;

const definition: AgentToolDefinition<CreateTransmittalInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a transmittal from existing project documents. Generic transmittals are created as Transmittal notes so they appear in the Notes section. Use destination="project" only when the user is creating a stakeholder/subcategory project transmittal and provide stakeholderId or subcategoryId. For requests like "select all basement drawings and create a transmittal", call select_project_documents first and pass its selected documentIds, or pass documentName="basement" when the user did not ask for repo selection. The transmittal is not created until the user approves the inline approval card.',
        inputSchema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description:
                        'Optional transmittal name. If omitted, the tool derives a concise name from the document filter.',
                },
                documentIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Specific project document ids to include. Prefer the ids returned by select_project_documents when the user asked to select and create a transmittal.',
                },
                categoryId: {
                    type: 'string',
                    description: 'Optional category id filter for documents to include.',
                },
                subcategoryId: {
                    type: 'string',
                    description: 'Optional subcategory id filter for documents to include.',
                },
                categoryName: {
                    type: 'string',
                    description: 'Optional case-insensitive category name contains filter.',
                },
                subcategoryName: {
                    type: 'string',
                    description:
                        'Optional case-insensitive subcategory, consultant discipline, or contractor trade name contains filter.',
                },
                disciplineOrTrade: {
                    type: 'string',
                    description:
                        'Alias for subcategoryName. Use for requests like "create a transmittal of all mechanical documents".',
                },
                drawingNumber: {
                    type: 'string',
                    description:
                        'Optional drawing number filter. Use for requests like "create a transmittal for drawing CC-20".',
                },
                documentName: {
                    type: 'string',
                    description:
                        'Optional document or drawing title/name contains filter. Use for requests like "create a transmittal for basement drawings" or "create a transmittal for stair drawings". Matches extracted drawing names, drawing numbers combined with titles, and original filenames.',
                },
                stakeholderId: {
                    type: 'string',
                    description:
                        'Optional project stakeholder id if this transmittal belongs to a specific consultant, contractor, authority, or client stakeholder.',
                },
                destination: {
                    type: 'string',
                    enum: [...DESTINATIONS],
                    description:
                        'Use "note" for a transmittal that should appear in the Notes section. Use "project" only for stakeholder/subcategory project transmittals.',
                },
                allProjectDocuments: {
                    type: 'boolean',
                    description:
                        'Set true only when the user explicitly asks for a transmittal containing every project document.',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_LIMIT,
                    description:
                        `Safety limit for filtered transmittal requests. Default ${DEFAULT_LIMIT}; maximum ${HARD_LIMIT}. If more documents match, the tool asks for a narrower filter.`,
                },
            },
        },
    },
    mutating: true,
    validate(input: unknown): CreateTransmittalInput {
        const obj = asObject(input, TOOL);
        const out: CreateTransmittalInput = {};

        const name = optionalString(obj, 'name', TOOL);
        if (name) out.name = name;

        const documentIds = optionalStringArray(obj, 'documentIds', TOOL);
        if (documentIds !== undefined && documentIds.length > 0) out.documentIds = documentIds;

        const categoryId = optionalString(obj, 'categoryId', TOOL);
        if (categoryId) out.categoryId = categoryId;

        const subcategoryId = optionalString(obj, 'subcategoryId', TOOL);
        if (subcategoryId) out.subcategoryId = subcategoryId;

        const categoryName = optionalString(obj, 'categoryName', TOOL);
        if (categoryName) out.categoryName = categoryName;

        const subcategoryName = optionalString(obj, 'subcategoryName', TOOL);
        if (subcategoryName) out.subcategoryName = subcategoryName;

        const disciplineOrTrade = optionalString(obj, 'disciplineOrTrade', TOOL);
        if (disciplineOrTrade) out.disciplineOrTrade = disciplineOrTrade;

        const drawingNumber = optionalString(obj, 'drawingNumber', TOOL);
        if (drawingNumber) out.drawingNumber = drawingNumber;

        const documentName = optionalString(obj, 'documentName', TOOL);
        if (documentName) out.documentName = documentName;

        const stakeholderId = optionalString(obj, 'stakeholderId', TOOL);
        if (stakeholderId) out.stakeholderId = stakeholderId;

        const destination = optionalEnum(obj, 'destination', DESTINATIONS, TOOL);
        if (destination) out.destination = destination;

        const allProjectDocuments = optionalBoolean(obj, 'allProjectDocuments', TOOL);
        if (allProjectDocuments !== undefined) out.allProjectDocuments = allProjectDocuments;

        const limit = optionalNonNegativeInteger(obj, 'limit', TOOL);
        if (limit !== undefined) out.limit = Math.max(1, Math.min(HARD_LIMIT, limit));

        const hasDocumentSource =
            (out.documentIds?.length ?? 0) > 0 ||
            Boolean(out.categoryId) ||
            Boolean(out.subcategoryId) ||
            Boolean(out.categoryName) ||
            Boolean(out.subcategoryName) ||
            Boolean(out.disciplineOrTrade) ||
            Boolean(out.drawingNumber) ||
            Boolean(out.documentName) ||
            out.allProjectDocuments === true;
        if (!hasDocumentSource) {
            throw new Error(
                `${TOOL}: provide documentIds, a document filter, or allProjectDocuments=true`
            );
        }

        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateTransmittalInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const stakeholder = input.stakeholderId
            ? await resolveStakeholder(ctx, input.stakeholderId)
            : null;
        const docs = input.documentIds?.length
            ? await resolveExplicitDocuments(ctx.projectId, input.documentIds)
            : await resolveFilteredDocuments(ctx.projectId, input);

        if (docs.length === 0) {
            throw new Error(`${TOOL}: no matching project documents were found`);
        }

        const name = input.name ?? defaultTransmittalName(input);
        const destination = input.destination ?? (input.stakeholderId || input.subcategoryId ? 'project' : 'note');
        const proposedInput = {
            name,
            destination,
            ...(input.stakeholderId ? { stakeholderId: input.stakeholderId } : {}),
            ...(input.subcategoryId ? { subcategoryId: input.subcategoryId } : {}),
            documentIds: docs.map((doc) => doc.id),
        };

        const diff: ProposedDiff = {
            entity: 'transmittal',
            entityId: null,
            summary: `Create transmittal - ${name}`,
            changes: [
                { field: 'name', label: 'Name', before: '-', after: name },
                {
                    field: 'scope',
                    label: 'Scope',
                    before: '-',
                    after:
                        destination === 'note'
                            ? 'Notes section transmittal'
                            : stakeholder
                                ? stakeholderLabel(stakeholder)
                                : 'Project transmittal',
                },
                {
                    field: 'documentIds',
                    label: 'Documents',
                    before: '-',
                    after: formatDocumentList(docs),
                },
            ],
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input: proposedInput,
                proposedDiff: diff,
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

async function resolveStakeholder(ctx: ToolContext, stakeholderId: string) {
    const [row] = await db
        .select({
            id: projectStakeholders.id,
            stakeholderGroup: projectStakeholders.stakeholderGroup,
            name: projectStakeholders.name,
            disciplineOrTrade: projectStakeholders.disciplineOrTrade,
        })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, stakeholderId),
                eq(projectStakeholders.projectId, ctx.projectId),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);

    if (!row) throw new Error(`${TOOL}: stakeholderId was not found in this project`);
    return row;
}

async function resolveExplicitDocuments(
    projectId: string,
    documentIds: string[]
): Promise<ResolvedDocument[]> {
    const ids = Array.from(new Set(documentIds.filter(Boolean)));
    const rows = await baseDocumentQuery()
        .where(and(eq(documents.projectId, projectId), inArray(documents.id, ids)));

    const byId = new Map(rows.map((row) => [row.id, toResolvedDocument(row)]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
        throw new Error(`${TOOL}: document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
}

async function resolveFilteredDocuments(
    projectId: string,
    input: CreateTransmittalInput
): Promise<ResolvedDocument[]> {
    const conditions = [eq(documents.projectId, projectId)];
    if (input.categoryId) conditions.push(eq(documents.categoryId, input.categoryId));
    if (input.subcategoryId) conditions.push(eq(documents.subcategoryId, input.subcategoryId));
    if (input.categoryName) conditions.push(ilike(categories.name, `%${input.categoryName}%`));
    if (input.subcategoryName) conditions.push(documentNameCondition(input.subcategoryName));
    if (input.disciplineOrTrade) conditions.push(documentNameCondition(input.disciplineOrTrade));
    if (input.drawingNumber) {
        conditions.push(
            sql`(
                ${fileAssets.drawingNumber} ILIKE ${input.drawingNumber}
                OR regexp_replace(lower(coalesce(${fileAssets.drawingNumber}, '')), '[^a-z0-9]', '', 'g') =
                    ${normaliseDrawingNumber(input.drawingNumber)}
            )`
        );
    }
    if (input.documentName) conditions.push(documentTitleSearchCondition(input.documentName));

    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await baseDocumentQuery()
        .where(and(...conditions))
        .orderBy(desc(documents.updatedAt))
        .limit(limit + 1);

    if (rows.length > limit) {
        throw new Error(
            `${TOOL}: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
        );
    }

    return rows.map(toResolvedDocument);
}

function baseDocumentQuery() {
    return db
        .select({
            id: documents.id,
            originalName: fileAssets.originalName,
            drawingNumber: fileAssets.drawingNumber,
            drawingName: fileAssets.drawingName,
            drawingRevision: fileAssets.drawingRevision,
            categoryName: categories.name,
            subcategoryName: sql<string | null>`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName})`,
        })
        .from(documents)
        .leftJoin(versions, eq(documents.latestVersionId, versions.id))
        .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
        .leftJoin(categories, eq(documents.categoryId, categories.id))
        .leftJoin(subcategories, eq(documents.subcategoryId, subcategories.id))
        .leftJoin(consultantDisciplines, eq(documents.subcategoryId, consultantDisciplines.id))
        .leftJoin(contractorTrades, eq(documents.subcategoryId, contractorTrades.id))
        .$dynamic();
}

function documentNameCondition(value: string) {
    const pattern = `%${value}%`;
    return or(
        sql`COALESCE(${subcategories.name}, ${consultantDisciplines.disciplineName}, ${contractorTrades.tradeName}) ILIKE ${pattern}`,
        ilike(categories.name, pattern),
        ilike(fileAssets.originalName, pattern),
        ilike(fileAssets.drawingName, pattern)
    )!;
}

function toResolvedDocument(row: {
    id: string;
    originalName: string | null;
    drawingNumber: string | null;
    drawingName: string | null;
    drawingRevision: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}): ResolvedDocument {
    return {
        id: row.id,
        name: row.drawingName ?? row.originalName ?? row.id,
        drawingNumber: row.drawingNumber ?? null,
        drawingRevision: row.drawingRevision ?? null,
        categoryName: row.categoryName ?? null,
        subcategoryName: row.subcategoryName ?? null,
    };
}

function defaultTransmittalName(input: CreateTransmittalInput): string {
    const source =
        input.documentName ??
        input.drawingNumber ??
        input.disciplineOrTrade ??
        input.subcategoryName ??
        input.categoryName;
    if (!source) return 'Project Document Transmittal';
    return `${titleCase(source)} Drawings Transmittal`;
}

function formatDocumentList(docs: ResolvedDocument[]): string {
    const names = docs
        .map((doc) => {
            const number = doc.drawingNumber ? `${doc.drawingNumber} - ` : '';
            const revision = doc.drawingRevision ? ` (${doc.drawingRevision})` : '';
            return `${number}${doc.name}${revision}`;
        })
        .slice(0, 20);
    const suffix = docs.length > names.length ? `, +${docs.length - names.length} more` : '';
    return `${docs.length} document${docs.length === 1 ? '' : 's'}: ${names.join(', ')}${suffix}`;
}

function stakeholderLabel(stakeholder: {
    name: string;
    stakeholderGroup: string;
    disciplineOrTrade: string | null;
}): string {
    const discipline = stakeholder.disciplineOrTrade ? ` - ${stakeholder.disciplineOrTrade}` : '';
    return `${stakeholder.name} (${stakeholder.stakeholderGroup}${discipline})`;
}

function normaliseDrawingNumber(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCase(value: string): string {
    return value
        .trim()
        .split(/\s+/)
        .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

registerTool(definition);

export { definition as createTransmittalTool };
