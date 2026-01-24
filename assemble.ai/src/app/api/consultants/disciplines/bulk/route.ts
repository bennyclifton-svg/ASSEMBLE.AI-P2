/**
 * Bulk Consultant Discipline Operations API
 * Handles clearing all disciplines or applying defaults based on project type
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, consultantDisciplines } from '@/lib/db/pg-schema';
import { getApplicableDisciplines } from '@/lib/utils/discipline-mapping';
import { generateServicesForDiscipline } from '@/lib/utils/consultant-services-generation';
import type { ProjectTypeId, ConsultantTemplatesData } from '@/lib/types/project-initiator';

interface BulkOperationRequest {
  operation: 'clear_all' | 'apply_defaults';
  projectId: string;
  projectType?: ProjectTypeId;
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkOperationRequest = await request.json();
    const { operation, projectId, projectType } = body;

    // Validate required fields
    if (!operation || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: operation and projectId' },
        { status: 400 }
      );
    }

    // Validate operation type
    if (operation !== 'clear_all' && operation !== 'apply_defaults') {
      return NextResponse.json(
        { error: 'Invalid operation. Must be "clear_all" or "apply_defaults"' },
        { status: 400 }
      );
    }

    // Validate projectType for apply_defaults
    if (operation === 'apply_defaults' && !projectType) {
      return NextResponse.json(
        { error: 'projectType is required for apply_defaults operation' },
        { status: 400 }
      );
    }

    // Execute operation in a transaction
    const result = await db.transaction(async (tx) => {
      if (operation === 'clear_all') {
        // Clear all: Set all disciplines to disabled
        const existingDisciplines = await tx
          .select()
          .from(consultantDisciplines)
          .where(eq(consultantDisciplines.projectId, projectId));

        for (const discipline of existingDisciplines) {
          await tx
            .update(consultantDisciplines)
            .set({
              isEnabled: false,
              updatedAt: new Date(),
            })
            .where(eq(consultantDisciplines.id, discipline.id));
        }

        return {
          affectedCount: existingDisciplines.length,
          disciplines: existingDisciplines.map(d => ({ ...d, isEnabled: false })),
        };
      } else {
        // Apply defaults: Enable disciplines based on project type
        // Load consultant templates
        const consultantTemplatesModule = await import('@/lib/data/consultant-templates.json');
        const consultantTemplatesData = (consultantTemplatesModule.default || consultantTemplatesModule) as any;
        const consultantTemplates: ConsultantTemplatesData = consultantTemplatesData.consultantTemplates || consultantTemplatesData;

        // Get applicable disciplines for this project type
        const applicableDisciplines = getApplicableDisciplines(projectType!, consultantTemplates);

        // Get existing consultant disciplines for this project
        const existingDisciplines = await tx
          .select()
          .from(consultantDisciplines)
          .where(eq(consultantDisciplines.projectId, projectId));

        const existingDisciplineNames = new Set(existingDisciplines.map(d => d.disciplineName));
        const applicableDisciplineNames = new Set(applicableDisciplines.keys());
        let disciplinesEnabledCount = 0;

        // Process each applicable discipline
        for (const [disciplineName, discipline] of applicableDisciplines.entries()) {
          // Generate services and deliverables using utility function (Phase 13)
          const { services: servicesMarkdown, deliverables: deliverablesMarkdown } =
            generateServicesForDiscipline(discipline);

          if (existingDisciplineNames.has(disciplineName)) {
            // Update existing discipline
            await tx
              .update(consultantDisciplines)
              .set({
                isEnabled: true,
                briefServices: servicesMarkdown,
                briefDeliverables: deliverablesMarkdown,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(consultantDisciplines.projectId, projectId),
                  eq(consultantDisciplines.disciplineName, disciplineName)
                )
              );
          } else {
            // Insert new discipline
            await tx.insert(consultantDisciplines).values({
              id: `cd-${projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              projectId,
              disciplineName,
              isEnabled: true,
              order: disciplinesEnabledCount,
              briefServices: servicesMarkdown,
              briefDeliverables: deliverablesMarkdown,
              updatedAt: new Date(),
            });
          }

          disciplinesEnabledCount++;
        }

        // Disable disciplines that are not applicable
        for (const existing of existingDisciplines) {
          if (!applicableDisciplineNames.has(existing.disciplineName)) {
            await tx
              .update(consultantDisciplines)
              .set({
                isEnabled: false,
                updatedAt: new Date(),
              })
              .where(eq(consultantDisciplines.id, existing.id));
          }
        }

        // Fetch updated disciplines
        const updatedDisciplines = await tx
          .select()
          .from(consultantDisciplines)
          .where(eq(consultantDisciplines.projectId, projectId));

        return {
          affectedCount: disciplinesEnabledCount,
          disciplines: updatedDisciplines,
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Bulk operation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk operation failed',
      },
      { status: 500 }
    );
  }
}
