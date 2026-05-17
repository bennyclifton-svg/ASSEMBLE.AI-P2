import { NextResponse } from 'next/server';
import { and, eq, max } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { addenda, clarifications, evaluations } from '@/lib/db/pg-schema';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const clarification = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        if (!clarification) {
            return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
        }

        if (clarification.linkedAddendumId) {
            const existingAddendum = await db.query.addenda.findFirst({
                where: eq(addenda.id, clarification.linkedAddendumId),
            });
            return NextResponse.json({
                success: true,
                data: {
                    addendum: existingAddendum,
                    clarification,
                },
            });
        }

        const evaluation = await db.query.evaluations.findFirst({
            where: eq(evaluations.id, clarification.evaluationId),
        });

        if (!evaluation) {
            return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
        }

        const [existing] = await db
            .select({ maxNum: max(addenda.addendumNumber) })
            .from(addenda)
            .where(and(
                eq(addenda.projectId, evaluation.projectId),
                eq(addenda.stakeholderId, evaluation.stakeholderId)
            ))
            .limit(1);

        const addendumId = uuidv4();
        const addendumNumber = (existing?.maxNum || 0) + 1;
        const content = [
            'Tender-wide clarification candidate',
            '',
            clarification.questionText,
            clarification.category ? `Category: ${clarification.category}` : null,
            `Materiality: ${clarification.materiality}`,
        ].filter(Boolean).join('\n');

        await db.insert(addenda).values({
            id: addendumId,
            projectId: evaluation.projectId,
            stakeholderId: evaluation.stakeholderId,
            addendumNumber,
            content,
        });

        await db.update(clarifications)
            .set({ linkedAddendumId: addendumId, updatedAt: new Date() })
            .where(eq(clarifications.id, id));

        const [created] = await db
            .select()
            .from(addenda)
            .where(eq(addenda.id, addendumId))
            .limit(1);

        const updatedClarification = await db.query.clarifications.findFirst({
            where: eq(clarifications.id, id),
        });

        return NextResponse.json({
            success: true,
            data: {
                addendum: created,
                clarification: updatedClarification,
            },
        });
    } catch (error) {
        console.error('[clarifications] promote error:', error);
        return NextResponse.json({ error: 'Failed to promote clarification' }, { status: 500 });
    }
}
