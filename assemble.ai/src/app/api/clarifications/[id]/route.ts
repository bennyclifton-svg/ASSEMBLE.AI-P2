import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { clarifications, evaluations } from '@/lib/db/pg-schema';
import { deriveRecommendationStateFromClarifications } from '@/lib/evaluation/recommendation-state';
import type {
    ClarificationMateriality,
    ClarificationStatus,
    RecommendationState,
} from '@/types/evaluation';

interface RouteParams {
    params: Promise<{ id: string }>;
}

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

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const existing = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        if (!existing) {
            return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
        }

        return NextResponse.json(serialiseClarification(existing));
    } catch (error) {
        console.error('[clarifications] GET one error:', error);
        return NextResponse.json({ error: 'Failed to load clarification' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const existing = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        if (!existing) {
            return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
        }

        const updateData: Partial<typeof clarifications.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (body.questionText !== undefined) updateData.questionText = body.questionText;
        if (body.category !== undefined) updateData.category = body.category || null;
        if (body.materiality !== undefined) updateData.materiality = body.materiality;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.responseText !== undefined) updateData.responseText = body.responseText || null;
        if (body.responseDocumentId !== undefined) updateData.responseDocumentId = body.responseDocumentId || null;
        if (body.responseFileAssetId !== undefined) updateData.responseFileAssetId = body.responseFileAssetId || null;
        if (body.linkedRowIds !== undefined) {
            updateData.linkedRowIds = JSON.stringify(Array.isArray(body.linkedRowIds) ? body.linkedRowIds : []);
        }
        if (body.linkedAddendumId !== undefined) updateData.linkedAddendumId = body.linkedAddendumId || null;

        await db.update(clarifications)
            .set(updateData)
            .where(eq(clarifications.id, id));

        await syncRecommendationState(existing.evaluationId);

        const updated = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        return NextResponse.json(serialiseClarification(updated!));
    } catch (error) {
        console.error('[clarifications] PATCH error:', error);
        return NextResponse.json({ error: 'Failed to update clarification' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const existing = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        if (!existing) {
            return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
        }

        await db.delete(clarifications).where(eq(clarifications.id, id));
        await syncRecommendationState(existing.evaluationId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[clarifications] DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete clarification' }, { status: 500 });
    }
}
