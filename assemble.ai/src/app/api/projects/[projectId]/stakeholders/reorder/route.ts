/**
 * Stakeholder Reorder API Route
 * Feature: 020-stakeholder
 *
 * POST /api/projects/[projectId]/stakeholders/reorder - Reorder stakeholders within a group
 */

import { NextRequest, NextResponse } from 'next/server';
import { reorderStakeholders } from '@/lib/services/stakeholder-service';
import type { StakeholderGroup } from '@/types/stakeholder';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/stakeholders/reorder
 *
 * Body:
 * - group: StakeholderGroup (required)
 * - stakeholderIds: string[] (required, new order)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.group || !body.stakeholderIds) {
      return NextResponse.json(
        { error: 'group and stakeholderIds are required' },
        { status: 400 }
      );
    }

    // Validate group
    const validGroups: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];
    if (!validGroups.includes(body.group)) {
      return NextResponse.json(
        { error: 'Invalid group' },
        { status: 400 }
      );
    }

    // Validate stakeholderIds is an array
    if (!Array.isArray(body.stakeholderIds)) {
      return NextResponse.json(
        { error: 'stakeholderIds must be an array' },
        { status: 400 }
      );
    }

    await reorderStakeholders(projectId, body.group, body.stakeholderIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/projects/[projectId]/stakeholders/reorder] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reorder stakeholders' },
      { status: 500 }
    );
  }
}
