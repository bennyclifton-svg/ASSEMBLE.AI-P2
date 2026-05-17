/**
 * TRR (Tender Recommendation Report) API Route - Individual TRR
 * Feature 012 - TRR Report
 *
 * GET /api/trr/[id] - Get a specific TRR
 * PUT /api/trr/[id] - Update a TRR
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { evaluationPrice, evaluationRows, evaluations, trr, trrTransmittals } from '@/lib/db';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { storeArtefact } from '@/lib/evaluation/artefact-store';
import { buildIssueSnapshot, selectActiveTrrEvaluationPrice } from '@/lib/evaluation/trr-linkage';
import type { EvaluationCell, EvaluationFirm, EvaluationRow, EvaluationRowSource, EvaluationTableType } from '@/types/evaluation';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        const [existing] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        return NextResponse.json(existing);
    });
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;
        const body = await request.json();

        // Validate TRR exists
        const [existing2] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing2) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        const priorReportDate = existing2.reportDate;

        // Update only the fields that are provided
        const updateData: Record<string, unknown> = {
            updatedAt: sql`CURRENT_TIMESTAMP`,
        };

        if (body.executiveSummary !== undefined) {
            updateData.executiveSummary = body.executiveSummary;
        }
        if (body.clarifications !== undefined) {
            updateData.clarifications = body.clarifications;
        }
        if (body.recommendation !== undefined) {
            updateData.recommendation = body.recommendation;
        }
        if (body.reportDate !== undefined) {
            updateData.reportDate = body.reportDate;
        }
        if (body.evaluationPriceId !== undefined) {
            updateData.evaluationPriceId = body.evaluationPriceId;
        }

        await db
            .update(trr)
            .set(updateData)
            .where(eq(trr.id, id));

        // Fetch and return the updated TRR
        const [updated] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (
            updated?.reportDate &&
            body.reportDate !== undefined &&
            body.reportDate !== priorReportDate
        ) {
            const artefact = await createIssueSnapshotArtefact(updated);
            if (artefact?.id) {
                await db.update(trr)
                    .set({ issueSnapshotArtefactId: artefact.id, updatedAt: sql`CURRENT_TIMESTAMP` })
                    .where(eq(trr.id, id));
                updated.issueSnapshotArtefactId = artefact.id;
            }
        }

        return NextResponse.json(updated);
    });
}

async function createIssueSnapshotArtefact(trrRecord: typeof trr.$inferSelect) {
    if (!trrRecord.stakeholderId) return null;

    const evaluation = await db.query.evaluations.findFirst({
        where: and(
            eq(evaluations.projectId, trrRecord.projectId),
            eq(evaluations.stakeholderId, trrRecord.stakeholderId)
        ),
    });
    if (!evaluation) return null;

    const priceInstances = await db
        .select()
        .from(evaluationPrice)
        .where(and(
            eq(evaluationPrice.projectId, trrRecord.projectId),
            eq(evaluationPrice.stakeholderId, trrRecord.stakeholderId)
        ));

    const activePrice = selectActiveTrrEvaluationPrice({
        trrEvaluationPriceId: trrRecord.evaluationPriceId,
        priceInstances,
    });
    if (!activePrice) return null;

    const rows = await db.query.evaluationRows.findMany({
        where: activePrice.id
            ? and(
                eq(evaluationRows.evaluationId, evaluation.id),
                eq(evaluationRows.evaluationPriceId, activePrice.id)
            )
            : and(
                eq(evaluationRows.evaluationId, evaluation.id),
                isNull(evaluationRows.evaluationPriceId)
            ),
        with: { cells: true },
    });

    const typedRows: EvaluationRow[] = rows.map((row) => ({
        ...row,
        evaluationId: row.evaluationId ?? evaluation.id,
        evaluationPriceId: row.evaluationPriceId,
        tableType: row.tableType as EvaluationTableType,
        source: row.source as EvaluationRowSource,
        vmAdoptionStatus: row.vmAdoptionStatus as EvaluationRow['vmAdoptionStatus'],
        vmOrigin: row.vmOrigin as EvaluationRow['vmOrigin'],
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
    }));

    const firmIds = new Set<string>();
    for (const row of typedRows) {
        for (const cell of row.cells ?? []) {
            firmIds.add(cell.firmId);
        }
    }

    const firms: EvaluationFirm[] = [...firmIds].map((firmId) => ({
        id: firmId,
        companyName: firmId,
        shortlisted: true,
    }));

    const payload = buildIssueSnapshot({
        trr: trrRecord,
        evaluation,
        activePriceInstance: activePrice,
        recommendationState: (evaluation.recommendationState ?? 'draft') as 'draft' | 'conditional' | 'final',
        rows: typedRows,
        firms,
    });

    return storeArtefact({
        kind: 'issue_snapshot',
        content: payload,
        relations: {
            evaluationId: evaluation.id,
            evaluationPriceId: activePrice.id,
            trrId: trrRecord.id,
        },
        metadata: {
            reportDate: trrRecord.reportDate,
            recommendationState: payload.recommendationState,
        },
    });
}

/**
 * DELETE /api/trr/[id] - Delete TRR (cascades to transmittals)
 */
export async function DELETE(
    request: NextRequest,
    context: RouteContext
) {
    return handleApiError(async () => {
        const { id } = await context.params;

        const [existing] = await db
            .select()
            .from(trr)
            .where(eq(trr.id, id))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'TRR not found' }, { status: 404 });
        }

        // Delete transmittal links first (cascade should handle this, but be explicit)
        await db
            .delete(trrTransmittals)
            .where(eq(trrTransmittals.trrId, id));

        // Delete the TRR
        await db.delete(trr).where(eq(trr.id, id));

        return NextResponse.json({ success: true, id });
    });
}
