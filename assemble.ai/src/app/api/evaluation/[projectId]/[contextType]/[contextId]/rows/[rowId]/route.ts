/**
 * T024: Evaluation Row Delete API Route
 * T087: PATCH handler for description updates (Feature 011 US7)
 * DELETE: Remove a row from evaluation table
 * Feature 011 - Evaluation Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluationRows, evaluations } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
        rowId: string;
    }>;
}

// DELETE: Remove a row
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { rowId } = await params;

        // Check if row exists
        const existingRow = await db.query.evaluationRows.findFirst({
            where: eq(evaluationRows.id, rowId),
        });

        if (!existingRow) {
            return NextResponse.json(
                { error: 'Row not found' },
                { status: 404 }
            );
        }

        // Don't allow deleting system rows (subtotals, etc.)
        if (existingRow.isSystemRow) {
            return NextResponse.json(
                { error: 'Cannot delete system rows' },
                { status: 400 }
            );
        }

        // If this row came from cost plan and has a costLineId, track the deletion
        // Deletions are tracked per evaluationPriceId so each instance is independent
        if (existingRow.source === 'cost_plan' && existingRow.costLineId) {
            const evaluation = await db.query.evaluations.findFirst({
                where: eq(evaluations.id, existingRow.evaluationId),
            });

            if (evaluation) {
                const rawDeletedIds = JSON.parse(evaluation.deletedCostLineIds || '[]');
                const key = existingRow.evaluationPriceId || 'null';

                // Migrate from legacy array format to keyed object format
                let deletedIdsObj: Record<string, string[]>;
                if (Array.isArray(rawDeletedIds)) {
                    // Legacy format: migrate to new keyed format
                    deletedIdsObj = { 'null': rawDeletedIds };
                } else {
                    deletedIdsObj = rawDeletedIds;
                }

                // Initialize array for this key if needed
                if (!deletedIdsObj[key]) {
                    deletedIdsObj[key] = [];
                }

                // Add the cost line ID if not already tracked
                if (!deletedIdsObj[key].includes(existingRow.costLineId)) {
                    deletedIdsObj[key].push(existingRow.costLineId);
                    await db.update(evaluations)
                        .set({
                            deletedCostLineIds: JSON.stringify(deletedIdsObj),
                            updatedAt: new Date(),
                        })
                        .where(eq(evaluations.id, evaluation.id));
                }
            }
        }

        // Delete the row (cells will cascade due to FK constraint)
        await db.delete(evaluationRows).where(eq(evaluationRows.id, rowId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting evaluation row:', error);
        return NextResponse.json(
            { error: 'Failed to delete row' },
            { status: 500 }
        );
    }
}

// T087: PATCH - Update row description or orderIndex
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { rowId } = await params;
        const body = await request.json();
        const { description, orderIndex } = body;

        // Validate at least one field is provided
        if (description === undefined && orderIndex === undefined) {
            return NextResponse.json(
                { error: 'Must provide description or orderIndex' },
                { status: 400 }
            );
        }

        // Check if row exists
        const existingRow = await db.query.evaluationRows.findFirst({
            where: eq(evaluationRows.id, rowId),
        });

        if (!existingRow) {
            return NextResponse.json(
                { error: 'Row not found' },
                { status: 404 }
            );
        }

        // Don't allow editing system rows
        if (existingRow.isSystemRow) {
            return NextResponse.json(
                { error: 'Cannot edit system rows' },
                { status: 400 }
            );
        }

        // Build update object
        const updateData: { description?: string; orderIndex?: number } = {};
        if (description !== undefined) {
            if (typeof description !== 'string') {
                return NextResponse.json(
                    { error: 'Description must be a string' },
                    { status: 400 }
                );
            }
            updateData.description = description.trim();
        }
        if (orderIndex !== undefined) {
            if (typeof orderIndex !== 'number') {
                return NextResponse.json(
                    { error: 'orderIndex must be a number' },
                    { status: 400 }
                );
            }
            updateData.orderIndex = orderIndex;
        }

        // Update the row
        await db.update(evaluationRows)
            .set(updateData)
            .where(eq(evaluationRows.id, rowId));

        // Fetch and return the updated row with cells
        const updatedRow = await db.query.evaluationRows.findFirst({
            where: eq(evaluationRows.id, rowId),
            with: { cells: true },
        });

        return NextResponse.json({
            success: true,
            data: updatedRow,
        });
    } catch (error) {
        console.error('Error updating evaluation row:', error);
        return NextResponse.json(
            { error: 'Failed to update row' },
            { status: 500 }
        );
    }
}
