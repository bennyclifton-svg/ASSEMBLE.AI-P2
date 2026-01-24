/**
 * Clear Cost Plan API
 * Feature: 018-project-initiator Phase 12
 * Soft-deletes all cost plan line items for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines } from '@/lib/db/pg-schema';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Soft delete all cost lines for this project
    const result = await db.transaction(async (tx) => {
      // Count existing non-deleted lines
      const existingLines = await tx
        .select({ id: costLines.id })
        .from(costLines)
        .where(
          and(
            eq(costLines.projectId, projectId),
            isNull(costLines.deletedAt)
          )
        );

      const lineCount = existingLines.length;

      if (lineCount === 0) {
        return { linesDeleted: 0 };
      }

      // Soft delete all lines
      const now = new Date();
      await tx
        .update(costLines)
        .set({ deletedAt: now })
        .where(
          and(
            eq(costLines.projectId, projectId),
            isNull(costLines.deletedAt)
          )
        );

      return { linesDeleted: lineCount };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Clear cost plan failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Clear cost plan failed',
      },
      { status: 500 }
    );
  }
}
