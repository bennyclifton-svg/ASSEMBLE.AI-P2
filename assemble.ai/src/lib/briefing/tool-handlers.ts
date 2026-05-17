import { and, eq, inArray, max } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    briefAttachments,
    documents,
    fileAssets,
    projectDetails,
    projectProfiles,
    versions,
} from '@/lib/db/pg-schema';
import {
    projectObjectives,
    VALID_OBJECTIVE_TYPES,
    type ObjectiveType,
} from '@/lib/db/objectives-schema';
import { retrieve } from '@/lib/rag/retrieval';
import { normalizeCoverage, updateCoverage } from './coverage-judge';
import { updateSessionCoverage } from './session-service';
import type { BriefingSessionRow, BriefingToolCallRecord, BriefingToolName } from './types';

interface BriefingToolContext {
    projectId: string;
    session: BriefingSessionRow;
}

type ToolResult = {
    ok: boolean;
    label?: string;
    data?: unknown;
    error?: string;
};

const PROFILE_DIRECT_FIELDS = new Set(['buildingClass', 'projectType', 'region']);
const PROFILE_JSON_FIELDS = new Set(['subclass', 'subclassOther', 'scaleData', 'complexity', 'workScope']);
const PROJECT_DETAILS_FIELDS = new Set([
    'projectName',
    'address',
    'legalAddress',
    'zoning',
    'jurisdiction',
    'lotArea',
    'numberOfStories',
    'buildingClass',
    'tenderReleaseDate',
]);

function asRecord(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error('Tool input must be an object');
    }
    return input as Record<string, unknown>;
}

function requiredString(input: Record<string, unknown>, key: string): string {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string`);
    }
    return value.trim();
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

function toStorageValue(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    return String(value);
}

function normalizeProfilePath(rawField: string): string[] {
    return rawField
        .replace(/^projectProfiles?\./, '')
        .replace(/^profile\./, '')
        .split('.')
        .map((part) => part.trim())
        .filter(Boolean);
}

async function updateProfileField(
    ctx: BriefingToolContext,
    input: Record<string, unknown>
): Promise<ToolResult> {
    const field = requiredString(input, 'field');
    const rationale = requiredString(input, 'rationale');
    const value = input.value;
    const path = normalizeProfilePath(field);
    const root = path[0];

    if (!root) throw new Error('field is required');

    if (field.startsWith('projectDetails.') || field.startsWith('details.') || PROJECT_DETAILS_FIELDS.has(root)) {
        const detailsField = field
            .replace(/^projectDetails\./, '')
            .replace(/^details\./, '')
            .split('.')[0]
            .trim();
        if (!PROJECT_DETAILS_FIELDS.has(detailsField)) {
            throw new Error(`Field "${field}" is not permitted`);
        }
        const detailsValue =
            detailsField === 'lotArea' || detailsField === 'numberOfStories'
                ? Number(value)
                : toStorageValue(value);
        if (
            (detailsField === 'lotArea' || detailsField === 'numberOfStories') &&
            !Number.isFinite(detailsValue as number)
        ) {
            throw new Error(`${detailsField} must be numeric`);
        }
        const [updated] = await db
            .update(projectDetails)
            .set({
                [detailsField]: detailsValue,
                updatedAt: new Date(),
            })
            .where(eq(projectDetails.projectId, ctx.projectId))
            .returning();
        if (!updated) throw new Error('Project details row not found');
        return {
            ok: true,
            label: `profile.${detailsField}`,
            data: { field: detailsField, value, rationale },
        };
    }

    const [profile] = await db
        .select()
        .from(projectProfiles)
        .where(eq(projectProfiles.projectId, ctx.projectId))
        .limit(1);
    if (!profile) throw new Error('Project profile row not found');

    if (PROFILE_DIRECT_FIELDS.has(root)) {
        await db
            .update(projectProfiles)
            .set({ [root]: toStorageValue(value), updatedAt: new Date() })
            .where(eq(projectProfiles.projectId, ctx.projectId));
        return { ok: true, label: `profile.${root}`, data: { field: root, value, rationale } };
    }

    if (!PROFILE_JSON_FIELDS.has(root)) {
        throw new Error(`Field "${field}" is not permitted`);
    }

    const current = parseJson<Record<string, unknown> | unknown[]>(
        profile[root as keyof typeof profile] as string | null,
        root === 'scaleData' || root === 'complexity' ? {} : []
    );
    let next: unknown = value;
    if (path.length > 1) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            next = { [path[1]]: value };
        } else {
            next = { ...(current as Record<string, unknown>), [path.slice(1).join('.')]: value };
        }
    }

    await db
        .update(projectProfiles)
        .set({ [root]: JSON.stringify(next), updatedAt: new Date() })
        .where(eq(projectProfiles.projectId, ctx.projectId));

    return {
        ok: true,
        label: `profile.${path.join('.')}`,
        data: { field: path.join('.'), value, rationale },
    };
}

async function upsertObjective(
    ctx: BriefingToolContext,
    input: Record<string, unknown>
): Promise<ToolResult> {
    const category = requiredString(input, 'category') as ObjectiveType;
    const text = requiredString(input, 'text');
    const rationale = requiredString(input, 'rationale');
    if (!VALID_OBJECTIVE_TYPES.includes(category)) {
        throw new Error(`category must be one of ${VALID_OBJECTIVE_TYPES.join(', ')}`);
    }

    const [orderRow] = await db
        .select({ maxOrder: max(projectObjectives.sortOrder) })
        .from(projectObjectives)
        .where(
            and(
                eq(projectObjectives.projectId, ctx.projectId),
                eq(projectObjectives.objectiveType, category),
                eq(projectObjectives.isDeleted, false)
            )
        );
    const sortOrder = orderRow?.maxOrder != null ? orderRow.maxOrder + 1 : 0;

    const [row] = await db
        .insert(projectObjectives)
        .values({
            projectId: ctx.projectId,
            objectiveType: category,
            text,
            source: 'briefing',
            status: 'draft',
            sortOrder,
        })
        .returning();

    return {
        ok: true,
        label: `objectives.${category} #${sortOrder + 1}`,
        data: { objective: row, rationale },
    };
}

async function markCategoryCovered(
    ctx: BriefingToolContext,
    input: Record<string, unknown>
): Promise<ToolResult> {
    const category = requiredString(input, 'category') as ObjectiveType;
    if (!VALID_OBJECTIVE_TYPES.includes(category)) {
        throw new Error(`category must be one of ${VALID_OBJECTIVE_TYPES.join(', ')}`);
    }
    const coverage = updateCoverage(ctx.session.coverage, category);
    const session = await updateSessionCoverage(ctx.session.id, coverage);
    ctx.session = session;
    return {
        ok: true,
        label: `coverage.${category}`,
        data: { coverage: normalizeCoverage(session.coverage), sessionStatus: session.status },
    };
}

async function searchBriefingDocuments(
    ctx: BriefingToolContext,
    input: Record<string, unknown>
): Promise<ToolResult> {
    const query = requiredString(input, 'query');
    const maxResultsRaw = input.maxResults;
    const maxResults =
        typeof maxResultsRaw === 'number' && Number.isInteger(maxResultsRaw)
            ? Math.max(1, Math.min(10, maxResultsRaw))
            : 5;

    const attached = await db
        .select({ documentId: briefAttachments.documentId })
        .from(briefAttachments)
        .where(eq(briefAttachments.projectId, ctx.projectId));
    const documentIds = attached.map((row) => row.documentId);
    if (documentIds.length === 0) {
        return { ok: true, data: { query, resultCount: 0, results: [] } };
    }

    const results = await retrieve(query, {
        documentIds,
        topK: maxResults,
        rerankTopK: maxResults,
        includeParentContext: true,
        minRelevanceScore: 0.15,
    });

    const names = new Map<string, string | null>();
    const resultDocumentIds = Array.from(new Set(results.map((r) => r.documentId)));
    if (resultDocumentIds.length > 0) {
        const metadata = await db
            .select({
                documentId: documents.id,
                originalName: fileAssets.originalName,
                drawingName: fileAssets.drawingName,
            })
            .from(documents)
            .leftJoin(versions, eq(documents.latestVersionId, versions.id))
            .leftJoin(fileAssets, eq(versions.fileAssetId, fileAssets.id))
            .where(inArray(documents.id, resultDocumentIds));
        for (const row of metadata) {
            names.set(row.documentId, row.drawingName ?? row.originalName ?? null);
        }
    }

    return {
        ok: true,
        data: {
            query,
            resultCount: results.length,
            results: results.map((result) => ({
                documentId: result.documentId,
                documentTitle: names.get(result.documentId) ?? 'Attached document',
                sectionTitle: result.sectionTitle,
                clauseNumber: result.clauseNumber,
                relevanceScore: Number(result.relevanceScore.toFixed(3)),
                excerpt: result.content.length > 700
                    ? `${result.content.slice(0, 700)}...`
                    : result.content,
            })),
        },
    };
}

export async function dispatchBriefingToolCall(args: {
    ctx: BriefingToolContext;
    name: string;
    input: unknown;
}): Promise<BriefingToolCallRecord> {
    const input = asRecord(args.input);
    try {
        let output: ToolResult;
        switch (args.name as BriefingToolName) {
            case 'updateProfileField':
                output = await updateProfileField(args.ctx, input);
                break;
            case 'upsertObjective':
                output = await upsertObjective(args.ctx, input);
                break;
            case 'markCategoryCovered':
                output = await markCategoryCovered(args.ctx, input);
                break;
            case 'searchBriefingDocuments':
                output = await searchBriefingDocuments(args.ctx, input);
                break;
            default:
                throw new Error(`Unknown briefing tool "${args.name}"`);
        }
        return { name: args.name, input, output };
    } catch (error) {
        return {
            name: args.name,
            input,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export function isWriteTool(name: string): boolean {
    return name === 'updateProfileField' || name === 'upsertObjective' || name === 'markCategoryCovered';
}
