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
import { retrieveFromDomains } from '../rag/retrieval';
import type { DomainRetrievalResult } from '../rag/retrieval';
import { SECTION_TO_DOMAIN_TAGS } from '../constants/knowledge-domains';
import type { ProfileData } from './modules/profile';
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
 * Assemble knowledge domain context from the domain-aware retrieval pipeline.
 * Determines relevant domain tags from the request's sectionKey or explicit domainTags,
 * extracts project profile metadata (type, state) from fetched modules, and formats
 * the retrieval results as a prompt-ready section with source attribution.
 */
async function assembleDomainContext(
  request: ContextRequest,
  fetchedModules: Map<ModuleName, ModuleResult>
): Promise<string> {
  // 1. Determine domain tags: explicit domainTags take priority, else resolve from sectionKey
  const domainTags =
    request.domainTags && request.domainTags.length > 0
      ? request.domainTags
      : request.sectionKey
        ? SECTION_TO_DOMAIN_TAGS[request.sectionKey] ?? []
        : [];

  if (domainTags.length === 0) {
    return '';
  }

  // 2. Extract project profile for type/state filtering
  const profileResult = fetchedModules.get('profile');
  const profileData = profileResult?.success
    ? (profileResult.data as ProfileData | null)
    : null;

  const projectType = profileData?.projectType;
  const state = profileData?.region; // region stores state code (e.g. 'NSW', 'VIC')

  // 3. Call domain retrieval pipeline
  try {
    const results = await retrieveFromDomains(request.task, {
      domainTags,
      projectType,
      state,
      includePrebuilt: true,
      includeOrganization: true,
      topK: 15,
      rerankTopK: 5,
      minRelevanceScore: 0.2,
    });

    if (results.length === 0) {
      return '';
    }

    // 4. Format as a prompt section with source attribution
    const lines: string[] = ['## Knowledge Domain Context'];

    // Group results by domain for cleaner attribution
    const byDomain = new Map<string, DomainRetrievalResult[]>();
    for (const r of results) {
      const key = r.domainName || 'Unknown Domain';
      const group = byDomain.get(key) || [];
      group.push(r);
      byDomain.set(key, group);
    }

    for (const [domainName, domainResults] of byDomain) {
      const firstResult = domainResults[0];
      const typeLabel = firstResult.domainType || 'reference';
      lines.push(`\n### ${domainName} (${typeLabel})`);

      for (const r of domainResults) {
        const sectionLabel = r.sectionTitle ? ` — ${r.sectionTitle}` : '';
        lines.push(`\n**[${r.relevanceScore.toFixed(2)}]${sectionLabel}**`);
        lines.push(r.content);
      }
    }

    return lines.join('\n');
  } catch (error) {
    console.warn('[orchestrator] Domain context assembly failed:', error);
    return '';
  }
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

  // 9. Assemble knowledge domain context (Pillar 1)
  // Default to enabled for report-section; disabled for others unless explicit
  const shouldIncludeDomains =
    request.includeKnowledgeDomains ??
    (request.contextType === 'report-section');

  let knowledgeContext = '';
  if (shouldIncludeDomains) {
    knowledgeContext = await assembleDomainContext(request, fetchedModules);
  }

  // 10. Assemble final context
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
    knowledgeContext,
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
