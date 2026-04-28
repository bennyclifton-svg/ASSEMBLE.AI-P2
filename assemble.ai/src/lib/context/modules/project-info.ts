// src/lib/context/modules/project-info.ts
// Project info module fetcher - extracts project details and per-row objectives

import { db } from '@/lib/db';
import { projectDetails } from '@/lib/db/pg-schema';
import { projectObjectives } from '@/lib/db/objectives-schema';
import type { ObjectiveType } from '@/lib/db/objectives-schema';
import { and, asc, eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProjectInfoObjectives {
  planning: string[];
  functional: string[];
  quality: string[];
  compliance: string[];
}

export interface ProjectInfoData {
  projectName: string | null;
  address: string | null;
  jurisdiction: string | null;
  objectives: ProjectInfoObjectives | null;
}

export async function fetchProjectInfo(
  projectId: string
): Promise<ModuleResult<ProjectInfoData>> {
  try {
    const [detailsResult, objectiveRows] = await Promise.all([
      db
        .select({
          projectName: projectDetails.projectName,
          address: projectDetails.address,
          jurisdiction: projectDetails.jurisdiction,
        })
        .from(projectDetails)
        .where(eq(projectDetails.projectId, projectId))
        .limit(1),
      db
        .select({
          objectiveType: projectObjectives.objectiveType,
          text: projectObjectives.text,
          textPolished: projectObjectives.textPolished,
          sortOrder: projectObjectives.sortOrder,
        })
        .from(projectObjectives)
        .where(
          and(
            eq(projectObjectives.projectId, projectId),
            eq(projectObjectives.isDeleted, false)
          )
        )
        .orderBy(
          asc(projectObjectives.objectiveType),
          asc(projectObjectives.sortOrder)
        ),
    ]);

    const details = detailsResult[0] ?? null;

    // Group rows by objectiveType into four arrays of display strings
    const grouped: ProjectInfoObjectives = {
      planning: [],
      functional: [],
      quality: [],
      compliance: [],
    };

    for (const row of objectiveRows) {
      const display = row.textPolished ?? row.text;
      if (!display) continue;
      const type = row.objectiveType as ObjectiveType;
      if (type in grouped) {
        grouped[type].push(display);
      }
    }

    const hasAnyObjective =
      grouped.planning.length > 0 ||
      grouped.functional.length > 0 ||
      grouped.quality.length > 0 ||
      grouped.compliance.length > 0;

    const parsedObjectives: ProjectInfoData['objectives'] = hasAnyObjective
      ? grouped
      : null;

    const data: ProjectInfoData = {
      projectName: details?.projectName ?? null,
      address: details?.address ?? null,
      jurisdiction: details?.jurisdiction ?? null,
      objectives: parsedObjectives,
    };

    // Token estimate: 15 base + 20 per non-null field
    const nonNullFields = [
      data.projectName,
      data.address,
      data.jurisdiction,
      data.objectives,
    ].filter((v) => v !== null).length;
    const estimatedTokens = 15 + nonNullFields * 20;

    return {
      moduleName: 'projectInfo',
      success: true,
      data,
      estimatedTokens,
    };
  } catch (error) {
    return {
      moduleName: 'projectInfo',
      success: false,
      data: {} as ProjectInfoData,
      error: `Project info fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
