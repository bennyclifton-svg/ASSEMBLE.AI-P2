/**
 * Batch Cost Lines API
 * Feature: 018-project-initiator Phase 12
 * Bulk insert cost plan line items
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines } from '@/lib/db/pg-schema';
import type { CostLineSection } from '@/types/cost-plan';

export interface BatchCostLineInput {
  description: string;
  section: CostLineSection;
  budgetedCost: number;
  costCode?: string;
  reference?: string;
  notes?: string;
}

export interface BatchCostLinesRequest {
  lines: BatchCostLineInput[];
  clearExisting?: boolean; // Option to clear existing lines before inserting
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body: BatchCostLinesRequest = await request.json();

    const { lines, clearExisting = false } = body;

    if (!lines || lines.length === 0) {
      return NextResponse.json(
        { error: 'No cost lines provided' },
        { status: 400 }
      );
    }

    // Execute in a transaction
    const result = await db.transaction(async (tx) => {
      // Optionally clear existing lines
      if (clearExisting) {
        // Note: This performs a soft delete by setting deletedAt
        // If you want hard delete, use .delete() instead
        const now = new Date();
        await tx
          .update(costLines)
          .set({ deletedAt: now })
          .where(eq(costLines.projectId, projectId));
      }

      // Get the current max sort order (only non-deleted lines)
      const existingLines = await tx
        .select({ sortOrder: costLines.sortOrder })
        .from(costLines)
        .where(
          and(
            eq(costLines.projectId, projectId),
            isNull(costLines.deletedAt)
          )
        );

      let maxSortOrder = 0;
      if (existingLines.length > 0) {
        maxSortOrder = Math.max(...existingLines.map(l => l.sortOrder));
      }

      // Prepare batch insert values with truly unique IDs using crypto.randomUUID()
      const insertValues = lines.map((line, index) => {
        // Use crypto.randomUUID() for guaranteed unique IDs
        const uniqueId = crypto.randomUUID();
        return {
          id: `cl-${projectId}-${uniqueId}`,
          projectId,
          section: line.section,
          activity: line.description,
          costCode: line.costCode || null,
          reference: line.reference || null,
          budgetCents: Math.round(line.budgetedCost * 100), // Convert to cents
          approvedContractCents: 0,
          sortOrder: maxSortOrder + index + 1,
          disciplineId: null,
          tradeId: null,
        };
      });

      // Bulk insert
      const inserted = await tx.insert(costLines).values(insertValues).returning();

      return {
        linesCreated: inserted.length,
        lines: inserted,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Batch cost line creation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Batch creation failed',
      },
      { status: 500 }
    );
  }
}
