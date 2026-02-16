/**
 * Generate Cost Plan Section from Stakeholders API
 * Feature: 006 - Cost Planning Module
 *
 * Generates cost plan line items for a specific section based on project stakeholders
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db/pg-schema';
import type { CostLineSection } from '@/types/cost-plan';
import type { StakeholderGroup } from '@/types/stakeholder';

// Map cost plan sections to stakeholder groups
const SECTION_TO_GROUP: Record<string, StakeholderGroup> = {
  FEES: 'authority',
  CONSULTANTS: 'consultant',
  CONSTRUCTION: 'contractor',
};

// Cost code prefixes for each section
const SECTION_CODE_PREFIX: Record<string, string> = {
  FEES: 'AUTH',
  CONSULTANTS: 'CON',
  CONSTRUCTION: 'CTR',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { section } = body as { section: CostLineSection };

    // Validate section parameter
    if (!section || !['FEES', 'CONSULTANTS', 'CONSTRUCTION'].includes(section)) {
      return NextResponse.json(
        { error: 'Invalid section. Must be FEES, CONSULTANTS, or CONSTRUCTION.' },
        { status: 400 }
      );
    }

    const stakeholderGroup = SECTION_TO_GROUP[section];

    // Fetch stakeholders for this group (enabled only)
    const stakeholders = await db
      .select()
      .from(projectStakeholders)
      .where(
        and(
          eq(projectStakeholders.projectId, projectId),
          eq(projectStakeholders.stakeholderGroup, stakeholderGroup),
          eq(projectStakeholders.isEnabled, true),
          isNull(projectStakeholders.deletedAt)
        )
      );

    if (stakeholders.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            linesCreated: 0,
            message: `No enabled ${stakeholderGroup} stakeholders found. Add stakeholders in the Planning section first.`,
          },
        }
      );
    }

    // Execute in a transaction
    const result = await db.transaction(async (tx) => {
      // Get existing cost lines for this section (only non-deleted)
      const existingLines = await tx
        .select({ sortOrder: costLines.sortOrder, stakeholderId: costLines.stakeholderId })
        .from(costLines)
        .where(
          and(
            eq(costLines.projectId, projectId),
            eq(costLines.section, section),
            isNull(costLines.deletedAt)
          )
        );

      let maxSortOrder = 0;
      if (existingLines.length > 0) {
        maxSortOrder = Math.max(...existingLines.map(l => l.sortOrder));
      }

      // Skip stakeholders that already have cost lines in this section
      const existingStakeholderIds = new Set(
        existingLines.map(l => l.stakeholderId).filter(Boolean)
      );
      const newStakeholders = stakeholders.filter(s => !existingStakeholderIds.has(s.id));

      if (newStakeholders.length === 0) {
        return {
          linesCreated: 0,
          section,
          message: 'All stakeholders already have cost lines in this section.',
        };
      }

      const codePrefix = SECTION_CODE_PREFIX[section];

      // Create cost lines only for stakeholders that don't already have one
      const insertValues = newStakeholders.map((stakeholder, index) => {
        const uniqueId = crypto.randomUUID();

        // Use stakeholder discipline/trade name as the activity description
        const activity = stakeholder.disciplineOrTrade || stakeholder.name || '';

        // Parse budget from briefFee (consultants) or scopePrice (contractors)
        let budgetCents = 0;
        const feeString = section === 'CONSULTANTS' ? stakeholder.briefFee : stakeholder.scopePrice;
        if (feeString) {
          // Try to extract a number from the fee string
          const numericValue = parseFloat(feeString.replace(/[^0-9.-]/g, ''));
          if (!isNaN(numericValue)) {
            budgetCents = Math.round(numericValue * 100);
          }
        }

        return {
          id: `cl-${projectId}-${uniqueId}`,
          projectId,
          section,
          activity,
          costCode: `${codePrefix}-${String(existingLines.length + index + 1).padStart(3, '0')}`,
          reference: null,
          budgetCents,
          approvedContractCents: 0,
          sortOrder: maxSortOrder + index + 1,
          stakeholderId: stakeholder.id,
          masterStage: null,
        };
      });

      // Bulk insert
      const inserted = await tx.insert(costLines).values(insertValues).returning();

      return {
        linesCreated: inserted.length,
        section,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Section generation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Section generation failed',
      },
      { status: 500 }
    );
  }
}
