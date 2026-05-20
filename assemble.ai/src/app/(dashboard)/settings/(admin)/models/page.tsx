/**
 * Admin Models Page
 *
 * Three feature-group rows. Pick the provider and model for each:
 *   - extraction: structured data pulled from text (cost-line matching, tender
 *     parsing, retrieval field-fill, drawing-number extraction, planning).
 *   - generation: prose written for the user — including brief objectives,
 *     which do long full-document reads.
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
        description: 'Structured data pulled from text. Short prompts, JSON or fielded output, high volume. Haiku-tier or gpt-4.1-mini is appropriate. Used by: Planning Authorities extract, Knowledge field-fill, Tender Evaluation parsing, RFT brief generation, invoice/variation cost-line matching, drawing-number extraction. (Invoice and variation document ingestion still call Anthropic Claude directly and don\'t respect this setting yet.)',
    },
    generation: {
        title: 'Generation',
        description: 'Prose written for the user. Some calls include long full-document reads (Brief objectives). Quality matters — pick Sonnet-tier or better; a long-context model is recommended if you want polished objectives. Used by: Notes/Meetings/Reports drafts, weekly report drafts, TRR sections, inline /ai instructions, Brief objectives generate + polish, Langgraph workflow sections.',
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
