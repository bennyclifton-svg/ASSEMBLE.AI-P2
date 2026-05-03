/**
 * Admin Models Page
 *
 * Three feature-group rows. Pick the provider and model for each:
 *   - extraction: pulling structured data from text (cost-line matching,
 *     non-price tender parsing, generate-field, planning extract-objectives).
 *   - generation: writing prose for the user (notes, meetings, reports,
 *     objectives generate/polish, inline /ai instructions, TRR sections,
 *     langgraph section generation).
 *   - chat: the chat-dock agents (Orchestrator, Finance, Program, Design).
 *
 * Layout enforces super-admin via requireSuperAdminPage().
 */

import { db } from '@/lib/db';
import { modelSettings } from '@/lib/db/auth-schema';
import { ModelSettingsForm } from './ModelSettingsForm';
import { MODEL_CATALOG } from '@/lib/ai/pricing';
import type { FeatureGroup, Provider } from '@/lib/ai/types';

export const dynamic = 'force-dynamic';

export interface ModelSettingsRow {
    featureGroup: FeatureGroup;
    provider: Provider;
    modelId: string;
}

const FEATURE_GROUP_LABELS: Partial<Record<FeatureGroup, { title: string; description: string }>> = {
    extraction: {
        title: 'Extraction',
        description: 'Pulls structured data from text — cost-line matching, non-price tender parsing, planning extract-objectives, retrieval field-fill. Short prompts, high volume. Haiku-tier is appropriate. Note: PDF document extraction (drawings, contractor/consultant/planning intake, invoice/variation/tender ingestion) currently always uses Anthropic Claude regardless of this setting; that path will be unified in a future release.',
    },
    generation: {
        title: 'Generation',
        description: 'Writes prose for the user — notes, meeting agendas, reports, objectives generate/polish, inline /ai instructions, TRR sections, langgraph section generation. Quality matters; Sonnet-tier recommended.',
    },
    chat: {
        title: 'Chat dock',
        description: 'All chat-dock agents — Orchestrator, Finance, Program, Design. Multi-turn, tool-using, streaming. Sonnet-tier recommended.',
    },
};

async function getSettings(): Promise<ModelSettingsRow[]> {
    const rows = await db.select().from(modelSettings);
    return rows.map((r) => ({
        featureGroup: r.featureGroup as FeatureGroup,
        provider: r.provider as Provider,
        modelId: r.modelId,
    }));
}

/**
 * Default shown for any labelled feature group that has no model_settings row
 * yet. Mirrors the registry FALLBACK in src/lib/ai/registry.ts so the form
 * shows what is actually in effect at runtime. Once the user saves, the PATCH
 * endpoint upserts a real row.
 */
const UNSEEDED_DEFAULT: { provider: Provider; modelId: string } = {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
};

export default async function AdminModelsPage() {
    const settings = await getSettings();
    const settingsByGroup = new Map(settings.map((s) => [s.featureGroup, s]));
    // Render every labelled group, even if its model_settings row hasn't been
    // written yet — otherwise feature groups added later are invisible in the
    // UI and silently use the registry fallback.
    const featureGroupSettings: ModelSettingsRow[] = (
        Object.keys(FEATURE_GROUP_LABELS) as FeatureGroup[]
    ).map(
        (fg) =>
            settingsByGroup.get(fg) ?? {
                featureGroup: fg,
                provider: UNSEEDED_DEFAULT.provider,
                modelId: UNSEEDED_DEFAULT.modelId,
            }
    );

    return (
        <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">AI Models</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Pick the provider and model for each feature group. Changes propagate within ~60 seconds (in-memory cache TTL) and are logged to <code className="text-xs text-[var(--color-text-secondary)]">admin_audit_log</code>.
                </p>
            </div>
            <ModelSettingsForm
                initialSettings={featureGroupSettings}
                catalog={MODEL_CATALOG}
                groupLabels={FEATURE_GROUP_LABELS}
            />
        </div>
    );
}
