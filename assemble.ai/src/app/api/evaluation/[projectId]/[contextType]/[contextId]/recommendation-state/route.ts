import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { evaluations } from '@/lib/db/pg-schema';
import {
    applyRecommendationEvent,
    hasUnresolvedHighMaterialityClarification,
} from '@/lib/evaluation/recommendation-state';
import { clarifications } from '@/lib/db';
import type { RecommendationEvent, RecommendationState } from '@/types/evaluation';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { projectId, contextId } = await params;
        const body = await request.json();
        const event = body.event as RecommendationEvent | undefined;

        if (!event) {
            return NextResponse.json({ error: 'event is required' }, { status: 400 });
        }

        const evaluation = await db.query.evaluations.findFirst({
            where: and(
                eq(evaluations.projectId, projectId),
                eq(evaluations.stakeholderId, contextId)
            ),
        });

        if (!evaluation) {
            return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
        }

        const currentClarifications = await db
            .select({
                materiality: clarifications.materiality,
                status: clarifications.status,
            })
            .from(clarifications)
            .where(eq(clarifications.evaluationId, evaluation.id));

        const nextState = applyRecommendationEvent(
            (evaluation.recommendationState ?? 'draft') as RecommendationState,
            event,
            {
                hasUnresolvedHighMaterialityClarification: hasUnresolvedHighMaterialityClarification(
                    currentClarifications as Array<{ materiality: 'low' | 'medium' | 'high'; status: 'draft' | 'issued' | 'responded' | 'closed' }>
                ),
            }
        );

        await db.update(evaluations)
            .set({ recommendationState: nextState, updatedAt: new Date() })
            .where(eq(evaluations.id, evaluation.id));

        return NextResponse.json({
            success: true,
            data: {
                previousState: evaluation.recommendationState,
                recommendationState: nextState,
            },
        });
    } catch (error) {
        console.error('[recommendation-state] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update recommendation state' },
            { status: 500 }
        );
    }
}
