// src/lib/context/modules/planning-card.ts
// Planning card module fetcher - wraps fetchPlanningContext() from planning-context.ts

import { fetchPlanningContext } from '@/lib/services/planning-context';
import type { ModuleResult } from '../types';

export interface PlanningCardData {
  projectId: string;
  projectCode: string | null;
  details: Record<string, unknown>;
  objectives: Record<string, unknown>;
  stages: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
  stakeholders: Array<Record<string, unknown>>;
  disciplines: Array<Record<string, unknown>>;
  trades: Array<Record<string, unknown>>;
}

export async function fetchPlanningCard(
  projectId: string
): Promise<ModuleResult<PlanningCardData | null>> {
  try {
    const context = await fetchPlanningContext(projectId);

    if (!context) {
      return {
        moduleName: 'planningCard',
        success: true,
        data: null,
        estimatedTokens: 0,
      };
    }

    const data: PlanningCardData = {
      projectId: context.projectId,
      projectCode: context.projectCode ?? null,
      details: context.details as unknown as Record<string, unknown>,
      objectives: context.objectives as unknown as Record<string, unknown>,
      stages: context.stages as unknown as Array<Record<string, unknown>>,
      risks: context.risks as unknown as Array<Record<string, unknown>>,
      stakeholders: context.stakeholders as unknown as Array<Record<string, unknown>>,
      disciplines: context.disciplines as unknown as Array<Record<string, unknown>>,
      trades: context.trades as unknown as Array<Record<string, unknown>>,
    };

    // Fixed estimate: planning context is comprehensive
    return {
      moduleName: 'planningCard',
      success: true,
      data,
      estimatedTokens: 200,
    };
  } catch (error) {
    return {
      moduleName: 'planningCard',
      success: false,
      data: null,
      error: `Planning card fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
