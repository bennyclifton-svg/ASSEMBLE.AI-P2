/**
 * AI feature groups — coarse-grained buckets for runtime model selection.
 *
 * Every AI call site in the codebase belongs to exactly one group. The group
 * determines which model is used, configured via the model_settings table and
 * editable in /admin/models.
 */

export const FEATURE_GROUPS = [
    'extraction',
    'generation',
    'chat',
] as const;

export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

export type Provider = 'anthropic' | 'openrouter' | 'openai';

export interface ModelChoice {
    provider: Provider;
    modelId: string;
}
