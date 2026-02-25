// src/lib/context/types.ts
// Core type definitions for the Project Context Orchestrator (Pillar 2)

/**
 * Reporting period for delta/change tracking.
 * Migrated from report-context-orchestrator.ts.
 */
export interface ReportingPeriod {
  start: string; // ISO date string
  end: string; // ISO date string
}

/**
 * Module names the orchestrator can fetch.
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
  | 'ragDocuments'
  | 'projectInfo'
  | 'procurementDocs'
  | 'attachedDocuments';

/**
 * Context request from any AI consumer.
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
    | 'report-section'
    | 'meeting-section'
    | 'inline-instruction'
    | 'trr'
    | 'note'
    | 'rft';

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

  /** For note context: specific note ID for fetching attached documents */
  noteId?: string;

  /** Override: explicitly request specific modules regardless of strategy */
  forceModules?: ModuleName[];
}

/**
 * Raw data returned by a module fetcher.
 * Each module defines its own data shape.
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

/**
 * Describes a module that failed or degraded during context assembly.
 */
export interface ContextIssue {
  module: ModuleName;
  error: string;
  fallback: 'empty' | 'cached' | 'summary';
}

/**
 * Assembled context ready for injection into AI prompts.
 * All string fields are pre-formatted prompt text.
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

  /** Cross-module insight strings */
  crossModuleInsights?: string;

  /** Partial context issues: modules that failed or degraded */
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
