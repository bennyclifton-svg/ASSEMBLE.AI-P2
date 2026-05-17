import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    actionInvocations,
    evaluationCells,
    evaluationRows,
    evaluations,
    projects,
    tenderSubmissionPackages,
    tenderSubmissions,
} from '@/lib/db/pg-schema';
import {
    runRefreshEvaluationPipeline,
    type AiEvaluationRowProposal,
    type RefreshEvaluationInput,
    type RefreshEvaluationPackage,
    type RefreshEvaluationState,
    type RefreshEvaluationAudit,
} from '@/lib/evaluation/refresh-pipeline';
import { loadArtefact } from '@/lib/evaluation/artefact-store';
import type {
    EvaluationCell,
    EvaluationRow,
    EvaluationRowSource,
    EvaluationTableType,
    VmAdoptionStatus,
    VmOrigin,
} from '@/types/evaluation';
import type { ProposedEvaluationRowMutation } from '@/lib/evaluation/tender-commercial';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

interface ParsedTenderItem {
    description?: string;
    amountCents?: number;
    confidence?: number;
    matchedRowId?: string;
    tableType?: EvaluationTableType;
    category?: string;
    vmAdoptionStatus?: VmAdoptionStatus;
    vmEmbeddedInBase?: boolean;
    vmOrigin?: VmOrigin;
}

function toEvaluationRow(row: typeof evaluationRows.$inferSelect & { cells?: Array<typeof evaluationCells.$inferSelect> }): EvaluationRow {
    return {
        ...row,
        evaluationId: row.evaluationId ?? '',
        evaluationPriceId: row.evaluationPriceId ?? null,
        tableType: row.tableType as EvaluationTableType,
        source: row.source as EvaluationRowSource | undefined,
        vmAdoptionStatus: row.vmAdoptionStatus as VmAdoptionStatus | null,
        vmOrigin: row.vmOrigin as VmOrigin | null,
        createdAt: row.createdAt?.toISOString(),
        cells: (row.cells ?? []).map((cell): EvaluationCell => ({
            ...cell,
            firmType: cell.firmType as 'consultant' | 'contractor',
            amountCents: cell.amountCents ?? 0,
            valueType: cell.valueType as EvaluationCell['valueType'],
            source: cell.source as EvaluationCell['source'],
            createdAt: cell.createdAt?.toISOString(),
            updatedAt: cell.updatedAt?.toISOString(),
        })),
    };
}

async function extractItems(raw: string | null): Promise<ParsedTenderItem[]> {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed.included)) return parsed.included;
        if (typeof parsed.artefactId === 'string') {
            const artefact = await loadArtefact(parsed.artefactId);
            const content = artefact?.content;
            if (Array.isArray(content)) return content as ParsedTenderItem[];
            if (
                content &&
                typeof content === 'object' &&
                Array.isArray((content as { included?: unknown[] }).included)
            ) {
                return (content as { included: ParsedTenderItem[] }).included;
            }
        }
        return [];
    } catch {
        return [];
    }
}

function buildPromptHash(packages: RefreshEvaluationPackage[]): string {
    const source = packages
        .flatMap((pkg) => pkg.files.map((file) => file.hash ?? file.fileAssetId ?? file.id))
        .sort()
        .join('|');
    return crypto.createHash('sha256').update(source || 'empty-refresh').digest('hex');
}

async function loadState(input: RefreshEvaluationInput): Promise<RefreshEvaluationState> {
    const evaluation = await db.query.evaluations.findFirst({
        where: eq(evaluations.id, input.evaluationId),
    });

    if (!evaluation) {
        throw new Error('Evaluation not found');
    }

    const rows = await db.query.evaluationRows.findMany({
        where: input.evaluationPriceId
            ? and(
                eq(evaluationRows.evaluationId, input.evaluationId),
                eq(evaluationRows.evaluationPriceId, input.evaluationPriceId)
            )
            : and(
                eq(evaluationRows.evaluationId, input.evaluationId),
                isNull(evaluationRows.evaluationPriceId)
            ),
        with: { cells: true },
    });

    const packages = await db.query.tenderSubmissionPackages.findMany({
        where: input.evaluationPriceId
            ? and(
                eq(tenderSubmissionPackages.evaluationId, input.evaluationId),
                eq(tenderSubmissionPackages.evaluationPriceId, input.evaluationPriceId),
                eq(tenderSubmissionPackages.status, 'active')
            )
            : and(
                eq(tenderSubmissionPackages.evaluationId, input.evaluationId),
                isNull(tenderSubmissionPackages.evaluationPriceId),
                eq(tenderSubmissionPackages.status, 'active')
            ),
        with: { submissions: true },
    });

    return {
        recommendationState: (evaluation.recommendationState ?? 'draft') as RefreshEvaluationState['recommendationState'],
        rows: rows.map(toEvaluationRow),
        packages: packages.map((pkg) => ({
            id: pkg.id,
            firmId: pkg.firmId,
            firmType: pkg.firmType as 'consultant' | 'contractor',
            files: (pkg.submissions ?? []).map((submission) => ({
                id: submission.id,
                packageId: pkg.id,
                firmId: pkg.firmId,
                firmType: pkg.firmType as 'consultant' | 'contractor',
                fileAssetId: submission.fileAssetId,
                documentId: submission.documentId,
                versionId: submission.versionId,
            })),
        })),
    };
}

async function generateRowProposals(input: RefreshEvaluationInput): Promise<AiEvaluationRowProposal[]> {
    const submissions = await db.query.tenderSubmissions.findMany({
        where: input.evaluationPriceId
            ? and(
                eq(tenderSubmissions.evaluationId, input.evaluationId),
                eq(tenderSubmissions.evaluationPriceId, input.evaluationPriceId)
            )
            : and(
                eq(tenderSubmissions.evaluationId, input.evaluationId),
                isNull(tenderSubmissions.evaluationPriceId)
            ),
    });

    const proposals: AiEvaluationRowProposal[] = [];

    for (const submission of submissions) {
        const items = await extractItems(submission.rawExtractedItems);

        for (const item of items) {
            if (!item.description || !Number.isFinite(item.amountCents)) continue;
            if (!submission.documentId && !submission.fileAssetId) continue;

            const tableType = item.tableType ?? 'initial_price';

            // Existing parser-mapped base rows are user/cost-plan rows. The refresh
            // pipeline only owns AI-created rows, so it leaves those mapped rows alone.
            if (item.matchedRowId && tableType === 'initial_price') continue;

            proposals.push({
                tableType,
                description: item.description,
                firmId: submission.firmId,
                firmType: submission.firmType as 'consultant' | 'contractor',
                amountCents: item.amountCents,
                valueType: 'amount',
                confidence: Math.round((item.confidence ?? 0) * 100),
                category: item.category ?? null,
                packageId: submission.packageId,
                sourceSubmissionId: submission.id,
                sourceDocumentId: submission.documentId,
                sourceFileAssetId: submission.fileAssetId,
                sourceFileAssetIds: submission.fileAssetId ? [submission.fileAssetId] : [],
                vmAdoptionStatus: item.vmAdoptionStatus,
                vmEmbeddedInBase: item.vmEmbeddedInBase,
                vmOrigin: item.vmOrigin,
            });
        }
    }

    return proposals;
}

async function applyMutations(input: RefreshEvaluationInput, mutations: ProposedEvaluationRowMutation[]): Promise<void> {
    for (const mutation of mutations) {
        if (mutation.kind === 'delete') {
            await db.delete(evaluationRows).where(eq(evaluationRows.id, mutation.rowId));
            continue;
        }

        const row = mutation.kind === 'create'
            ? mutation.row
            : ({ id: mutation.rowId, ...mutation.patch } as Partial<EvaluationRow> & { id: string });

        const cells = row.cells ?? [];
        const rowValues = {
            evaluationId: input.evaluationId,
            evaluationPriceId: input.evaluationPriceId || undefined,
            tableType: row.tableType,
            description: row.description,
            orderIndex: row.orderIndex,
            source: row.source,
            sourceSubmissionId: row.sourceSubmissionId ?? undefined,
            aiStableKey: row.aiStableKey ?? undefined,
            category: row.category ?? undefined,
            sourceDocumentId: row.sourceDocumentId ?? undefined,
            sourceFileAssetId: row.sourceFileAssetId ?? undefined,
            vmAdoptionStatus: row.vmAdoptionStatus ?? undefined,
            vmEmbeddedInBase: row.vmEmbeddedInBase ?? undefined,
            vmOrigin: row.vmOrigin ?? undefined,
        };

        if (mutation.kind === 'create') {
            await db.insert(evaluationRows).values({
                id: mutation.row.id,
                ...rowValues,
            });
        } else {
            await db.update(evaluationRows)
                .set({
                    tableType: rowValues.tableType,
                    description: rowValues.description,
                    source: rowValues.source,
                    sourceSubmissionId: rowValues.sourceSubmissionId,
                    aiStableKey: rowValues.aiStableKey,
                    category: rowValues.category,
                    sourceDocumentId: rowValues.sourceDocumentId,
                    sourceFileAssetId: rowValues.sourceFileAssetId,
                    vmAdoptionStatus: rowValues.vmAdoptionStatus,
                    vmEmbeddedInBase: rowValues.vmEmbeddedInBase,
                    vmOrigin: rowValues.vmOrigin,
                })
                .where(eq(evaluationRows.id, mutation.rowId));
        }

        for (const cell of cells) {
            const existing = await db.query.evaluationCells.findFirst({
                where: and(
                    eq(evaluationCells.rowId, row.id),
                    eq(evaluationCells.firmId, cell.firmId)
                ),
            });

            if (existing) {
                await db.update(evaluationCells)
                    .set({
                        firmType: cell.firmType,
                        amountCents: cell.amountCents,
                        valueType: cell.valueType ?? 'amount',
                        source: 'ai',
                        confidence: cell.confidence ?? undefined,
                        updatedAt: new Date(),
                    })
                    .where(eq(evaluationCells.id, existing.id));
            } else {
                await db.insert(evaluationCells).values({
                    id: cell.id,
                    rowId: row.id,
                    firmId: cell.firmId,
                    firmType: cell.firmType,
                    amountCents: cell.amountCents,
                    valueType: cell.valueType ?? 'amount',
                    source: 'ai',
                    confidence: cell.confidence ?? undefined,
                });
            }
        }
    }
}

async function recordAction(input: RefreshEvaluationInput, audit: RefreshEvaluationAudit): Promise<string | null> {
    const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

    if (!project?.organizationId) return null;

    const [record] = await db.insert(actionInvocations).values({
        actionId: audit.actionId,
        actorKind: 'ai',
        actorId: 'refresh-evaluation',
        organizationId: project.organizationId,
        projectId: input.projectId,
        input: {
            evaluationId: input.evaluationId,
            evaluationPriceId: input.evaluationPriceId ?? null,
            modelId: audit.modelId,
            promptHash: audit.promptHash,
            inputArtefactHashes: audit.inputArtefactHashes,
        },
        output: {
            artefactIds: audit.artefactIds,
            before: audit.before,
            after: audit.after,
            diffs: audit.diffs,
            validationErrors: audit.validationErrors,
        },
        status: audit.validationErrors.length > 0 ? 'error' : 'applied',
        finishedAt: new Date(),
    }).returning({ id: actionInvocations.id });

    return record.id;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, contextId } = await params;
        const body = await request.json().catch(() => ({}));
        const evaluationPriceId = (body.evaluationPriceId as string | undefined) ?? null;

        const evaluation = await db.query.evaluations.findFirst({
            where: and(
                eq(evaluations.projectId, projectId),
                eq(evaluations.stakeholderId, contextId)
            ),
        });

        if (!evaluation) {
            return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
        }

        const input: RefreshEvaluationInput = {
            projectId,
            stakeholderId: contextId,
            evaluationId: evaluation.id,
            evaluationPriceId,
            modelId: body.modelId ?? 'tender-refresh-v1',
            promptHash: body.promptHash ?? null,
        };

        const initialState = await loadState(input);
        input.promptHash = input.promptHash ?? buildPromptHash(initialState.packages);

        const result = await runRefreshEvaluationPipeline(input, {
            loadState: async () => initialState,
            generateRowProposals,
            applyMutations,
            updateRecommendationState: async (_input, state) => {
                await db.update(evaluations)
                    .set({ recommendationState: state, updatedAt: new Date() })
                    .where(eq(evaluations.id, evaluation.id));
            },
            recordAction,
        });

        return NextResponse.json({
            success: result.ok,
            data: result,
            error: result.ok ? undefined : 'Refresh proposals failed validation',
        }, { status: result.ok ? 200 : 422 });
    } catch (error) {
        console.error('[evaluation-refresh] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to refresh evaluation' },
            { status: 500 }
        );
    }
}
