# Pillar 2: Project Context Orchestrator - Comprehensive Design

**Date**: 2026-02-21
**Status**: Design complete, pending approval
**Depends on**: None (foundation layer consumed by Pillars 3 and 4)

---

## Table of Contents

1. [Problem Statement and Architecture Audit](#1-problem-statement-and-architecture-audit)
2. [New Architecture: `src/lib/context/`](#2-new-architecture-srclibcontext)
3. [Core Interfaces and Type System](#3-core-interfaces-and-type-system)
4. [Context Strategies and Task Routing](#4-context-strategies-and-task-routing)
5. [Module Fetchers: Data Extraction Layer](#5-module-fetchers-data-extraction-layer)
6. [Three-Tier Token Budget Formatter](#6-three-tier-token-budget-formatter)
7. [Cross-Module Intelligence Patterns](#7-cross-module-intelligence-patterns)
8. [Caching Strategy](#8-caching-strategy)
9. [Integration Plan: Wiring Existing Consumers](#9-integration-plan-wiring-existing-consumers)
10. [Edge Cases and Pitfalls](#10-edge-cases-and-pitfalls)
11. [Implementation Approach](#11-implementation-approach)

---

## 1. Problem Statement and Architecture Audit

### 1.1 The Fragmentation Problem

The Assemble.ai codebase contains **five distinct context assembly systems**, each built independently for a specific AI generation feature. They use different data shapes, query different subsets of the database, format context differently, and have no shared infrastructure. The result is:

- **Inconsistent AI quality**: Report section generation does not see cost plan data. TRR generation does not see program milestones. Note generation does not see procurement status. Each AI feature operates with a partial view of the project.
- **Duplicated fetch logic**: Project basics are fetched in 4 different places with 4 different query patterns.
- **Dead code**: A comprehensive 2,600-line orchestrator (`report-context-orchestrator.ts`) was built speculatively but never wired into any consumer.
- **No extensibility**: Adding a new AI feature (Pillar 3 inline instructions, Pillar 4 coaching Q&A) means building yet another bespoke context fetcher.

### 1.2 Complete Mapping of Existing Assembly Points

#### Assembly Point 1: LangGraph RFT Generation Pipeline

**Files:** `src/lib/langgraph/nodes/fetch-planning-context.ts` + `retrieve-context.ts` + `generate-section.ts`

Fetches via `fetchPlanningContext()` from `src/lib/services/planning-context.ts`:
- Project basics (name, code), details (address, zoning, jurisdiction, lot area, stories, building class)
- Project objectives (functional, quality, budget, program)
- Project stages (stage number, name, start/end dates, duration, status)
- Project risks (title, description, likelihood, impact, mitigation, status)
- Stakeholders (name, role, organization, email, phone)
- Consultant disciplines, Contractor trades
- Transmittal documents (optional), RAG document chunks

**Does NOT fetch:** Cost plan data, program activities from PG, procurement tender statuses, profiler data.

**Data source:** PostgreSQL via `db` client + RAG PostgreSQL via `ragDb` client. Formats via `formatPlanningContextForPrompt()`.

#### Assembly Point 2: Meeting/Report Section Generation

**Files:** `src/lib/services/ai-content-generation.ts` + `src/app/api/ai/generate-content/route.ts`

Fetches: Starred notes (filtered by reporting period), procurement docs (RFT, Addenda, TRR, Evaluations), project context (name, address, objectives), existing section content.

**Does NOT fetch:** Cost plan, program, risks, profiler, stakeholder tender statuses, RAG chunks, knowledge domains.

**Data source:** PostgreSQL via `db` client only.

#### Assembly Point 3: Note Content Generation

**Files:** `src/lib/services/note-content-generation.ts` + `src/app/api/ai/generate-note-content/route.ts`

Fetches: Attached documents, project context (name, address, objectives), RAG chunks scoped to attached document IDs (topK=30, rerankTopK=15).

**Does NOT fetch:** Cost plan, program, risks, procurement status, profiler, starred notes.

**Data source:** PostgreSQL via `db` + RAG PostgreSQL via `ragDb`.

#### Assembly Point 4: TRR Generation

**Files:** `src/app/api/trr/[id]/generate/route.ts`

Fetches: TRR record, project details, stakeholder info, evaluation price data, firm data, addenda count.

**Does NOT fetch:** Cost plan, program milestones, procurement risks, profiler, RAG documents.

**Data source:** PostgreSQL only.

#### Assembly Point 5: Report Context Orchestrator (UNUSED)

**Files:** `src/lib/services/report-context-orchestrator.ts`

The most comprehensive fetcher (~2,600 lines). Defines:
- `fetchBriefContext()` -- profile, cost plan, program, risks, procurement, period deltas
- `fetchProcurementContext()` -- tender data, shortlisted/awarded firms, cost lines, procurement deltas
- `fetchCostContext()`, `fetchProgrammeContext()`, `fetchDesignContext()`, `fetchConstructionContext()`
- Rich type system: `ProfilerSummary`, `CostPlanSummary`, `ProgramStatus`, `RiskSummary`, `ProcurementOverview`
- Delta tracking utilities: `ReportingPeriod`, `DeltaItem`, `DeltaSummary`, period comparison functions

**NOT imported or used by any other file.** Built speculatively for Spec 025 but never wired in.

### 1.3 The Fragmentation Matrix

| Data Source | LangGraph RFT | Meeting/Report | Notes | TRR | Report Orchestrator |
|---|:-:|:-:|:-:|:-:|:-:|
| Project basics | Yes (db) | Yes (db) | Yes (db) | Yes (db) | Yes (db) |
| Profiler | -- | -- | -- | -- | Yes |
| Cost plan | -- | -- | -- | -- | Yes |
| Variations | -- | -- | -- | -- | Yes |
| Invoices | -- | -- | -- | -- | Yes |
| Program activities | -- | -- | -- | -- | Yes |
| Program milestones | -- | -- | -- | -- | Yes |
| Risks | Yes (db) | -- | -- | -- | Yes (db) |
| Procurement status | -- | -- | -- | Partial | Yes |
| Starred notes | -- | Yes | -- | -- | -- |
| RAG documents | Yes | -- | Yes | -- | -- |
| Knowledge domains | -- | -- | -- | -- | -- |

### 1.4 Architecture Finding: No Dual-DB Problem

Despite historical references to "SQLite" in code comments, both `db` (from `src/lib/db/index.ts`) and `ragDb` (from `src/lib/db/rag-client.ts`) connect to PostgreSQL. The `db` client uses the main schema (`pg-schema.ts`) while `ragDb` uses the RAG schema (`rag-schema.ts`) with pgvector. They connect to the same PostgreSQL database through two separate drizzle client instances.

This means the orchestrator can access all data through a single database, using the appropriate client for each schema domain.

---

## 2. New Architecture: `src/lib/context/`

### 2.1 Directory Structure

```
src/lib/context/
  types.ts              -- ContextRequest, AssembledContext, ModuleResult interfaces
  orchestrator.ts       -- Main assembleContext() entry point
  strategies.ts         -- Task-type to module-requirements mapping
  formatter.ts          -- Token-budget-aware formatting (summary/standard/detailed tiers)
  cross-module.ts       -- 5 cross-module intelligence patterns
  cache.ts              -- In-memory TTL cache (30s, per projectId:moduleName)
  modules/
    profile.ts          -- From fetchProfilerSummary() in report-context-orchestrator.ts
    cost-plan.ts        -- From fetchCostPlanSummary() + line-item detail
    program.ts          -- From fetchProgramStatus() + milestones
    risks.ts            -- From fetchRiskSummary()
    procurement.ts      -- From fetchProcurementContext()
    stakeholders.ts     -- Team roster from projectStakeholders
    planning-card.ts    -- Wraps existing fetchPlanningContext()
    notes.ts            -- From starred notes fetch logic
    documents.ts        -- Wraps existing retrieve() from rag/retrieval.ts
```

### 2.2 Design Principles

1. **Module fetchers separate data from formatting.** Each module fetcher returns a typed data object. The formatter converts data objects into prompt strings at the appropriate tier (summary/standard/detailed). This allows the same data to serve different token budgets.

2. **Strategies define what modules matter per task.** Each context request type maps to a set of required, relevant, and optional modules with priority weights. This replaces the current pattern where each consumer manually decides what to fetch.

3. **Cross-module intelligence runs on already-fetched data.** The five cross-module patterns (Section 7) analyze relationships between fetched module data without making additional DB queries. They produce insight strings that the AI can use to generate more connected commentary.

4. **Cache is in-memory with 30s TTL.** A simple Map-based cache prevents duplicate fetches in LangGraph loops (which call the same context assembly repeatedly) while invalidating fast enough for interactive use.

5. **Integration is incremental.** Each existing consumer is wired to the orchestrator separately. Existing code is deprecated, not deleted, during the transition. Each integration can be shipped and tested independently.

### 2.3 Relationship to Existing Code

The `report-context-orchestrator.ts` file contains well-tested fetch logic and comprehensive type definitions. The new architecture **refactors** this code into modular fetchers rather than replacing it. Specific extraction paths:

| Source in `report-context-orchestrator.ts` | Target in `src/lib/context/modules/` |
|---|---|
| `fetchProfilerSummary()` (line ~1239) | `modules/profile.ts` |
| `fetchCostPlanSummary()` (line ~1292) | `modules/cost-plan.ts` |
| `fetchProgramStatus()` | `modules/program.ts` |
| `fetchRiskSummary()` | `modules/risks.ts` |
| `fetchProcurementOverview()` + `fetchProcurementContext()` | `modules/procurement.ts` |
| `ReportingPeriod`, `DeltaItem`, `DeltaSummary` types | `types.ts` |
| `formatCurrency()`, `formatPercent()`, `daysUntil()` | `formatter.ts` |

---

## 3. Core Interfaces and Type System

### 3.1 ContextRequest

The entry point for every context assembly call. Callers describe what they need; the orchestrator figures out how to assemble it.

```typescript
// src/lib/context/types.ts

/**
 * Reporting period definition for delta tracking.
 * Reused from report-context-orchestrator.ts.
 */
export interface ReportingPeriod {
  start: string; // ISO date string
  end: string;   // ISO date string
}

/**
 * Context request from any consumer.
 * The orchestrator uses task + contextType + sectionKey to determine
 * which modules to fetch and at what detail level.
 */
export interface ContextRequest {
  /** The project to assemble context for */
  projectId: string;

  /** Free-text description of the task or user question.
   *  Used for auto-mode keyword matching and RAG query embedding. */
  task: string;

  /** The type of AI generation this context supports */
  contextType:
    | 'report-section'      // Meeting/report section generation
    | 'inline-instruction'  // Pillar 3: // commands in editors
    | 'coaching-qa'         // Pillar 4: Ask About This panel
    | 'trr'                 // Tender Recommendation Report
    | 'note'                // Note content generation
    | 'rft';                // LangGraph RFT pipeline

  /** For report-section type: which section (brief, procurement, cost_planning, etc.) */
  sectionKey?: string;

  /** Reporting period for delta/change tracking */
  reportingPeriod?: ReportingPeriod;

  /** Whether to include knowledge domain RAG results */
  includeKnowledgeDomains?: boolean;

  /** Specific domain tags to filter knowledge domain search */
  domainTags?: string[];

  /** For note context: specific document IDs attached to the note */
  documentIds?: string[];

  /** For procurement context: specific stakeholder ID */
  stakeholderId?: string;

  /** Override: explicitly request specific modules regardless of strategy */
  forceModules?: ModuleName[];
}
```

### 3.2 ModuleResult

Each module fetcher returns a typed result with raw data and pre-formatted strings at each tier.

```typescript
/**
 * Module names that the orchestrator can fetch.
 */
export type ModuleName =
  | 'profile'
  | 'costPlan'
  | 'variations'
  | 'invoices'
  | 'program'
  | 'milestones'
  | 'risks'
  | 'procurement'
  | 'stakeholders'
  | 'planningCard'
  | 'starredNotes'
  | 'ragDocuments';

/**
 * Raw data returned by a module fetcher.
 * Each module defines its own data shape (see Section 5).
 */
export interface ModuleResult<T = unknown> {
  /** Module identifier */
  moduleName: ModuleName;

  /** Whether the fetch succeeded */
  success: boolean;

  /** Raw typed data (for cross-module intelligence and programmatic access) */
  data: T;

  /** Error message if fetch failed */
  error?: string;

  /** Approximate token count of the data at standard tier */
  estimatedTokens: number;
}

/**
 * Formatting tier for token budget control.
 */
export type FormattingTier = 'summary' | 'standard' | 'detailed';
```

### 3.3 AssembledContext

The final output that consumers receive. All prompt-ready strings.

```typescript
/**
 * Describes a module that failed or degraded during context assembly.
 * Consumers can inspect this array to understand context completeness.
 */
export interface ContextIssue {
  /** Which module experienced the issue */
  module: ModuleName;
  /** Human-readable error description */
  error: string;
  /** How the orchestrator handled the failure */
  fallback: 'empty' | 'cached' | 'summary';
}

/**
 * Assembled context ready for injection into AI prompts.
 * All fields are pre-formatted strings.
 */
export interface AssembledContext {
  /** One-paragraph project summary (always included) */
  projectSummary: string;

  /** Formatted module context strings, concatenated with headers */
  moduleContext: string;

  /** Knowledge domain RAG results (if requested) */
  knowledgeContext: string;

  /** Document RAG results (if applicable) */
  ragContext: string;

  /** Coaching checklist status hints (for Pillar 4 consumers) */
  coachingHints?: string;

  /** Cross-module insight strings (see Section 7) */
  crossModuleInsights?: string;

  /** Partial context issues: modules that failed or degraded during assembly (see §10.5) */
  issues?: ContextIssue[];

  /** Raw module results for programmatic access by callers that need typed data */
  rawModules: Map<ModuleName, ModuleResult>;

  /** Metadata about the assembly process */
  metadata: {
    modulesRequested: ModuleName[];
    modulesFetched: ModuleName[];
    modulesFailed: ModuleName[];
    totalEstimatedTokens: number;
    formattingTier: FormattingTier;
    assemblyTimeMs: number;
    cacheHits: number;
    cacheMisses: number;
  };
}
```

### 3.4 ModuleRequirements

Defines what modules a strategy needs and at what priority.

```typescript
/**
 * Module requirement levels within a strategy.
 */
export type RequirementLevel = 'required' | 'relevant' | 'optional';

/**
 * Per-module requirement specification.
 */
export interface ModuleRequirement {
  module: ModuleName;
  level: RequirementLevel;
  /** Priority weight (1-10). Higher = formatted at higher tier. */
  priority: number;
}

/**
 * Complete module requirements for a context strategy.
 */
export interface ModuleRequirements {
  /** Modules that must be fetched. Failure of a required module logs a warning
   *  but does not abort assembly. */
  modules: ModuleRequirement[];

  /** If true, use auto-mode keyword matching instead of explicit modules */
  autoMode?: boolean;
}
```

---

## 4. Context Strategies and Task Routing

### 4.1 Strategy Definitions

Each combination of `contextType` and `sectionKey` maps to a set of module requirements. This replaces the current pattern where each consumer manually decides what to fetch.

```typescript
// src/lib/context/strategies.ts

import type { ModuleRequirements, ModuleName } from './types';

/**
 * Strategy map: contextType:sectionKey -> module requirements.
 * The orchestrator looks up the strategy key and fetches accordingly.
 */
export const CONTEXT_STRATEGIES: Record<string, ModuleRequirements> = {

  // ── Report Section Strategies ──────────────────────────────────────

  'report-section:brief': {
    modules: [
      { module: 'profile',      level: 'required', priority: 9 },
      { module: 'costPlan',     level: 'required', priority: 8 },
      { module: 'program',      level: 'required', priority: 7 },
      { module: 'risks',        level: 'required', priority: 7 },
      { module: 'procurement',  level: 'required', priority: 6 },
      { module: 'stakeholders', level: 'relevant', priority: 4 },
    ],
  },

  'report-section:summary': {
    modules: [
      { module: 'profile',      level: 'required', priority: 9 },
      { module: 'costPlan',     level: 'required', priority: 8 },
      { module: 'program',      level: 'required', priority: 7 },
      { module: 'risks',        level: 'required', priority: 7 },
      { module: 'procurement',  level: 'required', priority: 6 },
      { module: 'stakeholders', level: 'relevant', priority: 4 },
    ],
  },

  'report-section:procurement': {
    modules: [
      { module: 'procurement',  level: 'required', priority: 10 },
      { module: 'costPlan',     level: 'required', priority: 7 },
      { module: 'stakeholders', level: 'required', priority: 6 },
      { module: 'risks',        level: 'relevant', priority: 3 },
      { module: 'milestones',   level: 'relevant', priority: 3 },
    ],
  },

  'report-section:cost_planning': {
    modules: [
      { module: 'costPlan',     level: 'required', priority: 10 },
      { module: 'invoices',     level: 'required', priority: 8 },
      { module: 'variations',   level: 'required', priority: 8 },
      { module: 'program',      level: 'relevant', priority: 4 },
      { module: 'profile',      level: 'relevant', priority: 3 },
    ],
  },

  'report-section:programme': {
    modules: [
      { module: 'program',      level: 'required', priority: 10 },
      { module: 'milestones',   level: 'required', priority: 9 },
      { module: 'risks',        level: 'relevant', priority: 5 },
      { module: 'procurement',  level: 'relevant', priority: 3 },
    ],
  },

  'report-section:design': {
    modules: [
      { module: 'stakeholders', level: 'required', priority: 9 },
      { module: 'milestones',   level: 'required', priority: 7 },
      { module: 'procurement',  level: 'relevant', priority: 5 },
      { module: 'profile',      level: 'relevant', priority: 4 },
    ],
  },

  'report-section:construction': {
    modules: [
      { module: 'procurement',  level: 'required', priority: 9 },
      { module: 'invoices',     level: 'required', priority: 8 },
      { module: 'variations',   level: 'required', priority: 8 },
      { module: 'program',      level: 'required', priority: 7 },
      { module: 'milestones',   level: 'relevant', priority: 5 },
      { module: 'risks',        level: 'relevant', priority: 4 },
    ],
  },

  'report-section:planning_authorities': {
    modules: [
      { module: 'stakeholders', level: 'required', priority: 10 },
      { module: 'profile',      level: 'required', priority: 7 },
      { module: 'milestones',   level: 'relevant', priority: 5 },
    ],
  },

  // ── Standalone AI Feature Strategies ───────────────────────────────

  'trr': {
    modules: [
      { module: 'procurement',  level: 'required', priority: 10 },
      { module: 'costPlan',     level: 'required', priority: 8 },
      { module: 'risks',        level: 'relevant', priority: 5 },
      { module: 'program',      level: 'relevant', priority: 4 },
      { module: 'profile',      level: 'relevant', priority: 3 },
    ],
  },

  'rft': {
    modules: [
      { module: 'planningCard', level: 'required', priority: 10 },
      { module: 'costPlan',     level: 'relevant', priority: 5 },
      { module: 'program',      level: 'relevant', priority: 4 },
      { module: 'procurement',  level: 'relevant', priority: 3 },
    ],
  },

  'note': {
    modules: [
      { module: 'starredNotes', level: 'required', priority: 8 },
      { module: 'profile',      level: 'required', priority: 6 },
      { module: 'ragDocuments', level: 'relevant', priority: 5 },
    ],
  },

  // ── Pillar 3 & 4 Strategies ────────────────────────────────────────

  'inline-instruction': {
    autoMode: true,
    modules: [
      { module: 'profile', level: 'required', priority: 5 },
    ],
  },

  'coaching-qa': {
    autoMode: true,
    modules: [
      { module: 'profile', level: 'required', priority: 5 },
    ],
  },
};
```

### 4.2 Strategy Resolution Logic

```typescript
// src/lib/context/strategies.ts (continued)

/**
 * Resolve which strategy to use for a given context request.
 * Returns the strategy key and resolved ModuleRequirements.
 */
export function resolveStrategy(request: ContextRequest): {
  strategyKey: string;
  requirements: ModuleRequirements;
} {
  // Build strategy key
  const key = request.sectionKey
    ? `${request.contextType}:${request.sectionKey}`
    : request.contextType;

  // Look up explicit strategy
  const strategy = CONTEXT_STRATEGIES[key] ?? CONTEXT_STRATEGIES[request.contextType];

  if (!strategy) {
    // Fallback: profile-only strategy for unknown context types
    return {
      strategyKey: key,
      requirements: {
        modules: [{ module: 'profile', level: 'required', priority: 5 }],
      },
    };
  }

  return { strategyKey: key, requirements: strategy };
}
```

### 4.3 Auto-Mode Keyword Matching

For `inline-instruction` and `coaching-qa` context types, the orchestrator infers which modules to fetch based on keywords in the `task` field. This allows the Q&A panel and `//` commands to dynamically pull relevant data without the caller specifying modules.

```typescript
// src/lib/context/strategies.ts (continued)

/**
 * Keyword groups that trigger specific module inclusion in auto mode.
 * Each group maps a set of keywords to modules with priority weights.
 */
const AUTO_MODE_KEYWORDS: Array<{
  keywords: string[];
  modules: Array<{ module: ModuleName; priority: number }>;
}> = [
  {
    keywords: ['cost', 'budget', 'spend', 'expenditure', 'forecast', 'contingency', 'allowance'],
    modules: [
      { module: 'costPlan', priority: 9 },
      { module: 'invoices', priority: 6 },
      { module: 'variations', priority: 6 },
    ],
  },
  {
    keywords: ['risk', 'issue', 'concern', 'mitigation', 'likelihood', 'impact'],
    modules: [
      { module: 'risks', priority: 9 },
    ],
  },
  {
    keywords: ['schedule', 'timeline', 'milestone', 'programme', 'program', 'duration', 'delay',
               'critical path', 'gantt'],
    modules: [
      { module: 'program', priority: 9 },
      { module: 'milestones', priority: 7 },
    ],
  },
  {
    keywords: ['tender', 'procurement', 'contractor', 'consultant', 'rft', 'evaluation', 'award',
               'shortlist', 'firm'],
    modules: [
      { module: 'procurement', priority: 9 },
      { module: 'stakeholders', priority: 5 },
    ],
  },
  {
    keywords: ['invoice', 'claim', 'payment', 'certification', 'progress claim'],
    modules: [
      { module: 'invoices', priority: 9 },
      { module: 'costPlan', priority: 5 },
    ],
  },
  {
    keywords: ['variation', 'change order', 'scope change', 'vo', 'variation order'],
    modules: [
      { module: 'variations', priority: 9 },
      { module: 'costPlan', priority: 5 },
    ],
  },
  {
    keywords: ['stakeholder', 'team', 'discipline', 'trade', 'authority'],
    modules: [
      { module: 'stakeholders', priority: 9 },
    ],
  },
  {
    keywords: ['note', 'minutes', 'meeting', 'action', 'decision'],
    modules: [
      { module: 'starredNotes', priority: 8 },
    ],
  },
];

/**
 * Resolve auto-mode modules based on task keyword matching.
 * Always includes profile. Returns deduplicated module list with highest priority wins.
 */
export function resolveAutoModeModules(task: string): ModuleRequirement[] {
  const taskLower = task.toLowerCase();
  const moduleMap = new Map<ModuleName, { level: RequirementLevel; priority: number }>();

  // Always include profile at base priority
  moduleMap.set('profile', { level: 'required', priority: 5 });

  for (const group of AUTO_MODE_KEYWORDS) {
    const matched = group.keywords.some((kw) => taskLower.includes(kw));
    if (matched) {
      for (const mod of group.modules) {
        const existing = moduleMap.get(mod.module);
        if (!existing || existing.priority < mod.priority) {
          moduleMap.set(mod.module, { level: 'required', priority: mod.priority });
        }
      }
    }
  }

  // If no keywords matched beyond profile, include a broad set at low priority
  if (moduleMap.size === 1) {
    moduleMap.set('costPlan', { level: 'relevant', priority: 3 });
    moduleMap.set('program', { level: 'relevant', priority: 3 });
    moduleMap.set('risks', { level: 'relevant', priority: 3 });
    moduleMap.set('procurement', { level: 'relevant', priority: 3 });
  }

  return Array.from(moduleMap.entries()).map(([module, req]) => ({
    module,
    level: req.level,
    priority: req.priority,
  }));
}
```

---

## 5. Module Fetchers: Data Extraction Layer

### 5.1 Module Fetcher Interface

Every module fetcher follows the same contract: take a project ID and optional parameters, return typed data or an error.

```typescript
// src/lib/context/modules/ -- shared pattern

import { db } from '@/lib/db';
import type { ModuleResult } from '../types';

/**
 * Generic module fetcher function signature.
 * All module fetchers accept projectId + optional params and return ModuleResult<T>.
 */
export type ModuleFetcher<T, P = void> = (
  projectId: string,
  params?: P
) => Promise<ModuleResult<T>>;
```

### 5.2 Profile Module

Extracts from `projectProfiles` table. Provides building class, project type, GFA, storeys, quality tier, complexity score, procurement route, and region.

```typescript
// src/lib/context/modules/profile.ts

import { db } from '@/lib/db';
import { projectProfiles } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProfileData {
  buildingClass: string;
  buildingClassDisplay: string;
  projectType: string;
  projectTypeDisplay: string;
  gfaSqm: number | null;
  storeys: number | null;
  qualityTier: string | null;
  complexityScore: number | null;
  procurementRoute: string | null;
  region: string;
}

const BUILDING_CLASS_DISPLAY: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  institution: 'Institutional',
  mixed: 'Mixed-Use',
  infrastructure: 'Infrastructure',
  agricultural: 'Agricultural',
  defense_secure: 'Defense & Secure',
};

const PROJECT_TYPE_DISPLAY: Record<string, string> = {
  refurb: 'Refurbishment',
  extend: 'Extension',
  new: 'New Build',
  remediation: 'Remediation',
  advisory: 'Advisory',
};

export async function fetchProfile(projectId: string): Promise<ModuleResult<ProfileData | null>> {
  try {
    const profile = await db.query.projectProfiles.findFirst({
      where: eq(projectProfiles.projectId, projectId),
    });

    if (!profile) {
      return { moduleName: 'profile', success: true, data: null, estimatedTokens: 0 };
    }

    // Parse scale data JSON for GFA and storeys
    let gfaSqm: number | null = null;
    let storeys: number | null = null;
    try {
      const scaleData = JSON.parse(profile.scaleData || '{}');
      gfaSqm = scaleData.gfa_sqm ?? scaleData.gfaSqm ?? null;
      storeys = scaleData.levels ?? scaleData.storeys ?? null;
    } catch { /* ignore parse errors */ }

    // Parse complexity data for quality tier and procurement route
    let qualityTier: string | null = null;
    let procurementRoute: string | null = null;
    try {
      const complexityData = JSON.parse(profile.complexity || '{}');
      qualityTier = complexityData.quality ?? complexityData.qualityTier ?? null;
      procurementRoute = complexityData.procurement_route ?? complexityData.procurementRoute ?? null;
    } catch { /* ignore parse errors */ }

    const buildingClass = profile.buildingClass ?? '';
    const projectType = profile.projectType ?? '';

    const data: ProfileData = {
      buildingClass,
      buildingClassDisplay: BUILDING_CLASS_DISPLAY[buildingClass] ?? buildingClass,
      projectType,
      projectTypeDisplay: PROJECT_TYPE_DISPLAY[projectType] ?? projectType,
      gfaSqm,
      storeys,
      qualityTier,
      complexityScore: profile.complexityScore ?? null,
      procurementRoute,
      region: profile.region ?? 'AU',
    };

    return { moduleName: 'profile', success: true, data, estimatedTokens: 80 };
  } catch (error) {
    return {
      moduleName: 'profile',
      success: false,
      data: null,
      error: `Profile fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

### 5.3 Cost Plan Module

Extracts from `costLines`, `variations`, and `invoices` tables. Provides section-grouped line items, totals, contingency status, and period deltas.

```typescript
// src/lib/context/modules/cost-plan.ts

import { db } from '@/lib/db';
import { costLines, variations, invoices } from '@/lib/db/pg-schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { ModuleResult, ReportingPeriod } from '../types';

export interface CostPlanData {
  totalBudgetCents: number;
  totalForecastCents: number;
  totalApprovedContractCents: number;
  totalInvoicedCents: number;
  varianceCents: number;
  variancePercent: number;
  contingency: {
    budgetCents: number;
    usedCents: number;
    remainingCents: number;
    percentRemaining: number;
  };
  linesBySection: Record<string, CostLineData[]>;
  variationsSummary: {
    pendingCount: number;
    pendingValueCents: number;
    approvedCount: number;
    approvedValueCents: number;
  };
  invoicesSummary: {
    totalCount: number;
    totalValueCents: number;
    thisPeriodCount: number;
    thisPeriodValueCents: number;
  };
}

export interface CostLineData {
  id: string;
  section: string;
  activity: string;
  budgetCents: number;
  approvedContractCents: number;
  forecastCents: number;
  varianceCents: number;
}

export interface CostPlanFetchParams {
  reportingPeriod?: ReportingPeriod;
}

export async function fetchCostPlan(
  projectId: string,
  params?: CostPlanFetchParams
): Promise<ModuleResult<CostPlanData>> {
  try {
    // Fetch all active cost lines
    const lines = await db.select()
      .from(costLines)
      .where(and(eq(costLines.projectId, projectId), isNull(costLines.deletedAt)));

    // Calculate totals and group by section
    let totalBudgetCents = 0;
    let totalApprovedCents = 0;
    let contingencyBudgetCents = 0;
    const linesBySection: Record<string, CostLineData[]> = {};

    for (const line of lines) {
      const budget = line.budgetCents ?? 0;
      const approved = line.approvedContractCents ?? 0;
      totalBudgetCents += budget;
      totalApprovedCents += approved;

      if (line.section === 'CONTINGENCY') {
        contingencyBudgetCents += budget;
      }

      const section = line.section ?? 'OTHER';
      if (!linesBySection[section]) linesBySection[section] = [];
      linesBySection[section].push({
        id: line.id,
        section,
        activity: line.activity ?? '',
        budgetCents: budget,
        approvedContractCents: approved,
        forecastCents: line.forecastCents ?? budget,
        varianceCents: (line.forecastCents ?? budget) - budget,
      });
    }

    // Fetch variations
    const variationsList = await db.select()
      .from(variations)
      .where(and(eq(variations.projectId, projectId), isNull(variations.deletedAt)));

    let pendingCount = 0, pendingValueCents = 0;
    let approvedCount = 0, approvedValueCents = 0;
    let totalVariationsForecastCents = 0;

    for (const v of variationsList) {
      totalVariationsForecastCents += v.amountForecastCents ?? 0;
      if (v.status === 'Approved') {
        approvedCount++;
        approvedValueCents += v.amountApprovedCents ?? 0;
      } else {
        pendingCount++;
        pendingValueCents += v.amountForecastCents ?? 0;
      }
    }

    // Fetch invoices
    const invoicesList = await db.select()
      .from(invoices)
      .where(and(eq(invoices.projectId, projectId), isNull(invoices.deletedAt)));

    let totalInvoicedCents = 0;
    let thisPeriodCount = 0, thisPeriodValueCents = 0;

    for (const inv of invoicesList) {
      const amount = inv.amountCents ?? 0;
      totalInvoicedCents += amount;

      if (params?.reportingPeriod && inv.createdAt) {
        const date = new Date(inv.createdAt);
        const start = new Date(params.reportingPeriod.start);
        const end = new Date(params.reportingPeriod.end);
        if (date >= start && date <= end) {
          thisPeriodCount++;
          thisPeriodValueCents += amount;
        }
      }
    }

    const totalForecastCents = totalApprovedCents + totalVariationsForecastCents;
    const varianceCents = totalForecastCents - totalBudgetCents;
    const variancePercent = totalBudgetCents > 0
      ? ((totalForecastCents - totalBudgetCents) / totalBudgetCents) * 100
      : 0;

    const contingencyUsedCents = approvedValueCents; // Simplified: approved variations draw contingency
    const contingencyRemainingCents = contingencyBudgetCents - contingencyUsedCents;

    const data: CostPlanData = {
      totalBudgetCents,
      totalForecastCents,
      totalApprovedContractCents: totalApprovedCents,
      totalInvoicedCents,
      varianceCents,
      variancePercent,
      contingency: {
        budgetCents: contingencyBudgetCents,
        usedCents: contingencyUsedCents,
        remainingCents: contingencyRemainingCents,
        percentRemaining: contingencyBudgetCents > 0
          ? (contingencyRemainingCents / contingencyBudgetCents) * 100
          : 0,
      },
      linesBySection,
      variationsSummary: { pendingCount, pendingValueCents, approvedCount, approvedValueCents },
      invoicesSummary: {
        totalCount: invoicesList.length,
        totalValueCents: totalInvoicedCents,
        thisPeriodCount,
        thisPeriodValueCents,
      },
    };

    // Token estimate: ~30 tokens base + ~15 per cost line
    const estimatedTokens = 30 + lines.length * 15;

    return { moduleName: 'costPlan', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'costPlan',
      success: false,
      data: {} as CostPlanData,
      error: `Cost plan fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

### 5.4 Program Module

Extracts from `programActivities` and `programMilestones` tables.

```typescript
// src/lib/context/modules/program.ts

import { db } from '@/lib/db';
import { programActivities, programMilestones } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProgramData {
  totalActivities: number;
  completedActivities: number;
  percentComplete: number;
  activities: ProgramActivityData[];
  milestones: ProgramMilestoneData[];
  nextMilestone: ProgramMilestoneData | null;
  criticalPathActivities: ProgramActivityData[];
}

export interface ProgramActivityData {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  percentComplete: number;
  isCriticalPath: boolean;
}

export interface ProgramMilestoneData {
  id: string;
  name: string;
  date: string;
  activityName: string | null;
  daysUntil: number;
}

export async function fetchProgram(projectId: string): Promise<ModuleResult<ProgramData>> {
  try {
    const [activities, milestones] = await Promise.all([
      db.select().from(programActivities).where(eq(programActivities.projectId, projectId)),
      db.select().from(programMilestones).where(eq(programMilestones.projectId, projectId)),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityData: ProgramActivityData[] = activities.map((a) => ({
      id: a.id,
      name: a.name ?? '',
      startDate: a.startDate ? new Date(a.startDate).toISOString() : null,
      endDate: a.endDate ? new Date(a.endDate).toISOString() : null,
      percentComplete: a.percentComplete ?? 0,
      isCriticalPath: a.isCriticalPath ?? false,
    }));

    const milestoneData: ProgramMilestoneData[] = milestones.map((m) => {
      const mDate = new Date(m.date ?? today);
      const daysUntil = Math.ceil((mDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: m.id,
        name: m.name ?? '',
        date: mDate.toISOString(),
        activityName: m.activityId ?? null, // Resolve if needed
        daysUntil,
      };
    });

    // Sort milestones by date, find next upcoming
    const upcomingMilestones = milestoneData
      .filter((m) => m.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const completedCount = activityData.filter((a) => a.percentComplete >= 100).length;
    const totalPercent = activityData.length > 0
      ? activityData.reduce((sum, a) => sum + a.percentComplete, 0) / activityData.length
      : 0;

    const data: ProgramData = {
      totalActivities: activityData.length,
      completedActivities: completedCount,
      percentComplete: Math.round(totalPercent),
      activities: activityData,
      milestones: milestoneData,
      nextMilestone: upcomingMilestones[0] ?? null,
      criticalPathActivities: activityData.filter((a) => a.isCriticalPath),
    };

    const estimatedTokens = 20 + activityData.length * 12 + milestoneData.length * 8;

    return { moduleName: 'program', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'program',
      success: false,
      data: {} as ProgramData,
      error: `Program fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

### 5.5 Risks Module

Extracts from `risks` table (legacy schema) or `projectStakeholders` risk records.

```typescript
// src/lib/context/modules/risks.ts

import { db } from '@/lib/db';
import { risks } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult, ReportingPeriod } from '../types';

export interface RisksData {
  totalCount: number;
  byStatus: { identified: number; mitigated: number; closed: number };
  bySeverity: { high: number; medium: number; low: number };
  topActiveRisks: Array<{
    id: string;
    title: string;
    description: string | null;
    likelihood: string | null;
    impact: string | null;
    mitigation: string | null;
    status: string;
    severity: string;
  }>;
}

export interface RisksFetchParams {
  reportingPeriod?: ReportingPeriod;
}

function calculateSeverity(likelihood: string | null, impact: string | null): string {
  const likelihoodScore = { high: 3, medium: 2, low: 1 }[likelihood ?? 'low'] ?? 1;
  const impactScore = { high: 3, medium: 2, low: 1 }[impact ?? 'low'] ?? 1;
  const score = likelihoodScore * impactScore;
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

export async function fetchRisks(
  projectId: string,
  params?: RisksFetchParams
): Promise<ModuleResult<RisksData>> {
  try {
    const riskRows = await db.select()
      .from(risks)
      .where(eq(risks.projectId, projectId));

    const byStatus = { identified: 0, mitigated: 0, closed: 0 };
    const bySeverity = { high: 0, medium: 0, low: 0 };

    const enrichedRisks = riskRows.map((r) => {
      const status = (r.status ?? 'identified') as keyof typeof byStatus;
      const severity = calculateSeverity(r.likelihood, r.impact);

      if (byStatus[status] !== undefined) byStatus[status]++;
      if (bySeverity[severity as keyof typeof bySeverity] !== undefined) {
        bySeverity[severity as keyof typeof bySeverity]++;
      }

      return {
        id: r.id,
        title: r.title ?? '',
        description: r.description ?? null,
        likelihood: r.likelihood ?? null,
        impact: r.impact ?? null,
        mitigation: r.mitigation ?? null,
        status: status,
        severity,
      };
    });

    // Top active risks: identified or mitigated, sorted by severity
    const activeRisks = enrichedRisks
      .filter((r) => r.status !== 'closed')
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return (severityOrder[a.severity as keyof typeof severityOrder] ?? 2)
             - (severityOrder[b.severity as keyof typeof severityOrder] ?? 2);
      });

    const data: RisksData = {
      totalCount: riskRows.length,
      byStatus,
      bySeverity,
      topActiveRisks: activeRisks.slice(0, 10),
    };

    const estimatedTokens = 15 + activeRisks.length * 20;

    return { moduleName: 'risks', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'risks',
      success: false,
      data: {} as RisksData,
      error: `Risks fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

### 5.6 Procurement Module

Extracts from `projectStakeholders`, `stakeholderTenderStatuses`, `consultants`, and `contractors` tables.

```typescript
// src/lib/context/modules/procurement.ts

import { db } from '@/lib/db';
import {
  projectStakeholders,
  stakeholderTenderStatuses,
  consultants,
  contractors,
} from '@/lib/db/pg-schema';
import { eq, and } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProcurementData {
  consultants: StakeholderProcurementData[];
  contractors: StakeholderProcurementData[];
  overview: {
    consultantsTotal: number;
    consultantsAwarded: number;
    consultantsTendered: number;
    consultantsBriefed: number;
    contractorsTotal: number;
    contractorsAwarded: number;
    contractorsTendered: number;
    contractorsBriefed: number;
  };
  shortlistedFirms: Array<{
    firmName: string;
    disciplineOrTrade: string;
    type: 'consultant' | 'contractor';
  }>;
  awardedFirms: Array<{
    firmName: string;
    disciplineOrTrade: string;
    value: number | null;
    type: 'consultant' | 'contractor';
  }>;
}

export interface StakeholderProcurementData {
  id: string;
  name: string;
  group: string;
  currentStatus: string | null;
  awardedFirm: string | null;
  awardedValue: number | null;
  firmCount: number;
}

export async function fetchProcurement(
  projectId: string
): Promise<ModuleResult<ProcurementData>> {
  try {
    // Fetch stakeholders with their tender statuses
    const stakeholders = await db.select()
      .from(projectStakeholders)
      .where(eq(projectStakeholders.projectId, projectId));

    const consultantStakeholders: StakeholderProcurementData[] = [];
    const contractorStakeholders: StakeholderProcurementData[] = [];
    const shortlistedFirms: ProcurementData['shortlistedFirms'] = [];
    const awardedFirms: ProcurementData['awardedFirms'] = [];

    let cTotal = 0, cAwarded = 0, cTendered = 0, cBriefed = 0;
    let tTotal = 0, tAwarded = 0, tTendered = 0, tBriefed = 0;

    for (const s of stakeholders) {
      if (s.group !== 'consultant' && s.group !== 'contractor') continue;

      // Fetch tender status for this stakeholder
      const tenderStatus = await db.query.stakeholderTenderStatuses.findFirst({
        where: eq(stakeholderTenderStatuses.stakeholderId, s.id),
      });

      const status = tenderStatus?.status ?? null;
      const entry: StakeholderProcurementData = {
        id: s.id,
        name: s.name ?? '',
        group: s.group,
        currentStatus: status,
        awardedFirm: null,
        awardedValue: null,
        firmCount: 0,
      };

      if (s.group === 'consultant') {
        consultantStakeholders.push(entry);
        cTotal++;
        if (status === 'award') cAwarded++;
        else if (status === 'tender' || status === 'rec') cTendered++;
        else cBriefed++;
      } else {
        contractorStakeholders.push(entry);
        tTotal++;
        if (status === 'award') tAwarded++;
        else if (status === 'tender' || status === 'rec') tTendered++;
        else tBriefed++;
      }
    }

    const data: ProcurementData = {
      consultants: consultantStakeholders,
      contractors: contractorStakeholders,
      overview: {
        consultantsTotal: cTotal, consultantsAwarded: cAwarded,
        consultantsTendered: cTendered, consultantsBriefed: cBriefed,
        contractorsTotal: tTotal, contractorsAwarded: tAwarded,
        contractorsTendered: tTendered, contractorsBriefed: tBriefed,
      },
      shortlistedFirms,
      awardedFirms,
    };

    const estimatedTokens = 30 + (cTotal + tTotal) * 15;

    return { moduleName: 'procurement', success: true, data, estimatedTokens };
  } catch (error) {
    return {
      moduleName: 'procurement',
      success: false,
      data: {} as ProcurementData,
      error: `Procurement fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
```

### 5.7 Remaining Module Fetchers (Summary)

The following modules follow the same pattern. Their implementations are straightforward extractions from existing code:

| Module | Source Table(s) | Key Data Points | Token Estimate |
|---|---|---|---|
| `stakeholders` | `projectStakeholders`, `stakeholderTenderStatuses`, `stakeholderSubmissionStatuses` | Team roster by group, tender status per discipline/trade, submission status per authority | ~20 + 10/stakeholder |
| `planningCard` | Wraps `fetchPlanningContext()` from `src/lib/services/planning-context.ts` | Project details, objectives, stages, risks, stakeholders, disciplines, trades | ~200 (fixed, comprehensive) |
| `starredNotes` | `notes` table (filtered by `isStarred` and reporting period) | Note title, content, creation date | ~15 + 30/note |
| `ragDocuments` | Wraps `retrieve()` from `src/lib/rag/retrieval.ts` | Document chunks with relevance scores, section titles, hierarchy paths | ~20 + 50/chunk |
| `variations` | `variations` table | Standalone variation detail (separate from cost plan summary) | ~10 + 15/variation |
| `invoices` | `invoices` table | Standalone invoice detail (separate from cost plan summary) | ~10 + 12/invoice |
| `milestones` | `programMilestones` table | Standalone milestone list (separate from full program) | ~10 + 8/milestone |

---

## 6. Three-Tier Token Budget Formatter

### 6.1 Tier Definitions

The formatter converts raw module data into prompt-ready strings at three detail levels. The tier is selected per-module based on the strategy's priority weights and the total available token budget.

| Tier | Tokens/Module (approx.) | When Used | Content |
|---|---|---|---|
| **Summary** | ~200 | Tight contexts, many modules loaded, module is `optional` | Key metrics only. One-line summaries per category. No line-item detail. |
| **Standard** | ~500 | Default for most generation tasks, module is `relevant` | Structured summaries with section breakdowns. Top items listed. Enough for informed commentary. |
| **Detailed** | ~1,000+ | Module is the primary focus (`required` with priority >= 8), few modules loaded | Full line-item detail where relevant. All active items listed. Period deltas included. |

### 6.2 Tier Selection Algorithm

```typescript
// src/lib/context/formatter.ts

import type { ModuleResult, ModuleRequirement, FormattingTier, ModuleName } from './types';

/**
 * Maximum total tokens for all module context combined.
 * Claude 3.5 Sonnet has 200k context; we budget ~8k for project context
 * to leave room for system prompt, RAG, user content, and generation.
 */
const MAX_CONTEXT_TOKENS = 8000;

/**
 * Determine formatting tier for each module based on priority and total module count.
 */
export function assignTiers(
  requirements: ModuleRequirement[],
  fetchedModules: Map<ModuleName, ModuleResult>
): Map<ModuleName, FormattingTier> {
  const tiers = new Map<ModuleName, FormattingTier>();
  const sortedByPriority = [...requirements].sort((a, b) => b.priority - a.priority);

  // Calculate available budget per module
  const moduleCount = fetchedModules.size;
  const avgBudget = MAX_CONTEXT_TOKENS / Math.max(moduleCount, 1);

  for (const req of sortedByPriority) {
    if (!fetchedModules.has(req.module)) continue;

    if (req.priority >= 8 && moduleCount <= 4) {
      tiers.set(req.module, 'detailed');
    } else if (req.priority >= 5 || req.level === 'required') {
      tiers.set(req.module, 'standard');
    } else {
      tiers.set(req.module, 'summary');
    }
  }

  // Validate total doesn't exceed budget
  // If it does, downgrade lowest-priority modules
  let estimatedTotal = 0;
  const tierTokenEstimates: Record<FormattingTier, number> = {
    summary: 200,
    standard: 500,
    detailed: 1000,
  };

  for (const [, tier] of tiers) {
    estimatedTotal += tierTokenEstimates[tier];
  }

  if (estimatedTotal > MAX_CONTEXT_TOKENS) {
    // Downgrade from lowest priority upward until within budget
    const reverseOrder = [...sortedByPriority].reverse();
    for (const req of reverseOrder) {
      if (estimatedTotal <= MAX_CONTEXT_TOKENS) break;
      const currentTier = tiers.get(req.module);
      if (currentTier === 'detailed') {
        tiers.set(req.module, 'standard');
        estimatedTotal -= 500; // 1000 -> 500
      } else if (currentTier === 'standard') {
        tiers.set(req.module, 'summary');
        estimatedTotal -= 300; // 500 -> 200
      }
    }
  }

  return tiers;
}
```

### 6.3 Module Formatting Functions

Each module has a `format` function that accepts data and a tier, returning a string.

```typescript
// src/lib/context/formatter.ts (continued)

/**
 * Format currency amount (cents to dollars with AUD formatting).
 * Reused from report-context-orchestrator.ts.
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(dollars));
}

/**
 * Format cost plan data at the specified tier.
 */
export function formatCostPlan(data: CostPlanData, tier: FormattingTier): string {
  if (tier === 'summary') {
    return [
      `## Cost Plan Summary`,
      `Budget: ${formatCurrency(data.totalBudgetCents)} | ` +
      `Forecast: ${formatCurrency(data.totalForecastCents)} | ` +
      `Variance: ${data.variancePercent.toFixed(1)}%`,
      `Contingency remaining: ${data.contingency.percentRemaining.toFixed(0)}%`,
      `Variations: ${data.variationsSummary.approvedCount} approved, ` +
      `${data.variationsSummary.pendingCount} pending`,
      `Invoiced: ${formatCurrency(data.invoicesSummary.totalValueCents)}`,
    ].join('\n');
  }

  if (tier === 'standard') {
    const lines = [
      `## Cost Plan`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Budget | ${formatCurrency(data.totalBudgetCents)} |`,
      `| Approved Contracts | ${formatCurrency(data.totalApprovedContractCents)} |`,
      `| Current Forecast | ${formatCurrency(data.totalForecastCents)} |`,
      `| Budget Variance | ${formatCurrency(data.varianceCents)} (${data.variancePercent.toFixed(1)}%) |`,
      `| Total Invoiced | ${formatCurrency(data.invoicesSummary.totalValueCents)} |`,
      ``,
      `### Contingency`,
      `Budget: ${formatCurrency(data.contingency.budgetCents)} | ` +
      `Used: ${formatCurrency(data.contingency.usedCents)} | ` +
      `Remaining: ${data.contingency.percentRemaining.toFixed(0)}%`,
      ``,
      `### Variations`,
      `Approved: ${data.variationsSummary.approvedCount} (${formatCurrency(data.variationsSummary.approvedValueCents)})`,
      `Pending: ${data.variationsSummary.pendingCount} (${formatCurrency(data.variationsSummary.pendingValueCents)})`,
    ];

    // Add section totals
    for (const [section, sectionLines] of Object.entries(data.linesBySection)) {
      const sectionBudget = sectionLines.reduce((s, l) => s + l.budgetCents, 0);
      const sectionForecast = sectionLines.reduce((s, l) => s + l.forecastCents, 0);
      lines.push(`\n**${section}**: ${sectionLines.length} lines, ` +
        `Budget ${formatCurrency(sectionBudget)}, Forecast ${formatCurrency(sectionForecast)}`);
    }

    return lines.join('\n');
  }

  // Detailed tier: full line-item listing
  const lines = [
    `## Cost Plan (Detailed)`,
    // ... (standard tier content first) ...
  ];

  // Add every cost line
  for (const [section, sectionLines] of Object.entries(data.linesBySection)) {
    lines.push(`\n### ${section}`);
    lines.push(`| Activity | Budget | Approved | Forecast | Variance |`);
    lines.push(`|----------|--------|----------|----------|----------|`);
    for (const cl of sectionLines) {
      lines.push(
        `| ${cl.activity} | ${formatCurrency(cl.budgetCents)} | ` +
        `${formatCurrency(cl.approvedContractCents)} | ` +
        `${formatCurrency(cl.forecastCents)} | ` +
        `${formatCurrency(cl.varianceCents)} |`
      );
    }
  }

  return lines.join('\n');
}

// Similar format functions exist for each module:
// formatProfile(), formatProgram(), formatRisks(), formatProcurement(),
// formatStakeholders(), formatNotes(), formatRagDocuments()
```

---

## 7. Cross-Module Intelligence Patterns

### 7.1 Design Principle

Cross-module intelligence detects meaningful relationships **between** module datasets. These patterns run on data already in memory from module fetches -- they do not make additional database queries. Their output is a set of insight strings that the AI can use to produce more connected, holistic commentary.

### 7.2 The Five Patterns

```typescript
// src/lib/context/cross-module.ts

import type { ModuleResult, ModuleName } from './types';
import type { CostPlanData } from './modules/cost-plan';
import type { ProgramData } from './modules/program';
import type { RisksData } from './modules/risks';
import type { ProcurementData } from './modules/procurement';

/**
 * Cross-module insight with source attribution.
 */
export interface CrossModuleInsight {
  pattern: string;
  modules: ModuleName[];
  severity: 'info' | 'warning' | 'critical';
  insight: string;
}

/**
 * Run all applicable cross-module intelligence patterns on fetched data.
 * Only runs patterns where both source modules have been successfully fetched.
 */
export function analyzeCrossModulePatterns(
  modules: Map<ModuleName, ModuleResult>
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  // Pattern 1: Variation -> Program Impact
  const costPlan = modules.get('costPlan') as ModuleResult<CostPlanData> | undefined;
  const program = modules.get('program') as ModuleResult<ProgramData> | undefined;

  if (costPlan?.success && program?.success) {
    insights.push(...analyzeVariationProgramImpact(costPlan.data, program.data));
  }

  // Pattern 2: Procurement Delay -> Cost Forecasting
  const procurement = modules.get('procurement') as ModuleResult<ProcurementData> | undefined;

  if (procurement?.success && costPlan?.success) {
    insights.push(...analyzeProcurementCostImpact(procurement.data, costPlan.data));
  }

  // Pattern 3: Risk -> Cost Line
  const risksResult = modules.get('risks') as ModuleResult<RisksData> | undefined;

  if (risksResult?.success && costPlan?.success) {
    insights.push(...analyzeRiskCostLinks(risksResult.data, costPlan.data));
  }

  // Pattern 4: Invoice -> Program Progress
  if (costPlan?.success && program?.success) {
    insights.push(...analyzeInvoiceProgramAlignment(costPlan.data, program.data));
  }

  // Pattern 5: Stakeholder -> Milestone
  if (procurement?.success && program?.success) {
    insights.push(...analyzeStakeholderMilestoneReadiness(procurement.data, program.data));
  }

  return insights;
}
```

#### Pattern 1: Variation -> Program Impact

Variations flagged as timeline-impacting are cross-referenced with upcoming milestones to detect schedule risk from cost changes.

```typescript
/**
 * Pattern 1: Detect when approved/pending variations may impact program milestones.
 * If there are significant pending variations alongside upcoming milestones,
 * flag the risk of scope creep causing delays.
 */
function analyzeVariationProgramImpact(
  costPlan: CostPlanData,
  program: ProgramData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const pendingValue = costPlan.variationsSummary.pendingValueCents;
  const totalBudget = costPlan.totalBudgetCents;

  // If pending variations exceed 5% of budget and there are milestones within 30 days
  if (totalBudget > 0 && (pendingValue / totalBudget) > 0.05) {
    const nearMilestones = program.milestones.filter((m) => m.daysUntil >= 0 && m.daysUntil <= 30);

    if (nearMilestones.length > 0) {
      const milestoneNames = nearMilestones.map((m) => m.name).join(', ');
      insights.push({
        pattern: 'variation-program-impact',
        modules: ['costPlan', 'program'],
        severity: 'warning',
        insight: `Pending variations total ${formatCurrency(pendingValue)} ` +
          `(${((pendingValue / totalBudget) * 100).toFixed(1)}% of budget) with ` +
          `${nearMilestones.length} milestone(s) due within 30 days (${milestoneNames}). ` +
          `Unresolved variations may impact program if scope changes require additional time.`,
      });
    }
  }

  return insights;
}
```

#### Pattern 2: Procurement Delay -> Cost Forecasting

Tender stages behind schedule affect forecast confidence. If disciplines are still in Brief or Tender stage while the program shows construction approaching, flag the gap.

```typescript
/**
 * Pattern 2: Detect when procurement delays may affect cost forecast reliability.
 * Unawarded trades/disciplines reduce forecast accuracy because budget figures
 * are estimates, not contracted amounts.
 */
function analyzeProcurementCostImpact(
  procurement: ProcurementData,
  costPlan: CostPlanData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const totalStakeholders = procurement.overview.consultantsTotal + procurement.overview.contractorsTotal;
  const totalAwarded = procurement.overview.consultantsAwarded + procurement.overview.contractorsAwarded;

  if (totalStakeholders > 0 && totalAwarded < totalStakeholders * 0.5) {
    const unawardedPercent = ((totalStakeholders - totalAwarded) / totalStakeholders * 100).toFixed(0);
    insights.push({
      pattern: 'procurement-cost-impact',
      modules: ['procurement', 'costPlan'],
      severity: 'warning',
      insight: `${unawardedPercent}% of disciplines/trades are not yet awarded ` +
        `(${totalStakeholders - totalAwarded} of ${totalStakeholders}). ` +
        `Cost forecast of ${formatCurrency(costPlan.totalForecastCents)} relies on ` +
        `budget estimates rather than contracted amounts for these items. ` +
        `Forecast confidence is reduced until procurement advances.`,
    });
  }

  return insights;
}
```

#### Pattern 3: Risk -> Cost Line

Risk items with cost impact keywords are linked to cost plan sections to provide specific cost exposure context.

```typescript
/**
 * Pattern 3: Link risk items to cost plan sections based on keyword matching.
 * Provides the AI with specific cost exposure for flagged risks.
 */
function analyzeRiskCostLinks(
  risksData: RisksData,
  costPlan: CostPlanData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  const costKeywords: Record<string, string[]> = {
    CONSTRUCTION: ['construction', 'build', 'contractor', 'trade', 'site'],
    CONSULTANTS: ['consultant', 'design', 'engineer', 'architect', 'fees'],
    CONTINGENCY: ['contingency', 'unforeseen', 'risk allowance'],
    FEES: ['fee', 'authority', 'council', 'approval'],
  };

  for (const risk of risksData.topActiveRisks.slice(0, 5)) {
    if (risk.severity !== 'high') continue;

    const riskText = `${risk.title} ${risk.description ?? ''}`.toLowerCase();

    for (const [section, keywords] of Object.entries(costKeywords)) {
      if (keywords.some((kw) => riskText.includes(kw))) {
        const sectionLines = costPlan.linesBySection[section];
        if (sectionLines) {
          const sectionBudget = sectionLines.reduce((s, l) => s + l.budgetCents, 0);
          insights.push({
            pattern: 'risk-cost-link',
            modules: ['risks', 'costPlan'],
            severity: 'info',
            insight: `High-severity risk "${risk.title}" may affect the ${section} section ` +
              `(${sectionLines.length} lines, budget ${formatCurrency(sectionBudget)}). ` +
              `Consider whether contingency allocation covers this exposure.`,
          });
        }
        break; // One link per risk
      }
    }
  }

  return insights;
}
```

#### Pattern 4: Invoice -> Program Progress

Invoice certification percentage is compared against program completion percentage to detect alignment gaps.

```typescript
/**
 * Pattern 4: Compare invoicing progress against program completion.
 * A significant gap may indicate over-claiming or under-billing.
 */
function analyzeInvoiceProgramAlignment(
  costPlan: CostPlanData,
  program: ProgramData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  if (costPlan.totalApprovedContractCents === 0 || program.percentComplete === 0) {
    return insights; // Not enough data for meaningful comparison
  }

  const invoicedPercent = (costPlan.totalInvoicedCents / costPlan.totalApprovedContractCents) * 100;
  const programPercent = program.percentComplete;
  const gap = Math.abs(invoicedPercent - programPercent);

  if (gap > 15) {
    const direction = invoicedPercent > programPercent ? 'ahead of' : 'behind';
    insights.push({
      pattern: 'invoice-program-alignment',
      modules: ['costPlan', 'program'],
      severity: gap > 25 ? 'warning' : 'info',
      insight: `Invoicing progress (${invoicedPercent.toFixed(0)}% of approved contracts claimed) ` +
        `is ${direction} program completion (${programPercent}%). ` +
        `A gap of ${gap.toFixed(0)}% may indicate ` +
        `${invoicedPercent > programPercent ? 'front-loaded claiming' : 'uncertified works'}.`,
    });
  }

  return insights;
}
```

#### Pattern 5: Stakeholder -> Milestone

Checks whether consultants/contractors are appointed before their services are needed according to program milestones.

```typescript
/**
 * Pattern 5: Check if stakeholder appointments align with upcoming milestones.
 * Unappointed disciplines with upcoming milestones create delivery risk.
 */
function analyzeStakeholderMilestoneReadiness(
  procurement: ProcurementData,
  program: ProgramData
): CrossModuleInsight[] {
  const insights: CrossModuleInsight[] = [];

  // Find unappointed stakeholders
  const unappointed = [
    ...procurement.consultants.filter((c) => c.currentStatus !== 'award'),
    ...procurement.contractors.filter((c) => c.currentStatus !== 'award'),
  ];

  // Find milestones within 60 days
  const nearMilestones = program.milestones.filter(
    (m) => m.daysUntil >= 0 && m.daysUntil <= 60
  );

  if (unappointed.length > 0 && nearMilestones.length > 0) {
    const names = unappointed.slice(0, 5).map((s) => s.name).join(', ');
    const milestoneNames = nearMilestones.slice(0, 3).map((m) => m.name).join(', ');
    insights.push({
      pattern: 'stakeholder-milestone-readiness',
      modules: ['procurement', 'program'],
      severity: 'warning',
      insight: `${unappointed.length} discipline(s)/trade(s) not yet awarded (${names}${unappointed.length > 5 ? '...' : ''}) ` +
        `with ${nearMilestones.length} milestone(s) due within 60 days (${milestoneNames}). ` +
        `Late appointments may delay milestone achievement.`,
    });
  }

  return insights;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.abs(dollars));
}
```

### 7.3 Formatting Cross-Module Insights

```typescript
/**
 * Format all cross-module insights into a prompt-ready string.
 */
export function formatCrossModuleInsights(insights: CrossModuleInsight[]): string {
  if (insights.length === 0) return '';

  const lines = ['## Cross-Module Observations'];

  const critical = insights.filter((i) => i.severity === 'critical');
  const warnings = insights.filter((i) => i.severity === 'warning');
  const info = insights.filter((i) => i.severity === 'info');

  if (critical.length > 0) {
    lines.push('\n**Critical:**');
    critical.forEach((i) => lines.push(`- ${i.insight}`));
  }
  if (warnings.length > 0) {
    lines.push('\n**Attention:**');
    warnings.forEach((i) => lines.push(`- ${i.insight}`));
  }
  if (info.length > 0) {
    lines.push('\n**Notes:**');
    info.forEach((i) => lines.push(`- ${i.insight}`));
  }

  return lines.join('\n');
}
```

---

## 8. Caching Strategy

### 8.1 Cache Design

An in-memory TTL cache prevents duplicate fetches when the same module is requested multiple times in rapid succession. This is particularly important for:

- **LangGraph loops**: The RFT pipeline calls context assembly at multiple nodes. Without caching, each node re-fetches the same data.
- **Report generation**: Generating multiple sections for the same report triggers separate context requests, but the underlying project data is the same.
- **Q&A follow-ups**: Rapid follow-up questions re-assemble context; cached modules avoid repeated DB queries.

### 8.2 Implementation

```typescript
// src/lib/context/cache.ts

import type { ModuleResult, ModuleName } from './types';

/**
 * TTL cache for module fetch results.
 * Key: `${projectId}:${moduleName}`
 * Value: { result, expiresAt }
 */

interface CacheEntry {
  result: ModuleResult;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds

class ModuleCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Build cache key from project ID and module name.
   */
  private key(projectId: string, moduleName: ModuleName): string {
    return `${projectId}:${moduleName}`;
  }

  /**
   * Get a cached module result if it exists and hasn't expired.
   */
  get(projectId: string, moduleName: ModuleName): ModuleResult | null {
    const entry = this.store.get(this.key(projectId, moduleName));
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.key(projectId, moduleName));
      return null;
    }

    return entry.result;
  }

  /**
   * Store a module result in the cache.
   */
  set(projectId: string, moduleName: ModuleName, result: ModuleResult): void {
    this.store.set(this.key(projectId, moduleName), {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Invalidate all cached entries for a project.
   * Call this when project data is modified.
   */
  invalidateProject(projectId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidate a specific module for a project.
   */
  invalidateModule(projectId: string, moduleName: ModuleName): void {
    this.store.delete(this.key(projectId, moduleName));
  }

  /**
   * Clear all cached entries. Used in tests.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; oldestEntryAge: number | null } {
    let oldestAge: number | null = null;
    for (const entry of this.store.values()) {
      const age = Date.now() - (entry.expiresAt - this.ttlMs);
      if (oldestAge === null || age > oldestAge) oldestAge = age;
    }
    return { size: this.store.size, oldestEntryAge: oldestAge };
  }
}

/**
 * Singleton cache instance shared across all orchestrator calls.
 */
export const moduleCache = new ModuleCache();
```

### 8.3 Cache Behavior

- **TTL: 30 seconds.** Short enough that interactive edits are reflected quickly; long enough to prevent duplicate fetches within a single generation flow.
- **Per-project invalidation.** When the orchestrator detects a project mutation (via consumer hint), it can invalidate all cached modules for that project.
- **No persistence.** Cache is in-memory only, resets on server restart. This is intentional -- stale persistent cache would be worse than cache misses.
- **No LRU eviction.** With 30s TTL and typical project counts, memory is not a concern. Expired entries are cleaned up lazily on access.

---

## 9. Integration Plan: Wiring Existing Consumers

### 9.1 Integration Order and Rationale

Each existing AI consumer is wired to the orchestrator separately. The order prioritizes highest quality uplift with lowest integration risk.

| Order | Consumer | Files to Modify | Quality Uplift | Risk |
|---|---|---|---|---|
| 1 | Meeting/Report section generation | `ai-content-generation.ts`, `generate-content/route.ts` | **Highest** -- gains cost plan, program, risks, profiler, procurement, cross-module insights | Low -- isolated API, easy rollback |
| 2 | TRR generation | `trr/[id]/generate/route.ts` | **High** -- gains profiler, cost context, program milestones | Low -- standalone endpoint |
| 3 | LangGraph RFT pipeline | `langgraph/nodes/retrieve-context.ts` | **High** -- gains cost, program, procurement | Medium -- multi-node graph, needs careful state handling |
| 4 | Note content generation | `note-content-generation.ts`, `generate-note-content/route.ts` | **Medium** -- gains project-wide context beyond attached docs | Low -- isolated service |
| 5 | Pillar 3 (inline instructions) + Pillar 4 (coaching Q&A) | New consumers | **New capability** -- these are built on the orchestrator from day one | N/A -- greenfield |

### 9.2 Integration Pattern: Meeting/Report Section Generation

This is the first and most impactful integration. Currently, `ai-content-generation.ts` fetches starred notes, procurement docs, and basic project context. After integration, it gains access to the full project lifecycle.

**Before (current code in `ai-content-generation.ts`):**

```typescript
// Current: manual, incomplete context assembly
const [starredNotes, procurementDocs, projectContext, existingContent] = await Promise.all([
  fetchStarredNotesForPeriod(projectId, reportingPeriodStart, reportingPeriodEnd),
  fetchProcurementDocuments(projectId),
  fetchProjectContext(projectId),
  fetchExistingContent(meetingId, reportId, sectionKey),
]);

const contextParts = [
  formatProjectContext(projectContext),
  formatStarredNotes(starredNotes),
  formatProcurementDocs(procurementDocs),
];
```

**After (orchestrator integration):**

```typescript
import { assembleContext } from '@/lib/context/orchestrator';

// New: single orchestrator call replaces 4 manual fetches
const context = await assembleContext({
  projectId,
  task: `Generate ${sectionKey} section content`,
  contextType: 'report-section',
  sectionKey,
  reportingPeriod: reportingPeriodStart && reportingPeriodEnd
    ? { start: reportingPeriodStart, end: reportingPeriodEnd }
    : undefined,
});

// Existing content fetch remains separate (it's section-specific, not project context)
const existingContent = await fetchExistingContent(meetingId, reportId, sectionKey);

// Build prompt with orchestrated context
const contextParts = [
  context.projectSummary,
  context.moduleContext,
  context.crossModuleInsights ?? '',
  context.ragContext,
];
```

### 9.3 Integration Pattern: TRR Generation

**Before (current code in `trr/[id]/generate/route.ts`):**

```typescript
// Current: fetches TRR-specific data but misses project context
const [trrRecord, projectDetails, stakeholderInfo, evaluationData] = await Promise.all([
  fetchTRR(trrId),
  fetchProjectDetails(projectId),
  fetchStakeholder(stakeholderId),
  fetchEvaluationPriceData(trrId),
]);
```

**After:**

```typescript
import { assembleContext } from '@/lib/context/orchestrator';

// TRR-specific data still fetched directly (it's TRR-instance-specific)
const [trrRecord, evaluationData] = await Promise.all([
  fetchTRR(trrId),
  fetchEvaluationPriceData(trrId),
]);

// Project context from orchestrator (gains profiler, cost plan, program, risks)
const context = await assembleContext({
  projectId,
  task: `Generate Tender Recommendation Report for ${trrRecord.disciplineName}`,
  contextType: 'trr',
  stakeholderId: trrRecord.stakeholderId,
});

// Merge TRR-specific data with orchestrated project context
const prompt = buildTRRPrompt(trrRecord, evaluationData, context);
```

### 9.4 Integration Pattern: LangGraph RFT Pipeline

The LangGraph pipeline currently fetches planning context at the `fetch-planning-context` node and RAG at the `retrieve-context` node. The orchestrator replaces both with a single unified call at the first node, with results passed through graph state.

**Before:**

```typescript
// Node 1: fetch-planning-context.ts
const planningContext = await fetchPlanningContext(state.projectId);

// Node 2: retrieve-context.ts
const ragResults = await retrieve(state.query, { documentSetIds: state.documentSetIds });
```

**After:**

```typescript
// Node 1: replaces both fetch-planning-context and retrieve-context
const context = await assembleContext({
  projectId: state.projectId,
  task: state.query,
  contextType: 'rft',
  documentIds: state.documentSetIds,
});

// Pass assembled context through graph state
return {
  ...state,
  assembledContext: context,
};
```

### 9.5 Deprecation of report-context-orchestrator.ts

After all consumers are wired to the new orchestrator:

1. Add a deprecation comment to `src/lib/services/report-context-orchestrator.ts`
2. Remove it from the codebase once all integration tests pass
3. The type definitions and utility functions are preserved in the new `src/lib/context/` modules

The file is NOT deleted during integration -- it remains as reference until each module fetcher is verified against it.

---

## 10. Edge Cases and Pitfalls

### 10.1 Data Edge Cases

**Empty project (no data in any module):** A newly created project with only a name and no profiler, cost lines, stakeholders, or documents. The orchestrator returns a minimal `projectSummary` with just the project name and a note that data is not yet populated. All module results return empty/default data. The formatter produces a brief context stating "This project is in early setup. Limited data is available for the following modules: [list]."

**Missing profiler data:** If the project exists but `projectProfiles` has no row (user skipped the profiler), the profile module returns `null`. Strategies that list profile as `required` proceed without it -- required modules log warnings but do not abort assembly. The project summary omits building class and project type, noting "Project type not yet configured."

**Stale data during concurrent edits:** If a user modifies cost plan data while a report section is being generated, the cached data may be slightly stale (up to 30 seconds). This is acceptable because: (a) report generation takes seconds and the data was correct when the user initiated it, (b) the 30s TTL means the next generation picks up the change.

**Very large projects (100+ cost lines, 50+ stakeholders):** The formatter's tier system handles this. At `summary` tier, even 100 cost lines compress to ~200 tokens (section totals only). At `detailed` tier, 100 lines produce ~1,500 tokens, which fits within the 8,000 total budget because detailed tier is only assigned when few modules are loaded.

### 10.2 Strategy Edge Cases

**Unknown sectionKey:** If a consumer passes a `sectionKey` that does not match any strategy (e.g., a new report section added later), the resolver falls back to the base `contextType` strategy. If that also has no match, a minimal profile-only strategy is returned. This ensures the orchestrator never throws -- it degrades gracefully.

**Auto-mode with no keyword matches:** If a `coaching-qa` question contains no recognized keywords (e.g., "How am I going?"), the auto-mode resolver includes a broad set at low priority: `costPlan`, `program`, `risks`, `procurement` all at priority 3. This gives the AI a general project snapshot to answer vague questions.

**forceModules override:** Callers can bypass strategy resolution entirely by specifying `forceModules`. This is an escape hatch for cases where the consumer knows exactly what it needs (e.g., Pillar 4 Q&A when the user is explicitly in the cost plan tab).

### 10.3 Performance Edge Cases

**Cold start (empty cache):** The first call after server restart fetches all modules from the database. With parallel `Promise.all` execution, this takes 100-300ms for a typical project. Subsequent calls within 30 seconds hit cache and return in <5ms.

**LangGraph loop re-fetching:** The RFT pipeline's `generate-section` node may be called multiple times (once per section). Without cache, each invocation re-fetches the full context. With the 30s cache, only the first invocation hits the database; subsequent ones return cached results.

**Database connection pool exhaustion:** Each module fetcher uses the shared `db` connection pool (max 20 connections). With parallel module fetching (typically 3-6 modules via `Promise.all`), peak connection usage is bounded by the number of modules. This is well within pool limits.

### 10.4 Integration Pitfalls

**Gradual rollout conflicts:** During the integration period, some consumers use the old context assembly while others use the new orchestrator. If both are running simultaneously for the same project, they may compete for database connections. This is not a functional problem (they read the same data), but could briefly increase query load. Mitigation: integrate one consumer at a time and verify before proceeding.

**Type mismatches between old and new:** The existing `ai-content-generation.ts` uses its own `ProjectContext` interface (`{ projectName, address, functional, quality, budget, program }`). The orchestrator's `AssembledContext` has a different shape. During integration, the consumer must adapt to the new shape. This is a one-time change per consumer.

**RAG document scoping:** The `documents` module wraps `retrieve()` from the RAG pipeline. For note generation, documents must be scoped to specific attached document IDs. For report generation, documents are scoped to the project's knowledge library. The module fetcher accepts an optional `documentIds` parameter for scoping, passed through from `ContextRequest.documentIds`.

### 10.5 Partial Context Handling

When a module fetcher fails (database timeout, missing table, malformed data), the orchestrator must not abort the entire assembly. Instead, it degrades gracefully and surfaces what happened via the `issues[]` array on `AssembledContext`.

**Fallback strategy per failure type:**

| Failure | Fallback | `issues[]` entry |
|---------|----------|------------------|
| Module fetcher throws | Return empty `ModuleResult` with `success: false` | `{ module, error: 'Fetch failed: [message]', fallback: 'empty' }` |
| Module fetcher times out (>5s) | Return cached result if available, otherwise empty | `{ module, error: 'Fetch timeout (>5s)', fallback: 'cached' }` or `'empty'` |
| Module returns data but formatter fails | Use raw `.toString()` summary | `{ module, error: 'Format failed: [message]', fallback: 'summary' }` |
| RAG retrieval fails | Omit `knowledgeContext` and `ragContext` | `{ module: 'documents', error: '...', fallback: 'empty' }` |

**Implementation in orchestrator.ts:**

```typescript
// Inside assembleContext()
const issues: ContextIssue[] = [];

const moduleResults = await Promise.all(
  requiredModules.map(async (req) => {
    try {
      const cached = cache.get(projectId, req.module);
      if (cached) return { module: req.module, result: cached, fromCache: true };

      const result = await Promise.race([
        fetchModule(req.module, projectId, request),
        timeout(5000).then(() => { throw new Error('timeout'); }),
      ]);

      cache.set(projectId, req.module, result);
      return { module: req.module, result, fromCache: false };
    } catch (err) {
      const cachedFallback = cache.get(projectId, req.module);
      if (cachedFallback) {
        issues.push({
          module: req.module,
          error: `Fetch failed: ${err.message}. Using cached data.`,
          fallback: 'cached',
        });
        return { module: req.module, result: cachedFallback, fromCache: true };
      }

      issues.push({
        module: req.module,
        error: `Fetch failed: ${err.message}`,
        fallback: 'empty',
      });
      return { module: req.module, result: emptyResult(req.module), fromCache: false };
    }
  })
);

// Attach issues to final context
return { ...assembledContext, issues: issues.length > 0 ? issues : undefined };
```

**Consumer awareness:** AI prompt templates can optionally include an issues disclaimer:

```
{{#if context.issues}}
NOTE: Some project data could not be fully loaded:
{{#each context.issues}}
- {{module}}: {{error}} ({{fallback}})
{{/each}}
Answers based on incomplete data should be flagged as such.
{{/if}}
```

This ensures the AI does not confidently state figures when the underlying data fetch partially failed.

---

## 11. Implementation Approach

### Phase 2A: Core Infrastructure (3-4 days)

**Step 1: Type definitions and interfaces**
- Create `src/lib/context/types.ts` with all interfaces from Section 3
- Define `ContextRequest`, `AssembledContext`, `ModuleResult`, `ModuleRequirements`
- Include `ReportingPeriod` and `DeltaItem` types (migrated from `report-context-orchestrator.ts`)
- File: `src/lib/context/types.ts`

**Step 2: Strategy definitions**
- Create `src/lib/context/strategies.ts` with all strategy mappings from Section 4
- Implement `resolveStrategy()` and `resolveAutoModeModules()`
- File: `src/lib/context/strategies.ts`

**Step 3: Cache implementation**
- Create `src/lib/context/cache.ts` with `ModuleCache` class
- In-memory Map with TTL, project invalidation, stats
- File: `src/lib/context/cache.ts`

**Step 4: Formatter with tier selection**
- Create `src/lib/context/formatter.ts` with `assignTiers()` and per-module format functions
- Migrate `formatCurrency()`, `formatPercent()`, `daysUntil()` from `report-context-orchestrator.ts`
- File: `src/lib/context/formatter.ts`

### Phase 2B: Module Fetchers (3-4 days)

**Step 5: Extract module fetchers from existing code**
- Create `src/lib/context/modules/profile.ts` -- extract from `fetchProfilerSummary()` in orchestrator
- Create `src/lib/context/modules/cost-plan.ts` -- extract from `fetchCostPlanSummary()` in orchestrator
- Create `src/lib/context/modules/program.ts` -- extract from `fetchProgramStatus()` in orchestrator
- Create `src/lib/context/modules/risks.ts` -- extract from `fetchRiskSummary()` in orchestrator
- Create `src/lib/context/modules/procurement.ts` -- extract from `fetchProcurementOverview()` in orchestrator
- Create `src/lib/context/modules/stakeholders.ts` -- new, queries `projectStakeholders`
- Create `src/lib/context/modules/notes.ts` -- extract starred notes logic from `ai-content-generation.ts`
- Create `src/lib/context/modules/documents.ts` -- wraps `retrieve()` from `src/lib/rag/retrieval.ts`
- Create `src/lib/context/modules/planning-card.ts` -- wraps `fetchPlanningContext()` from `planning-context.ts`
- Files: 9 module files in `src/lib/context/modules/`

**Step 6: Cross-module intelligence**
- Create `src/lib/context/cross-module.ts` with 5 pattern analyzers from Section 7
- Implement `analyzeCrossModulePatterns()` and `formatCrossModuleInsights()`
- File: `src/lib/context/cross-module.ts`

### Phase 2C: Orchestrator Assembly (2-3 days)

**Step 7: Main orchestrator entry point**
- Create `src/lib/context/orchestrator.ts` with `assembleContext()` function
- Orchestration flow:
  1. Resolve strategy from request
  2. Check cache for each required module
  3. Fetch missing modules in parallel via `Promise.all`
  4. Store results in cache
  5. Run cross-module intelligence on fetched data
  6. Assign formatting tiers
  7. Format all modules and assemble final context
  8. Return `AssembledContext` with metadata
- File: `src/lib/context/orchestrator.ts`

```typescript
// src/lib/context/orchestrator.ts -- main entry point

import { moduleCache } from './cache';
import { resolveStrategy, resolveAutoModeModules } from './strategies';
import { assignTiers, formatModule, formatProjectSummary } from './formatter';
import { analyzeCrossModulePatterns, formatCrossModuleInsights } from './cross-module';
import { fetchProfile } from './modules/profile';
import { fetchCostPlan } from './modules/cost-plan';
import { fetchProgram } from './modules/program';
import { fetchRisks } from './modules/risks';
import { fetchProcurement } from './modules/procurement';
import { fetchStakeholders } from './modules/stakeholders';
import { fetchPlanningCard } from './modules/planning-card';
import { fetchStarredNotes } from './modules/notes';
import { fetchRagDocuments } from './modules/documents';
import type {
  ContextRequest,
  AssembledContext,
  ModuleResult,
  ModuleName,
  ModuleRequirement,
} from './types';

/**
 * Module fetcher registry.
 * Maps module names to their fetch functions.
 */
const MODULE_FETCHERS: Record<ModuleName, (projectId: string, params?: any) => Promise<ModuleResult>> = {
  profile: fetchProfile,
  costPlan: fetchCostPlan,
  variations: (pid, p) => fetchCostPlan(pid, p), // Included in cost plan
  invoices: (pid, p) => fetchCostPlan(pid, p),   // Included in cost plan
  program: fetchProgram,
  milestones: fetchProgram,                       // Included in program
  risks: fetchRisks,
  procurement: fetchProcurement,
  stakeholders: fetchStakeholders,
  planningCard: fetchPlanningCard,
  starredNotes: fetchStarredNotes,
  ragDocuments: fetchRagDocuments,
};

/**
 * Assemble project context for any AI generation task.
 * This is the single entry point that all consumers call.
 */
export async function assembleContext(request: ContextRequest): Promise<AssembledContext> {
  const startTime = Date.now();

  // 1. Resolve strategy
  const { strategyKey, requirements } = resolveStrategy(request);

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

  // 3. Check cache and fetch missing modules
  const fetchedModules = new Map<ModuleName, ModuleResult>();
  let cacheHits = 0;
  let cacheMisses = 0;

  const modulesToFetch: ModuleName[] = [];

  for (const req of moduleRequirements) {
    const cached = moduleCache.get(request.projectId, req.module);
    if (cached) {
      fetchedModules.set(req.module, cached);
      cacheHits++;
    } else {
      modulesToFetch.push(req.module);
      cacheMisses++;
    }
  }

  // 4. Fetch missing modules in parallel
  if (modulesToFetch.length > 0) {
    const fetchPromises = modulesToFetch.map(async (moduleName) => {
      const fetcher = MODULE_FETCHERS[moduleName];
      if (!fetcher) {
        return { moduleName, result: null };
      }

      const params = {
        reportingPeriod: request.reportingPeriod,
        documentIds: request.documentIds,
        stakeholderId: request.stakeholderId,
      };

      const result = await fetcher(request.projectId, params);
      return { moduleName, result };
    });

    const results = await Promise.all(fetchPromises);

    for (const { moduleName, result } of results) {
      if (result) {
        fetchedModules.set(moduleName, result);
        moduleCache.set(request.projectId, moduleName, result);
      }
    }
  }

  // 5. Run cross-module intelligence
  const crossModuleInsights = analyzeCrossModulePatterns(fetchedModules);

  // 6. Assign formatting tiers
  const tiers = assignTiers(moduleRequirements, fetchedModules);

  // 7. Format all modules
  const formattedParts: string[] = [];
  for (const [moduleName, result] of fetchedModules) {
    if (!result.success) continue;
    const tier = tiers.get(moduleName) ?? 'standard';
    formattedParts.push(formatModule(moduleName, result.data, tier));
  }

  // 8. Assemble final context
  const modulesFailed = [...fetchedModules.entries()]
    .filter(([, r]) => !r.success)
    .map(([name]) => name);

  const totalTokens = [...fetchedModules.values()]
    .reduce((sum, r) => sum + r.estimatedTokens, 0);

  const assembledContext: AssembledContext = {
    projectSummary: formatProjectSummary(request.projectId, fetchedModules),
    moduleContext: formattedParts.join('\n\n'),
    knowledgeContext: '', // Populated when Pillar 1 is integrated
    ragContext: fetchedModules.get('ragDocuments')?.success
      ? formatModule('ragDocuments', fetchedModules.get('ragDocuments')!.data, 'standard')
      : '',
    crossModuleInsights: formatCrossModuleInsights(crossModuleInsights),
    rawModules: fetchedModules,
    metadata: {
      modulesRequested: moduleRequirements.map((m) => m.module),
      modulesFetched: [...fetchedModules.keys()],
      modulesFailed,
      totalEstimatedTokens: totalTokens,
      formattingTier: tiers.values().next().value ?? 'standard',
      assemblyTimeMs: Date.now() - startTime,
      cacheHits,
      cacheMisses,
    },
  };

  return assembledContext;
}
```

### Phase 2D: Consumer Integration (4-5 days)

**Step 8: Wire Meeting/Report section generation**
- Modify `src/lib/services/ai-content-generation.ts`
- Replace manual context fetches with `assembleContext()` call
- Adapt prompt construction to use `AssembledContext` shape
- Preserve existing `fetchExistingContent()` (section-specific, not project context)
- Test: Generate a Brief section and verify it now includes cost plan, program, and risk data
- Files: `src/lib/services/ai-content-generation.ts`, `src/app/api/ai/generate-content/route.ts`

**Step 9: Wire TRR generation**
- Modify `src/app/api/trr/[id]/generate/route.ts`
- Keep TRR-specific data fetches (they are instance-specific)
- Add orchestrator call for project-level context
- Test: Generate a TRR and verify it references profiler data and cost context
- Files: `src/app/api/trr/[id]/generate/route.ts`

**Step 10: Wire LangGraph RFT pipeline**
- Modify `src/lib/langgraph/nodes/retrieve-context.ts`
- Replace separate planning context + RAG fetch with single `assembleContext()` call
- Pass `AssembledContext` through graph state
- Ensure `generate-section.ts` reads from the new state shape
- Test: Generate an RFT and verify it includes cost and procurement context
- Files: `src/lib/langgraph/nodes/retrieve-context.ts`, `src/lib/langgraph/nodes/generate-section.ts`

**Step 11: Wire Note content generation**
- Modify `src/lib/services/note-content-generation.ts`
- Replace manual project context fetch with orchestrator call
- Preserve document-specific RAG scoping via `documentIds`
- Test: Generate note content and verify broader project context enhances quality
- Files: `src/lib/services/note-content-generation.ts`, `src/app/api/ai/generate-note-content/route.ts`

### Phase 2E: Deprecation and Cleanup (1 day)

**Step 12: Deprecate report-context-orchestrator.ts**
- Add deprecation notice with migration path to `src/lib/services/report-context-orchestrator.ts`
- Verify no remaining imports reference the old file
- Remove file from codebase
- Files: `src/lib/services/report-context-orchestrator.ts` (delete)

### Total Estimated Effort: 13-17 days

### Implementation Dependencies

- Phase 2A is **fully independent** -- pure infrastructure with no runtime dependencies
- Phase 2B depends on 2A (uses types and cache)
- Phase 2C depends on 2A + 2B (assembles modules)
- Phase 2D depends on 2A + 2B + 2C (consumers use the orchestrator)
- Phase 2E depends on all of 2D (all consumers migrated before deprecation)
- **Pillar 3 and Pillar 4 depend on Phase 2C being complete** -- they consume `assembleContext()` directly

### Recommended Build Order

1. Ship Phases 2A + 2B + 2C first (orchestrator infrastructure, no consumer changes)
2. Ship Phase 2D integration 1 (Meeting/Report) -- highest quality uplift
3. Ship Phase 2D integrations 2-4 incrementally
4. Ship Phase 2E after all integrations verified

---

## Files Created/Modified Summary

| Action | File | Phase |
|--------|------|-------|
| Create | `src/lib/context/types.ts` | 2A |
| Create | `src/lib/context/strategies.ts` | 2A |
| Create | `src/lib/context/cache.ts` | 2A |
| Create | `src/lib/context/formatter.ts` | 2A |
| Create | `src/lib/context/modules/profile.ts` | 2B |
| Create | `src/lib/context/modules/cost-plan.ts` | 2B |
| Create | `src/lib/context/modules/program.ts` | 2B |
| Create | `src/lib/context/modules/risks.ts` | 2B |
| Create | `src/lib/context/modules/procurement.ts` | 2B |
| Create | `src/lib/context/modules/stakeholders.ts` | 2B |
| Create | `src/lib/context/modules/planning-card.ts` | 2B |
| Create | `src/lib/context/modules/notes.ts` | 2B |
| Create | `src/lib/context/modules/documents.ts` | 2B |
| Create | `src/lib/context/cross-module.ts` | 2B |
| Create | `src/lib/context/orchestrator.ts` | 2C |
| Modify | `src/lib/services/ai-content-generation.ts` | 2D |
| Modify | `src/app/api/ai/generate-content/route.ts` | 2D |
| Modify | `src/app/api/trr/[id]/generate/route.ts` | 2D |
| Modify | `src/lib/langgraph/nodes/retrieve-context.ts` | 2D |
| Modify | `src/lib/langgraph/nodes/generate-section.ts` | 2D |
| Modify | `src/lib/services/note-content-generation.ts` | 2D |
| Modify | `src/app/api/ai/generate-note-content/route.ts` | 2D |
| Deprecate | `src/lib/services/report-context-orchestrator.ts` | 2E |
