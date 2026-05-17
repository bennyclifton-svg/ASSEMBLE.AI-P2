import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { clarifications, evaluations } from '@/lib/db/pg-schema';
import {
    deriveRecommendationStateFromClarifications,
} from '@/lib/evaluation/recommendation-state';
import type {
    ClarificationMateriality,
    ClarificationStatus,
    RecommendationState,
} from '@/types/evaluation';

function parseLinkedRowIds(value: string | null): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
        return [];
    }
}

function serialiseClarification(row: typeof clarifications.$inferSelect) {
    return {
        ...row,
        firmType: row.firmType as 'consultant' | 'contractor',
        materiality: row.materiality as ClarificationMateriality,
        status: row.status as ClarificationStatus,
        linkedRowIds: parseLinkedRowIds(row.linkedRowIds),
    };
}

async function findOrCreateEvaluation(projectId: string, stakeholderId: string) {
    const existing = await db.query.evaluations.findFirst({
        where: and(
            eq(evaluations.projectId, projectId),
            eq(evaluations.stakeholderId, stakeholderId)
        ),
    });

    if (existing) return existing;

    const id = nanoid();
    await db.insert(evaluations).values({
        id,
        projectId,
        stakeholderId,
    });

    return db.query.evaluations.findFirst({
        where: eq(evaluations.id, id),
    });
}

async function syncRecommendationState(evaluationId: string) {
    const evaluation = await db.query.evaluations.findFirst({
        where: eq(evaluations.id, evaluationId),
    });
    if (!evaluation) return;

    const rows = await db
        .select({
            materiality: clarifications.materiality,
            status: clarifications.status,
        })
        .from(clarifications)
        .where(eq(clarifications.evaluationId, evaluationId));

    const nextState = deriveRecommendationStateFromClarifications(
        (evaluation.recommendationState ?? 'draft') as RecommendationState,
        rows as Array<{ materiality: ClarificationMateriality; status: ClarificationStatus }>
    );

    if (nextState !== evaluation.recommendationState) {
        await db.update(evaluations)
            .set({ recommendationState: nextState, updatedAt: new Date() })
            .where(eq(evaluations.id, evaluationId));
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const evaluationId = searchParams.get('evaluationId');
        const projectId = searchParams.get('projectId');
        const stakeholderId = searchParams.get('stakeholderId');
        const hasEvaluationPriceFilter = searchParams.has('evaluationPriceId');
        const evaluationPriceId = searchParams.get('evaluationPriceId');

        let resolvedEvaluationId = evaluationId;
        if (!resolvedEvaluationId && projectId && stakeholderId) {
            const evaluation = await db.query.evaluations.findFirst({
                where: and(
                    eq(evaluations.projectId, projectId),
                    eq(evaluations.stakeholderId, stakeholderId)
                ),
            });
            resolvedEvaluationId = evaluation?.id ?? null;
        }

        if (!resolvedEvaluationId) {
            return NextResponse.json([]);
        }

        const rows = await db.query.clarifications.findMany({
            where: hasEvaluationPriceFilter
                ? evaluationPriceId
                    ? and(
                    eq(clarifications.evaluationId, resolvedEvaluationId),
                    eq(clarifications.evaluationPriceId, evaluationPriceId)
                    )
                    : and(
                    eq(clarifications.evaluationId, resolvedEvaluationId),
                    isNull(clarifications.evaluationPriceId)
                    )
                : eq(clarifications.evaluationId, resolvedEvaluationId),
            orderBy: (table, { desc }) => [desc(table.createdAt)],
        });

        return NextResponse.json(rows.map(serialiseClarification));
    } catch (error) {
        console.error('[clarifications] GET error:', error);
        return NextResponse.json({ error: 'Failed to load clarifications' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            projectId,
            stakeholderId,
            evaluationId,
            evaluationPriceId,
            firmId,
            firmType,
            questionText,
            category,
            materiality = 'medium',
            status = 'draft',
            linkedRowIds = [],
        } = body;

        if (!firmId || !firmType || !questionText) {
            return NextResponse.json(
                { error: 'firmId, firmType and questionText are required' },
                { status: 400 }
            );
        }

        let evaluation = evaluationId
            ? await db.query.evaluations.findFirst({ where: eq(evaluations.id, evaluationId) })
            : null;

        if (!evaluation) {
            if (!projectId || !stakeholderId) {
                return NextResponse.json(
                    { error: 'projectId and stakeholderId are required when evaluationId is omitted' },
                    { status: 400 }
                );
            }
            evaluation = await findOrCreateEvaluation(projectId, stakeholderId);
        }

        if (!evaluation) {
            return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
        }

        const id = nanoid();
        await db.insert(clarifications).values({
            id,
            evaluationId: evaluation.id,
            evaluationPriceId: evaluationPriceId || undefined,
            firmId,
            firmType,
            questionText,
            category: category || undefined,
            materiality,
            status,
            linkedRowIds: JSON.stringify(Array.isArray(linkedRowIds) ? linkedRowIds : []),
        });

        await syncRecommendationState(evaluation.id);

        const created = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        return NextResponse.json(serialiseClarification(created!), { status: 201 });
    } catch (error) {
        console.error('[clarifications] POST error:', error);
        return NextResponse.json({ error: 'Failed to create clarification' }, { status: 500 });
    }
}
