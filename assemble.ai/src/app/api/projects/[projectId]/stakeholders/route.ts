/**
 * Stakeholders API Route
 * Feature: 020-stakeholder
 *
 * GET /api/projects/[projectId]/stakeholders - List all stakeholders
 * POST /api/projects/[projectId]/stakeholders - Create a new stakeholder
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStakeholders, createStakeholder } from '@/lib/services/stakeholder-service';
import type { CreateStakeholderRequest, StakeholderGroup } from '@/types/stakeholder';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/stakeholders
 * List all stakeholders for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Optional filter by group
    const { searchParams } = new URL(request.url);
    const groupFilter = searchParams.get('group') as StakeholderGroup | null;

    const result = await getStakeholders(projectId);

    // Filter by group if specified
    if (groupFilter && ['client', 'authority', 'consultant', 'contractor'].includes(groupFilter)) {
      const filteredStakeholders = result.stakeholders.filter(
        s => s.stakeholderGroup === groupFilter
      );
      return NextResponse.json({
        stakeholders: filteredStakeholders,
        counts: result.counts,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/projects/[projectId]/stakeholders] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stakeholders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/stakeholders
 * Create a new stakeholder
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
    if (!body.stakeholderGroup || !body.name) {
      return NextResponse.json(
        { error: 'stakeholderGroup and name are required' },
        { status: 400 }
      );
    }

    // Validate stakeholder group
    if (!['client', 'authority', 'consultant', 'contractor'].includes(body.stakeholderGroup)) {
      return NextResponse.json(
        { error: 'Invalid stakeholderGroup' },
        { status: 400 }
      );
    }

    const createRequest: CreateStakeholderRequest = {
      stakeholderGroup: body.stakeholderGroup,
      name: body.name,
      role: body.role,
      organization: body.organization,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      disciplineOrTrade: body.disciplineOrTrade,
      isEnabled: body.isEnabled ?? true,
      notes: body.notes,
      isAiGenerated: body.isAiGenerated ?? false,
    };

    const stakeholder = await createStakeholder(projectId, createRequest);

    return NextResponse.json(stakeholder, { status: 201 });
  } catch (error) {
    console.error('[POST /api/projects/[projectId]/stakeholders] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create stakeholder' },
      { status: 500 }
    );
  }
}
