// src/lib/context/modules/project-info.ts
// Project info module fetcher - extracts project details and profiler objectives

import { db } from '@/lib/db';
import { projectDetails, profilerObjectives } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProjectInfoData {
  projectName: string | null;
  address: string | null;
  jurisdiction: string | null;
  objectives: {
    functionalQuality: string;
    planningCompliance: string;
  } | null;
}

export async function fetchProjectInfo(
  projectId: string
): Promise<ModuleResult<ProjectInfoData>> {
  try {
    const [detailsResult, objectivesResult] = await Promise.all([
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
          functionalQuality: profilerObjectives.functionalQuality,
          planningCompliance: profilerObjectives.planningCompliance,
        })
        .from(profilerObjectives)
        .where(eq(profilerObjectives.projectId, projectId))
        .limit(1),
    ]);

    const details = detailsResult[0] ?? null;
    const objectives = objectivesResult[0] ?? null;

    let parsedObjectives: ProjectInfoData['objectives'] = null;
    if (objectives) {
      const fq = objectives.functionalQuality
        ? JSON.parse(objectives.functionalQuality)
        : null;
      const pc = objectives.planningCompliance
        ? JSON.parse(objectives.planningCompliance)
        : null;
      if (fq?.content || pc?.content) {
        parsedObjectives = {
          functionalQuality: fq?.content || '',
          planningCompliance: pc?.content || '',
        };
      }
    }

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
