/**
 * Stakeholder Generation API Route
 * Feature: 020-stakeholder
 *
 * POST /api/projects/[projectId]/stakeholders/generate - Generate/preview stakeholders
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateStakeholders,
  applyGeneratedStakeholders,
  previewGeneratedStakeholders,
} from '@/lib/services/stakeholder-generation';
import { getStakeholders } from '@/lib/services/stakeholder-service';
import type { StakeholderGroup, GenerateStakeholdersRequest } from '@/types/stakeholder';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/stakeholders/generate
 *
 * Body:
 * - preview: boolean (if true, only preview without applying)
 * - mode: 'merge' | 'replace' (default: 'merge')
 * - groups: StakeholderGroup[] (default: all)
 * - includeAuthorities: boolean (default: true)
 * - includeContractors: boolean (default: true)
 * - smartMerge: boolean (if true, only add stakeholders that don't already exist)
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

    // Build generation request
    const generateRequest: GenerateStakeholdersRequest = {
      mode: body.mode || 'merge',
      groups: body.groups as StakeholderGroup[] | undefined,
      includeAuthorities: body.includeAuthorities ?? true,
      includeContractors: body.includeContractors ?? true,
    };

    // Validate groups if provided
    if (generateRequest.groups) {
      const validGroups: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];
      const invalidGroups = generateRequest.groups.filter(g => !validGroups.includes(g));
      if (invalidGroups.length > 0) {
        return NextResponse.json(
          { error: `Invalid groups: ${invalidGroups.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Preview mode - just return what would be generated
    if (body.preview) {
      const preview = await previewGeneratedStakeholders(projectId, generateRequest);
      return NextResponse.json({
        preview: true,
        ...preview,
      });
    }

    // Generate and apply
    const smartMerge = body.smartMerge === true;
    console.log('[Stakeholder Generate] Mode:', generateRequest.mode, 'Groups:', generateRequest.groups, 'SmartMerge:', smartMerge);

    const generationResult = await generateStakeholders(projectId, generateRequest);
    console.log('[Stakeholder Generate] Generated:', generationResult.generated.length, 'stakeholders');

    // For smart merge, fetch existing stakeholders to pass to apply function
    let existingStakeholders = undefined;
    if (smartMerge) {
      const existingResult = await getStakeholders(projectId);
      existingStakeholders = existingResult.stakeholders;
      console.log('[Stakeholder Generate] SmartMerge - fetched', existingStakeholders.length, 'existing stakeholders');
    }

    const applyResult = await applyGeneratedStakeholders(
      projectId,
      generationResult.generated,
      generateRequest.mode || 'merge',
      generateRequest.groups,
      existingStakeholders
    );

    console.log('[Stakeholder Generate] Result - Created:', applyResult.created, 'Deleted:', applyResult.deleted, 'Skipped:', applyResult.skipped);

    return NextResponse.json({
      success: true,
      generated: generationResult.generated,
      profileContext: generationResult.profileContext,
      created: applyResult.created,
      deleted: applyResult.deleted,
      skipped: applyResult.skipped,
      mode: generateRequest.mode,
    });
  } catch (error) {
    console.error('[POST /api/projects/[projectId]/stakeholders/generate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate stakeholders' },
      { status: 500 }
    );
  }
}
