/**
 * T024: Evaluation Row Delete API Route
 * T087: PATCH handler for description updates (Feature 011 US7)
 * DELETE: Remove a row from evaluation table
 * Feature 011 - Evaluation Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluationRows } from '@/lib/db/schema';
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

// T087: PATCH - Update row description
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { rowId } = await params;
        const body = await request.json();
        const { description } = body;

        // Validate description
        if (typeof description !== 'string') {
            return NextResponse.json(
                { error: 'Description must be a string' },
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

        // Update the description
        await db.update(evaluationRows)
            .set({ description: description.trim() })
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
        console.error('Error updating evaluation row description:', error);
        return NextResponse.json(
            { error: 'Failed to update row description' },
            { status: 500 }
        );
    }
}
