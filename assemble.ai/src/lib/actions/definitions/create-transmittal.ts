import { z } from 'zod';
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
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyCreateTransmittal } from '@/lib/agents/applicators';
import { defineAction } from '../define';
import type { ActionContext } from '../types';

const DEFAULT_LIMIT = 200;
const HARD_LIMIT = 500;
const DESTINATIONS = ['note', 'project'] as const;

interface ResolvedDocument {
    id: string;
    name: string;
    drawingNumber: string | null;
    drawingRevision: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}

const optionalTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
).optional();
const dedupedStringArray = z.preprocess(
    (value) =>
        Array.isArray(value)
            ? Array.from(new Set(value.map((item) => (typeof item === 'string' ? item.trim() : item))))
            : value,
    z.array(z.string().min(1))
);
const clampedLimit = z.preprocess(
    (value) => (typeof value === 'number' ? Math.max(1, Math.min(HARD_LIMIT, value)) : value),
    z.number().int().min(1).max(HARD_LIMIT)
);

const inputSchema = z
    .object({
        name: optionalTrimmedString,
        documentIds: dedupedStringArray.optional(),
        categoryId: optionalTrimmedString,
        subcategoryId: optionalTrimmedString,
        categoryName: optionalTrimmedString,
        subcategoryName: optionalTrimmedString,
        disciplineOrTrade: optionalTrimmedString,
        drawingNumber: optionalTrimmedString,
        documentName: optionalTrimmedString,
        stakeholderId: optionalTrimmedString,
        destination: z.enum(DESTINATIONS).optional(),
        allProjectDocuments: z.boolean().optional(),
        limit: clampedLimit.optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        const hasDocumentSource =
            (input.documentIds?.length ?? 0) > 0 ||
            Boolean(input.categoryId) ||
            Boolean(input.subcategoryId) ||
            Boolean(input.categoryName) ||
            Boolean(input.subcategoryName) ||
            Boolean(input.disciplineOrTrade) ||
            Boolean(input.drawingNumber) ||
            Boolean(input.documentName) ||
            input.allProjectDocuments === true;
        if (!hasDocumentSource) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide documentIds, a document filter, or allProjectDocuments=true',
                path: ['documentIds'],
            });
        }
    });

type CreateTransmittalInput = z.infer<typeof inputSchema>;

async function resolveStakeholder(ctx: ActionContext, stakeholderId: string) {
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

    if (!row) throw new Error('create_transmittal: stakeholderId was not found in this project');
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
        throw new Error(`create_transmittal: document(s) not found in this project: ${missing.join(', ')}`);
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
    if (input.documentName) {
        const pattern = `%${input.documentName}%`;
        conditions.push(
            sql`(
                ${fileAssets.drawingName} ILIKE ${pattern}
                OR ${fileAssets.originalName} ILIKE ${pattern}
            )`
        );
    }

    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await baseDocumentQuery()
        .where(and(...conditions))
        .orderBy(desc(documents.updatedAt))
        .limit(limit + 1);

    if (rows.length > limit) {
        throw new Error(
            `create_transmittal: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
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

function commonDocumentLabel(
    docs: ResolvedDocument[],
    field: 'categoryName' | 'subcategoryName'
): string | null {
    const labels = docs
        .map((doc) => doc[field]?.trim())
        .filter((label): label is string => Boolean(label));
    const uniqueLabels = Array.from(
        new Map(labels.map((label) => [label.toLowerCase(), label])).values()
    );
    return uniqueLabels.length === 1 ? uniqueLabels[0] : null;
}

function defaultTransmittalName(input: CreateTransmittalInput, docs: ResolvedDocument[]): string {
    const source =
        input.documentName ??
        input.drawingNumber ??
        input.disciplineOrTrade ??
        input.subcategoryName ??
        input.categoryName;
    if (source) return `${titleCase(source)} Drawings Transmittal`;

    const commonSubcategory = commonDocumentLabel(docs, 'subcategoryName');
    if (commonSubcategory) return `${titleCase(commonSubcategory)} Documents`;

    const commonCategory = commonDocumentLabel(docs, 'categoryName');
    if (commonCategory) return `${titleCase(commonCategory)} Documents`;

    return 'Project Document Transmittal';
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

async function resolveTransmittalProposal(ctx: ActionContext, input: CreateTransmittalInput) {
    const stakeholder = input.stakeholderId ? await resolveStakeholder(ctx, input.stakeholderId) : null;
    const docs = input.documentIds?.length
        ? await resolveExplicitDocuments(ctx.projectId, input.documentIds)
        : await resolveFilteredDocuments(ctx.projectId, input);

    if (docs.length === 0) {
        throw new Error('create_transmittal: no matching project documents were found');
    }

    const name = input.name ?? defaultTransmittalName(input, docs);
    const destination = input.destination ?? (input.stakeholderId || input.subcategoryId ? 'project' : 'note');
    const proposedInput: CreateTransmittalInput = {
        name,
        destination,
        ...(input.stakeholderId ? { stakeholderId: input.stakeholderId } : {}),
        ...(input.subcategoryId ? { subcategoryId: input.subcategoryId } : {}),
        documentIds: docs.map((doc) => doc.id),
        ...(input._toolUseId ? { _toolUseId: input._toolUseId } : {}),
    };

    const proposedDiff: ProposedDiff = {
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

    return { proposedInput, proposedDiff };
}

export const createTransmittalAction = defineAction<CreateTransmittalInput, Record<string, unknown>>({
    id: 'correspondence.transmittal.create',
    toolName: 'create_transmittal',
    domain: 'correspondence',
    description:
        'Create a transmittal from existing project documents. When the latest request says "the selection" or "selected documents", use the current selected documentIds from the app view exactly and omit older chat filters.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design', 'orchestrator'],
    uiTarget: { tab: 'notes', focusEntity: 'transmittal' },
    async prepareProposal(ctx, input) {
        const { proposedDiff, proposedInput } = await resolveTransmittalProposal(ctx, input);
        return {
            proposedDiff,
            input: proposedInput,
        };
    },
    applyResult(ctx, input) {
        return applyCreateTransmittal(input, ctx);
    },
});
