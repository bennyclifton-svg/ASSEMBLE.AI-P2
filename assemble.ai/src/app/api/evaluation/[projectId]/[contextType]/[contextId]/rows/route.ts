/**
 * T023: Evaluation Rows API Route
 * POST: Add a new row to evaluation table
 * Feature 011 - Evaluation Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluations, evaluationRows } from '@/lib/db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

// POST: Add a new row
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextType, contextId } = await params;
        const body = await request.json();
        const { tableType, description, evaluationPriceId } = body;

        // Validate
        if (!tableType || !['initial_price', 'adds_subs'].includes(tableType)) {
            return NextResponse.json(
                { error: 'Invalid table type' },
                { status: 400 }
            );
        }

        // Find the evaluation using stakeholderId
        const evaluation = await db.query.evaluations.findFirst({
            where: and(
                eq(evaluations.projectId, projectId),
                eq(evaluations.stakeholderId, contextId)
            ),
        });

        if (!evaluation) {
            return NextResponse.json(
                { error: 'Evaluation not found' },
                { status: 404 }
            );
        }

        // Get the highest order index for this table type (filtered by evaluationPriceId)
        const existingRows = await db.query.evaluationRows.findMany({
            where: evaluationPriceId
                ? and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    eq(evaluationRows.tableType, tableType),
                    eq(evaluationRows.evaluationPriceId, evaluationPriceId)
                )
                : and(
                    eq(evaluationRows.evaluationId, evaluation.id),
                    eq(evaluationRows.tableType, tableType),
                    isNull(evaluationRows.evaluationPriceId)
                ),
            orderBy: [desc(evaluationRows.orderIndex)],
            limit: 1,
        });

        const nextOrderIndex = existingRows.length > 0
            ? existingRows[0].orderIndex + 1
            : 0;

        // Create the new row (blank description if not provided)
        const newRowId = nanoid();
        await db.insert(evaluationRows).values({
            id: newRowId,
            evaluationId: evaluation.id,
            evaluationPriceId: evaluationPriceId || undefined,
            tableType,
            description: description || '',
            orderIndex: nextOrderIndex,
            source: 'manual' as const, // Manual rows should always be visible
        });

        // Fetch and return the created row
        const newRow = await db.query.evaluationRows.findFirst({
            where: eq(evaluationRows.id, newRowId),
            with: { cells: true },
        });

        return NextResponse.json({
            success: true,
            data: newRow,
        });
    } catch (error) {
        console.error('Error adding evaluation row:', error);
        return NextResponse.json(
            { error: 'Failed to add row' },
            { status: 500 }
        );
    }
}
