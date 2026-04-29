/**
 * AI feature groups — coarse-grained buckets for runtime model selection.
 *
 * Every AI call site in the codebase belongs to exactly one group. The group
 * determines which model is used, configured via the model_settings table and
 * editable in /admin/models.
 */

export const FEATURE_GROUPS = [
    'document_extraction',
    'text_extraction',
    'cost_line_matching',
    'content_generation',
    'content_polishing',
    // Agent-runtime groups (Phase 1+ of agent integration plan).
    // Until model_settings is seeded with these rows, the agent registry
    // falls back to a hardcoded Claude model — see lib/agents/model.ts.
    'agent_specialist',
    'agent_orchestrator',
] as const;

export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

export type Provider = 'anthropic' | 'openrouter';

export interface ModelChoice {
    provider: Provider;
    modelId: string;
}
