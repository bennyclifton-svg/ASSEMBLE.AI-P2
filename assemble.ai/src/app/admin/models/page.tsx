/**
 * Admin Models Page
 *
 * Per-feature-group provider + model picker. Save → audit log + cache invalidate.
 * Layout already enforces super-admin via requireSuperAdminPage().
 */

import { db } from '@/lib/db';
import { modelSettings } from '@/lib/db/auth-schema';
import { ModelSettingsForm } from './ModelSettingsForm';
import { MODEL_CATALOG } from '@/lib/ai/pricing';
import type { FeatureGroup, Provider } from '@/lib/ai/types';

export interface ModelSettingsRow {
    featureGroup: FeatureGroup;
    provider: Provider;
    modelId: string;
}

const FEATURE_GROUP_LABELS: Record<FeatureGroup, { title: string; description: string }> = {
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
        description: 'Matches an invoice or variation to a cost line. Short prompts, high volume.',
    },
    content_generation: {
        title: 'Content generation',
        description: 'Long-form writing — notes, reports, RFTs, sections, objectives. Quality matters here.',
    },
    content_polishing: {
        title: 'Content polishing',
        description: 'Refines existing prose. Lower stakes than generation.',
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

export default async function AdminModelsPage() {
    const settings = await getSettings();

    return (
        <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-white">AI Models</h1>
                <p className="mt-1 text-sm text-gray-400">
                    Pick the provider and model for each feature group. Changes propagate within ~60 seconds (in-memory cache TTL) and are logged to <code className="text-xs">admin_audit_log</code>.
                </p>
            </div>
            <ModelSettingsForm
                initialSettings={settings}
                catalog={MODEL_CATALOG}
                groupLabels={FEATURE_GROUP_LABELS}
            />
        </div>
    );
}
