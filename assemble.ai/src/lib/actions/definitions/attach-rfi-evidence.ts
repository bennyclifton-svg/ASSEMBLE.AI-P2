import { z } from 'zod';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { db } from '@/lib/db';
import {
    categories,
    consultantDisciplines,
    contractorTrades,
    documents,
    fileAssets,
    subcategories,
    versions,
} from '@/lib/db/pg-schema';
import { documentTitleSearchCondition } from '@/lib/agents/tools/document-search';
import { drizzleRfiRepository, rfiService } from '@/lib/rfi/service';
import {
    RFI_EVIDENCE_TARGET_TYPES,
    type RfiEvidenceTargetType,
    type RfiRecord,
} from '@/types/rfi';
import { defineAction } from '../define';
import type { ActionContext } from '../types';

const DEFAULT_LIMIT = 50;
const HARD_LIMIT = 200;

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

const evidenceSchema = z.object({
    targetType: z.enum(RFI_EVIDENCE_TARGET_TYPES),
    targetId: z.string().trim().min(1),
    citation: z.string().trim().min(1).optional(),
});

const inputSchema = z
    .object({
        rfiId: optionalTrimmedString,
        rfiReference: optionalTrimmedString,
        evidence: z.array(evidenceSchema).optional(),
        documentIds: dedupedStringArray.optional(),
        categoryId: optionalTrimmedString,
        subcategoryId: optionalTrimmedString,
        categoryName: optionalTrimmedString,
        subcategoryName: optionalTrimmedString,
        disciplineOrTrade: optionalTrimmedString,
        drawingNumber: optionalTrimmedString,
        documentName: optionalTrimmedString,
        allProjectDocuments: z.boolean().optional(),
        limit: clampedLimit.optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!input.rfiId && !input.rfiReference) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide rfiId or rfiReference',
                path: ['rfiId'],
            });
        }

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
        if (!hasDocumentSource && (input.evidence?.length ?? 0) === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'provide evidence, documentIds, a document filter, or allProjectDocuments=true',
                path: ['evidence'],
            });
        }
    });

type AttachRfiEvidenceInput = z.infer<typeof inputSchema>;
type EvidenceInput = z.infer<typeof evidenceSchema>;

interface ResolvedDocument {
    id: string;
    name: string;
    drawingNumber: string | null;
    drawingRevision: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
}

interface ResolvedEvidence {
    targetType: RfiEvidenceTargetType;
    targetId: string;
    label: string;
    citation?: string;
}

function normalizedRfiReference(value: string): string {
    const digits = value.match(/\d+/)?.[0];
    if (digits) return String(Number(digits));
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function resolveRfi(ctx: ActionContext, input: AttachRfiEvidenceInput): Promise<RfiRecord> {
    if (input.rfiId) {
        return rfiService.get({
            id: input.rfiId,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
        });
    }

    const wanted = normalizedRfiReference(input.rfiReference ?? '');
    const result = await rfiService.list({
        projectId: ctx.projectId,
        organizationId: ctx.organizationId,
        filter: 'all',
    });
    const match = result.rfis.find((rfi) =>
        normalizedRfiReference(rfi.reference) === wanted ||
        normalizedRfiReference(String(rfi.rfiNumber)) === wanted
    );
    if (!match) {
        throw new Error(`attach_rfi_evidence: RFI "${input.rfiReference}" was not found in this project`);
    }
    return match;
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
        throw new Error(`attach_rfi_evidence: document(s) not found in this project: ${missing.join(', ')}`);
    }
    return ids.map((id) => byId.get(id)!).filter(Boolean);
}

async function resolveFilteredDocuments(
    projectId: string,
    input: AttachRfiEvidenceInput
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
            `attach_rfi_evidence: more than ${limit} documents matched. Narrow the filter or provide explicit documentIds.`
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

async function resolveEvidence(ctx: ActionContext, input: AttachRfiEvidenceInput): Promise<ResolvedEvidence[]> {
    const documentsFromFilter =
        !input.documentIds?.length &&
        (input.categoryId ||
            input.subcategoryId ||
            input.categoryName ||
            input.subcategoryName ||
            input.disciplineOrTrade ||
            input.drawingNumber ||
            input.documentName ||
            input.allProjectDocuments === true)
            ? await resolveFilteredDocuments(ctx.projectId, input)
            : [];
    const documentsFromIds = input.documentIds?.length
        ? await resolveExplicitDocuments(ctx.projectId, input.documentIds)
        : [];

    const evidence: EvidenceInput[] = [
        ...(input.evidence ?? []),
        ...documentsFromIds.map((doc) => ({ targetType: 'document' as const, targetId: doc.id })),
        ...documentsFromFilter.map((doc) => ({ targetType: 'document' as const, targetId: doc.id })),
    ];

    const seen = new Set<string>();
    const resolved: ResolvedEvidence[] = [];
    for (const item of evidence) {
        const key = `${item.targetType}:${item.targetId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const target = await drizzleRfiRepository.findEvidenceTarget(
            ctx.projectId,
            ctx.organizationId,
            item.targetType,
            item.targetId
        );
        if (!target) {
            throw new Error(`attach_rfi_evidence: evidence target not found: ${item.targetType}:${item.targetId}`);
        }
        resolved.push({
            targetType: item.targetType,
            targetId: item.targetId,
            label: target.label,
            ...(item.citation ? { citation: item.citation } : {}),
        });
    }

    return resolved;
}

function newEvidenceOnly(rfi: RfiRecord, evidence: ResolvedEvidence[]): ResolvedEvidence[] {
    const existing = new Set(rfi.evidenceLinks.map((link) => `${link.targetType}:${link.targetId}`));
    return evidence.filter((item) => !existing.has(`${item.targetType}:${item.targetId}`));
}

function formatEvidence(evidence: ResolvedEvidence[]): string {
    if (evidence.length === 0) return 'None';
    return evidence
        .map((item) => {
            const ref = `${item.label} (${item.targetType})`;
            return item.citation ? `${ref} - ${item.citation}` : ref;
        })
        .join('\n');
}

function normaliseDrawingNumber(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const attachRfiEvidenceAction = defineAction<AttachRfiEvidenceInput, Record<string, unknown>>({
    id: 'correspondence.rfi.attach_evidence',
    toolName: 'attach_rfi_evidence',
    domain: 'correspondence',
    description:
        'Propose attaching existing project documents, notes, or correspondence as evidence links on an existing typed RFI. Use this when likely source documents have been found for an RFI.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design'],
    emits: [{ entity: 'rfi', op: 'updated' }],
    uiTarget: { tab: 'planning', sub: 'rfis', focusEntity: 'rfi' },
    async prepareProposal(ctx, input) {
        const rfi = await resolveRfi(ctx, input);
        const evidence = newEvidenceOnly(rfi, await resolveEvidence(ctx, input));
        if (evidence.length === 0) {
            throw new Error(`attach_rfi_evidence: all matching evidence is already linked to ${rfi.reference}`);
        }

        const proposedDiff: ProposedDiff = {
            entity: 'rfi',
            entityId: rfi.id,
            summary: `Attach evidence - ${rfi.reference}`,
            changes: [
                { field: 'reference', label: 'RFI', before: rfi.reference, after: rfi.reference },
                {
                    field: 'evidence',
                    label: 'Evidence references',
                    before: rfi.evidenceLinks.length ? rfi.evidenceLinks.map((link) => link.label).join('\n') : 'None',
                    after: formatEvidence(evidence),
                },
            ],
        };

        return {
            proposedDiff,
            expectedRowVersion: rfi.rowVersion,
            input: {
                rfiId: rfi.id,
                evidence: evidence.map((item) => ({
                    targetType: item.targetType,
                    targetId: item.targetId,
                    ...(item.citation ? { citation: item.citation } : {}),
                })),
                ...(input._toolUseId ? { _toolUseId: input._toolUseId } : {}),
            },
        };
    },
    async apply(ctx, input) {
        const rfi = await resolveRfi(ctx, input);
        const evidence = newEvidenceOnly(rfi, await resolveEvidence(ctx, input));
        let current = rfi;
        for (const item of evidence) {
            current = await rfiService.addEvidence({
                id: current.id,
                projectId: ctx.projectId,
                organizationId: ctx.organizationId,
                targetType: item.targetType,
                targetId: item.targetId,
            });
        }
        return current as unknown as Record<string, unknown>;
    },
});
