/**
 * T084-T085: Evaluation Row Merge API Route
 * POST: Merge multiple rows into one, summing amounts per firm
 * Feature 011 - Evaluation Report - User Story 7
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluations, evaluationRows, evaluationCells } from '@/lib/db';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface RouteParams {
    params: Promise<{
        projectId: string;
        contextType: string;
        contextId: string;
    }>;
}

// T084-T085: POST - Merge selected rows into one
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { projectId, contextType, contextId } = await params;
        const body = await request.json();
        const { rowIds, newDescription, tableType } = body;

        // Validate inputs
        if (!rowIds || !Array.isArray(rowIds) || rowIds.length < 2) {
            return NextResponse.json(
                { error: 'At least 2 row IDs are required for merge' },
                { status: 400 }
            );
        }

        if (!newDescription || typeof newDescription !== 'string') {
            return NextResponse.json(
                { error: 'New description is required' },
                { status: 400 }
            );
        }

        if (!tableType || !['initial_price', 'adds_subs'].includes(tableType)) {
            return NextResponse.json(
                { error: 'Valid table type is required' },
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

        // Fetch all selected rows with their cells
        const selectedRows = await db.query.evaluationRows.findMany({
            where: and(
                eq(evaluationRows.evaluationId, evaluation.id),
                inArray(evaluationRows.id, rowIds)
            ),
            with: {
                cells: true,
            },
        });

        if (selectedRows.length !== rowIds.length) {
            return NextResponse.json(
                { error: 'Some rows not found or do not belong to this evaluation' },
                { status: 400 }
            );
        }

        // Verify all rows are from the same table type
        const differentTableTypes = selectedRows.some(r => r.tableType !== tableType);
        if (differentTableTypes) {
            return NextResponse.json(
                { error: 'All rows must be from the same table type' },
                { status: 400 }
            );
        }

        // Check for system rows
        const hasSystemRow = selectedRows.some(r => r.isSystemRow);
        if (hasSystemRow) {
            return NextResponse.json(
                { error: 'Cannot merge system rows' },
                { status: 400 }
            );
        }

        // T085: Sum amounts per firm across all selected rows
        const firmAmounts: Map<string, { firmType: 'consultant' | 'contractor'; totalCents: number }> = new Map();

        for (const row of selectedRows) {
            for (const cell of row.cells || []) {
                const existing = firmAmounts.get(cell.firmId);
                if (existing) {
                    existing.totalCents += cell.amountCents || 0;
                } else {
                    firmAmounts.set(cell.firmId, {
                        firmType: cell.firmType as 'consultant' | 'contractor',
                        totalCents: cell.amountCents || 0,
                    });
                }
            }
        }

        // Get the lowest order index from selected rows (to insert merged row at that position)
        const minOrderIndex = Math.min(...selectedRows.map(r => r.orderIndex));

        // Create the merged row
        const mergedRowId = nanoid();
        await db.insert(evaluationRows).values({
            id: mergedRowId,
            evaluationId: evaluation.id,
            tableType: tableType as 'initial_price' | 'adds_subs',
            description: newDescription.trim(),
            orderIndex: minOrderIndex,
            source: 'manual', // Merged rows are considered manual
        });

        // Create cells for the merged row
        for (const [firmId, data] of firmAmounts.entries()) {
            await db.insert(evaluationCells).values({
                id: nanoid(),
                rowId: mergedRowId,
                firmId,
                firmType: data.firmType,
                amountCents: data.totalCents,
                source: 'manual', // Merged cells are considered manual
            });
        }

        // Delete the original rows (cells will cascade due to FK constraint)
        for (const rowId of rowIds) {
            await db.delete(evaluationRows).where(eq(evaluationRows.id, rowId));
        }

        // Re-index remaining rows to fill gaps
        const remainingRows = await db.query.evaluationRows.findMany({
            where: and(
                eq(evaluationRows.evaluationId, evaluation.id),
                eq(evaluationRows.tableType, tableType)
            ),
            orderBy: [desc(evaluationRows.orderIndex)],
        });

        // Sort by current order and re-assign indices
        const sortedRows = [...remainingRows].sort((a, b) => a.orderIndex - b.orderIndex);
        for (let i = 0; i < sortedRows.length; i++) {
            if (sortedRows[i].orderIndex !== i) {
                await db.update(evaluationRows)
                    .set({ orderIndex: i })
                    .where(eq(evaluationRows.id, sortedRows[i].id));
            }
        }

        // Fetch the merged row with cells
        const mergedRow = await db.query.evaluationRows.findFirst({
            where: eq(evaluationRows.id, mergedRowId),
            with: { cells: true },
        });

        console.log(`[merge-route] Merged ${rowIds.length} rows into ${mergedRowId}`);

        return NextResponse.json({
            success: true,
            data: {
                mergedRow,
                deletedRowIds: rowIds,
            },
        });
    } catch (error) {
        console.error('Error merging evaluation rows:', error);
        return NextResponse.json(
            { error: 'Failed to merge rows' },
            { status: 500 }
        );
    }
}
