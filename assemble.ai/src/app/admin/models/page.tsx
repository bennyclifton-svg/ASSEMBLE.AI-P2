/**
 * Admin Models Page
 *
 * Two sections:
 *   - "Chat Dock" master toggle — sets provider+model for all four chat-dock
 *     agent feature groups (agent_orchestrator, agent_finance, agent_program,
 *     agent_design) in a single click.
 *   - Per-feature-group rows for the non-agent flows (document extraction,
 *     content generation, etc.).
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

export const CHAT_DOCK_GROUPS: FeatureGroup[] = [
    'agent_orchestrator',
    'agent_finance',
    'agent_program',
    'agent_design',
];

const FEATURE_GROUP_LABELS: Partial<Record<FeatureGroup, { title: string; description: string }>> = {
    document_extraction: {
        title: 'Document extraction',
        description: 'Reads PDFs directly (invoices, variations, drawing fallback). PDF input requires native-PDF support.',
    },
    text_extraction: {
        title: 'Text extraction',
        description: 'Pulls structured fields from already-extracted text. Used by tender, planning, contractor, consultant flows.',
    },
    cost_line_matching: {
        title: 'Cost-line matching',
        description: 'Matches an invoice or variation to a cost line. Short prompts, high volume. Haiku is appropriate here.',
    },
    content_generation: {
        title: 'Content generation',
        description: 'Long-form writing - notes, reports, RFTs, sections. Quality matters here.',
    },
    content_polishing: {
        title: 'Content polishing',
        description: 'Refines existing prose. Lower stakes than generation.',
    },
    objectives_generation: {
        title: 'Objectives generation',
        description: 'Generates project objectives from profile and knowledge library context. High-quality strategic output - Sonnet recommended.',
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
    const chatDockSettings = settings.filter((s) => CHAT_DOCK_GROUPS.includes(s.featureGroup));
    const settingsByGroup = new Map(settings.map((s) => [s.featureGroup, s]));
    // Render every labelled group, even if its model_settings row hasn't been
    // written yet — otherwise feature groups added later are invisible in the
    // UI and silently use the registry fallback (which is how objectives_generation
    // ended up calling Anthropic after every other group was switched to OpenAI).
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
                    Pick the provider and model for the chat dock and other AI feature groups. Changes propagate within ~60 seconds (in-memory cache TTL) and are logged to <code className="text-xs text-[var(--color-text-secondary)]">admin_audit_log</code>.
                </p>
            </div>
            <ModelSettingsForm
                chatDockSettings={chatDockSettings}
                initialSettings={featureGroupSettings}
                catalog={MODEL_CATALOG}
                groupLabels={FEATURE_GROUP_LABELS}
            />
        </div>
    );
}
