/**
 * Clear All Program Activities API
 * Feature: 018-project-initiator / Phase 11
 *
 * DELETE /api/projects/[projectId]/program/activities/clear
 * Deletes all program activities for a project.
 * Used to clear the program before regenerating from template.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities } from '@/lib/db';
import { eq } from 'drizzle-orm';

// DELETE /api/projects/[projectId]/program/activities/clear - Delete all activities
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Delete all activities for this project
    const result = await db
      .delete(programActivities)
      .where(eq(programActivities.projectId, projectId));

    return NextResponse.json(
      {
        success: true,
        message: 'All program activities cleared',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing activities:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear activities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
