// src/lib/context/orchestrator.ts
// Main entry point: assembleContext() for all AI generation consumers

import { moduleCache } from './cache';
import { resolveStrategy, resolveAutoModeModules } from './strategies';
import { assignTiers, formatModule, formatProjectSummary } from './formatter';
import {
  analyzeCrossModulePatterns,
  formatCrossModuleInsights,
} from './cross-module';
import { fetchProfile } from './modules/profile';
import { fetchCostPlan } from './modules/cost-plan';
import { fetchProgram } from './modules/program';
import { fetchRisks } from './modules/risks';
import { fetchProcurement } from './modules/procurement';
import { fetchStakeholders } from './modules/stakeholders';
import { fetchPlanningCard } from './modules/planning-card';
import { fetchStarredNotes } from './modules/notes';
import { fetchRagDocuments } from './modules/documents';
import { fetchProjectInfo } from './modules/project-info';
import { fetchProcurementDocs } from './modules/procurement-docs';
import { fetchAttachedDocuments } from './modules/attached-documents';
import type {
  ContextRequest,
  AssembledContext,
  ContextIssue,
  ModuleResult,
  ModuleName,
  ModuleRequirement,
} from './types';

/**
 * Module fetcher registry.
 * Maps module names to their fetch functions.
 *
 * Note: variations/invoices are included in costPlan fetch,
 * and milestones are included in program fetch.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODULE_FETCHERS: Record<ModuleName, (projectId: string, params?: any) => Promise<ModuleResult>> = {
  profile: fetchProfile,
  costPlan: fetchCostPlan,
  variations: (pid, p) => fetchCostPlan(pid, p),
  invoices: (pid, p) => fetchCostPlan(pid, p),
  program: fetchProgram,
  milestones: fetchProgram,
  risks: fetchRisks,
  procurement: fetchProcurement,
  stakeholders: fetchStakeholders,
  planningCard: fetchPlanningCard,
  starredNotes: fetchStarredNotes,
  ragDocuments: fetchRagDocuments,
  projectInfo: fetchProjectInfo,
  procurementDocs: fetchProcurementDocs,
  attachedDocuments: fetchAttachedDocuments,
};

/** Timeout utility */
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
  );
}

/** Empty result factory for failed fetches */
function emptyResult(moduleName: ModuleName): ModuleResult {
  return {
    moduleName,
    success: false,
    data: null,
    error: 'Module fetch failed or timed out',
    estimatedTokens: 0,
  };
}

/**
 * Assemble project context for any AI generation task.
 * This is the single entry point that all consumers call.
 */
export async function assembleContext(
  request: ContextRequest
): Promise<AssembledContext> {
  const startTime = Date.now();

  // 1. Resolve strategy
  const { requirements } = resolveStrategy(request);

  // 2. Determine modules to fetch
  let moduleRequirements: ModuleRequirement[];
  if (requirements.autoMode) {
    moduleRequirements = resolveAutoModeModules(request.task);
    // Merge with any base modules from the strategy
    for (const baseMod of requirements.modules) {
      if (!moduleRequirements.find((m) => m.module === baseMod.module)) {
        moduleRequirements.push(baseMod);
      }
    }
  } else {
    moduleRequirements = requirements.modules;
  }

  // Honor forceModules override
  if (request.forceModules) {
    moduleRequirements = request.forceModules.map((m) => ({
      module: m,
      level: 'required' as const,
      priority: 7,
    }));
  }

  // 3. Deduplicate module names (variations/invoices share costPlan, milestones shares program)
  const deduplicatedModules = new Map<ModuleName, ModuleRequirement>();
  for (const req of moduleRequirements) {
    const existing = deduplicatedModules.get(req.module);
    if (!existing || existing.priority < req.priority) {
      deduplicatedModules.set(req.module, req);
    }
  }

  // 4. Check cache and fetch missing modules
  const fetchedModules = new Map<ModuleName, ModuleResult>();
  const issues: ContextIssue[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  const modulesToFetch: ModuleName[] = [];

  for (const [moduleName] of deduplicatedModules) {
    const cached = moduleCache.get(request.projectId, moduleName);
    if (cached) {
      fetchedModules.set(moduleName, cached);
      cacheHits++;
    } else {
      modulesToFetch.push(moduleName);
      cacheMisses++;
    }
  }

  // 5. Fetch missing modules in parallel with timeout protection
  if (modulesToFetch.length > 0) {
    const fetchPromises = modulesToFetch.map(async (moduleName) => {
      const fetcher = MODULE_FETCHERS[moduleName];
      if (!fetcher) {
        return { moduleName, result: emptyResult(moduleName) };
      }

      try {
        const params = {
          reportingPeriod: request.reportingPeriod,
          documentIds: request.documentIds,
          stakeholderId: request.stakeholderId,
          noteId: request.noteId,
          query: request.task, // For RAG documents module
        };

        const result = await Promise.race([
          fetcher(request.projectId, params),
          timeout(5000),
        ]);

        return { moduleName, result };
      } catch (err) {
        // Try to use cached fallback
        const cachedFallback = moduleCache.get(
          request.projectId,
          moduleName
        );
        if (cachedFallback) {
          issues.push({
            module: moduleName,
            error: `Fetch failed: ${err instanceof Error ? err.message : err}. Using cached data.`,
            fallback: 'cached',
          });
          return { moduleName, result: cachedFallback };
        }

        issues.push({
          module: moduleName,
          error: `Fetch failed: ${err instanceof Error ? err.message : err}`,
          fallback: 'empty',
        });
        return { moduleName, result: emptyResult(moduleName) };
      }
    });

    const results = await Promise.all(fetchPromises);

    for (const { moduleName, result } of results) {
      fetchedModules.set(moduleName, result);
      if (result.success) {
        moduleCache.set(request.projectId, moduleName, result);
      }
    }
  }

  // 6. Run cross-module intelligence
  const crossModuleInsights = analyzeCrossModulePatterns(fetchedModules);

  // 7. Assign formatting tiers
  const tiers = assignTiers(
    [...deduplicatedModules.values()],
    fetchedModules
  );

  // 8. Format all modules
  const formattedParts: string[] = [];
  for (const [moduleName, result] of fetchedModules) {
    if (!result.success) continue;
    // Skip ragDocuments from moduleContext (it goes to ragContext)
    if (moduleName === 'ragDocuments') continue;
    const tier = tiers.get(moduleName) ?? 'standard';
    const formatted = formatModule(moduleName, result.data, tier);
    if (formatted) formattedParts.push(formatted);
  }

  // 9. Assemble final context
  const modulesFailed = [...fetchedModules.entries()]
    .filter(([, r]) => !r.success)
    .map(([name]) => name);

  const totalTokens = [...fetchedModules.values()].reduce(
    (sum, r) => sum + r.estimatedTokens,
    0
  );

  // Determine the predominant formatting tier
  const tierCounts = { summary: 0, standard: 0, detailed: 0 };
  for (const [, tier] of tiers) {
    tierCounts[tier]++;
  }
  const predominantTier =
    tierCounts.detailed > 0
      ? 'detailed'
      : tierCounts.standard > 0
        ? 'standard'
        : 'summary';

  const ragResult = fetchedModules.get('ragDocuments');

  const assembledContext: AssembledContext = {
    projectSummary: formatProjectSummary(request.projectId, fetchedModules),
    moduleContext: formattedParts.join('\n\n'),
    knowledgeContext: '', // Populated when Pillar 1 domain retrieval is integrated
    ragContext:
      ragResult?.success
        ? formatModule('ragDocuments', ragResult.data, 'standard')
        : '',
    crossModuleInsights: formatCrossModuleInsights(crossModuleInsights),
    issues: issues.length > 0 ? issues : undefined,
    rawModules: fetchedModules,
    metadata: {
      modulesRequested: moduleRequirements.map((m) => m.module),
      modulesFetched: [...fetchedModules.keys()],
      modulesFailed,
      totalEstimatedTokens: totalTokens,
      formattingTier: predominantTier as AssembledContext['metadata']['formattingTier'],
      assemblyTimeMs: Date.now() - startTime,
      cacheHits,
      cacheMisses,
    },
  };

  return assembledContext;
}
