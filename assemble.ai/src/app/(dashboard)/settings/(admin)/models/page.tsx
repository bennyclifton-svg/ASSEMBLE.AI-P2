/**
 * Admin Models Page
 *
 * Four feature-group rows. Pick the provider and model for each:
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
    objectives_generation: {
        title: 'Objectives generation',
        description: 'Generates and polishes Brief objectives. This includes full attached-document reads, so use a long-context model with a generous token allowance. Claude Sonnet or Claude Opus is recommended.',
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
        <div className="sitewise-page-frame">
            <div className="sitewise-page-header">
                <div>
                    <div className="sitewise-page-kicker">admin / ai models</div>
                    <h1 className="mt-2">AI Models</h1>
                    <p className="sitewise-page-subtitle">
                        Pick the provider and model for each feature group. Changes propagate within about 60 seconds and are logged to{' '}
                        <code className="sitewise-code">admin_audit_log</code>.
                    </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <span className="sitewise-status-pill">{featureGroupSettings.length} feature groups</span>
                    <span className="sitewise-status-pill sitewise-status-pill-dark">cached registry</span>
                </div>
            </div>
            <ModelSettingsForm
                initialSettings={featureGroupSettings}
                catalog={MODEL_CATALOG}
                groupLabels={FEATURE_GROUP_LABELS}
            />
        </div>
    );
}
