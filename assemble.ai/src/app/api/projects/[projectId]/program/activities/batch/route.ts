/**
 * Batch Program Activities API
 * Feature: 018-project-initiator / Phase 11
 *
 * POST /api/projects/[projectId]/program/activities/batch
 * Creates multiple program activities in a single transaction.
 * Used by Project Initiator to populate program phases from templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, programActivities } from '@/lib/db';

interface BatchActivityCreate {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  parentId: string | null;
  sortOrder: number;
  color?: string;
}

interface BatchRequest {
  activities: BatchActivityCreate[];
}

// POST /api/projects/[projectId]/program/activities/batch - Create multiple activities
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body: BatchRequest = await request.json();

    if (!body.activities || !Array.isArray(body.activities)) {
      return NextResponse.json(
        { error: 'activities array is required' },
        { status: 400 }
      );
    }

    if (body.activities.length === 0) {
      return NextResponse.json(
        { error: 'At least one activity is required' },
        { status: 400 }
      );
    }

    // Validate all activities
    for (const activity of body.activities) {
      if (!activity.name?.trim()) {
        return NextResponse.json(
          { error: 'All activities must have a name' },
          { status: 400 }
        );
      }

      if (!activity.id) {
        return NextResponse.json(
          { error: 'All activities must have an id' },
          { status: 400 }
        );
      }

      if (activity.sortOrder === undefined || activity.sortOrder === null) {
        return NextResponse.json(
          { error: 'All activities must have a sortOrder' },
          { status: 400 }
        );
      }
    }

    // Insert all activities in a transaction
    const insertedActivities = await db.transaction(async (tx) => {
      const inserted = [];

      for (const activity of body.activities) {
        const values = {
          id: activity.id,
          projectId,
          parentId: activity.parentId || null,
          name: activity.name.trim(),
          startDate: activity.startDate || null,
          endDate: activity.endDate || null,
          collapsed: false,
          color: activity.color || '#94a3b8',
          sortOrder: activity.sortOrder,
          // Let database handle createdAt/updatedAt defaults
        };

        await tx.insert(programActivities).values(values);
        inserted.push(values);
      }

      return inserted;
    });

    return NextResponse.json(
      {
        success: true,
        count: insertedActivities.length,
        activities: insertedActivities,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating batch activities:', error);
    return NextResponse.json(
      {
        error: 'Failed to create activities',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
