'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Check, AlertTriangle } from 'lucide-react';
import type { ModelSettingsRow } from './page';
import type { FeatureGroup, Provider } from '@/lib/ai/types';
import type { ModelInfo } from '@/lib/ai/pricing';

interface Props {
    initialSettings: ModelSettingsRow[];
    catalog: ModelInfo[];
    groupLabels: Record<FeatureGroup, { title: string; description: string }>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const CUSTOM_SENTINEL = '__custom__';

export function ModelSettingsForm({ initialSettings, catalog, groupLabels }: Props) {
    const router = useRouter();

    // Detect any initially-saved model IDs that aren't in the catalog (custom entries).
    function getInitialDraft(s: ModelSettingsRow): ModelSettingsRow {
        const inCatalog = catalog.some((m) => m.provider === s.provider && m.modelId === s.modelId);
        if (!inCatalog && s.provider === 'openrouter') {
            return { ...s, modelId: CUSTOM_SENTINEL };
        }
        return s;
    }

    const [drafts, setDrafts] = useState<Record<FeatureGroup, ModelSettingsRow>>(
        Object.fromEntries(initialSettings.map((s) => [s.featureGroup, getInitialDraft(s)])) as Record<FeatureGroup, ModelSettingsRow>
    );
    // Tracks the free-text model ID for groups using the custom sentinel.
    const [customIds, setCustomIds] = useState<Partial<Record<FeatureGroup, string>>>(
        Object.fromEntries(
            initialSettings
                .filter((s) => s.provider === 'openrouter' && !catalog.some((m) => m.provider === s.provider && m.modelId === s.modelId))
                .map((s) => [s.featureGroup, s.modelId])
        )
    );
    const [saved, setSaved] = useState(initialSettings);
    const [busy, setBusy] = useState<Record<FeatureGroup, SaveState>>({} as Record<FeatureGroup, SaveState>);
    const [errors, setErrors] = useState<Record<FeatureGroup, string | null>>({} as Record<FeatureGroup, string | null>);

    const providers = useMemo(() => Array.from(new Set(catalog.map((m) => m.provider))), [catalog]);
    const modelsByProvider = useMemo(() => {
        const map: Record<string, ModelInfo[]> = {};
        for (const p of providers) map[p] = catalog.filter((m) => m.provider === p);
        return map;
    }, [providers, catalog]);

    // Resolve the effective model ID for a group (custom sentinel → actual custom ID)
    function effectiveModelId(group: FeatureGroup): string {
        const draft = drafts[group];
        if (draft.modelId === CUSTOM_SENTINEL) return customIds[group] ?? '';
        return draft.modelId;
    }

    function isDirty(group: FeatureGroup): boolean {
        const draft = drafts[group];
        const original = saved.find((s) => s.featureGroup === group);
        if (!original) return true;
        const effectiveId = effectiveModelId(group);
        return draft.provider !== original.provider || effectiveId !== original.modelId;
    }

    function updateDraft(group: FeatureGroup, patch: Partial<ModelSettingsRow>) {
        setDrafts((prev) => {
            const next = { ...prev[group], ...patch } as ModelSettingsRow;
            if (patch.provider && patch.provider !== prev[group].provider) {
                // Snap to first model in the new provider's list
                const firstForProvider = modelsByProvider[patch.provider]?.[0];
                if (firstForProvider) next.modelId = firstForProvider.modelId;
            }
            return { ...prev, [group]: next };
        });
        setBusy((b) => ({ ...b, [group]: 'idle' }));
        setErrors((e) => ({ ...e, [group]: null }));
    }

    function updateCustomId(group: FeatureGroup, value: string) {
        setCustomIds((prev) => ({ ...prev, [group]: value }));
        setBusy((b) => ({ ...b, [group]: 'idle' }));
        setErrors((e) => ({ ...e, [group]: null }));
    }

    async function save(group: FeatureGroup) {
        const draft = drafts[group];
        const modelId = effectiveModelId(group);

        if (!modelId) {
            setErrors((e) => ({ ...e, [group]: 'Enter a model ID before saving.' }));
            return;
        }

        setBusy((b) => ({ ...b, [group]: 'saving' }));
        setErrors((e) => ({ ...e, [group]: null }));

        try {
            const res = await fetch('/api/admin/models', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...draft, modelId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');

            setSaved((prev) => prev.map((s) => (s.featureGroup === group ? { ...draft, modelId } : s)));
            setBusy((b) => ({ ...b, [group]: 'saved' }));
            setTimeout(() => setBusy((b) => ({ ...b, [group]: 'idle' })), 1500);
            router.refresh();
        } catch (err) {
            setBusy((b) => ({ ...b, [group]: 'error' }));
            setErrors((e) => ({ ...e, [group]: err instanceof Error ? err.message : 'Save failed' }));
        }
    }

    return (
        <div className="space-y-3">
            {Object.entries(groupLabels).map(([key, meta]) => {
                const group = key as FeatureGroup;
                const draft = drafts[group];
                if (!draft) {
                    return (
                        <div key={group} className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-4 text-sm text-yellow-300">
                            <AlertTriangle className="mr-2 inline h-4 w-4" />
                            Missing <code>model_settings</code> row for <code>{group}</code>. Re-run the Phase 1 migration.
                        </div>
                    );
                }

                const isCustom = draft.modelId === CUSTOM_SENTINEL;
                const effectiveId = effectiveModelId(group);
                const info = catalog.find((m) => m.provider === draft.provider && m.modelId === effectiveId);
                const dirty = isDirty(group);
                const state = busy[group] ?? 'idle';

                return (
                    <div key={group} className="rounded-lg border border-gray-700 bg-[#252526] p-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            {/* Group label */}
                            <div className="lg:col-span-4">
                                <h3 className="text-sm font-semibold text-white">{meta.title}</h3>
                                <p className="mt-1 text-xs text-gray-400">{meta.description}</p>
                            </div>

                            {/* Provider */}
                            <div className="lg:col-span-2">
                                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Provider</label>
                                <select
                                    value={draft.provider}
                                    onChange={(e) => updateDraft(group, { provider: e.target.value as Provider })}
                                    className="w-full rounded-md border border-gray-700 bg-[#1e1e1e] px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                                >
                                    {providers.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Model */}
                            <div className="lg:col-span-3">
                                <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-500">Model</label>
                                <select
                                    value={draft.modelId}
                                    onChange={(e) => updateDraft(group, { modelId: e.target.value })}
                                    className="w-full rounded-md border border-gray-700 bg-[#1e1e1e] px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                                >
                                    {(modelsByProvider[draft.provider] ?? []).map((m) => (
                                        <option key={m.modelId} value={m.modelId}>
                                            {m.label}
                                        </option>
                                    ))}
                                    {/* OpenRouter: allow any model ID not yet in the catalog */}
                                    {draft.provider === 'openrouter' && (
                                        <option value={CUSTOM_SENTINEL}>Enter custom model ID…</option>
                                    )}
                                </select>

                                {/* Custom model ID input — shown when sentinel is selected */}
                                {isCustom && (
                                    <input
                                        type="text"
                                        value={customIds[group] ?? ''}
                                        onChange={(e) => updateCustomId(group, e.target.value)}
                                        placeholder="e.g. openai/o3-mini"
                                        className="mt-1.5 w-full rounded-md border border-blue-600 bg-[#1e1e1e] px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-400"
                                    />
                                )}
                            </div>

                            {/* Cost + save */}
                            <div className="lg:col-span-3 flex flex-col items-stretch justify-between gap-2 lg:items-end">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500">~$/1M tok</div>
                                    {info ? (
                                        <div className="text-sm text-gray-200">
                                            <span className="text-gray-400">in</span> ${info.inputPer1M}
                                            <span className="mx-1 text-gray-600">·</span>
                                            <span className="text-gray-400">out</span> ${info.outputPer1M}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">—</div>
                                    )}
                                </div>
                                <button
                                    onClick={() => save(group)}
                                    disabled={!dirty || state === 'saving'}
                                    className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                        state === 'saved'
                                            ? 'bg-green-700 text-white'
                                            : dirty
                                              ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {state === 'saving' ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : state === 'saved' ? (
                                        <Check className="h-3.5 w-3.5" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5" />
                                    )}
                                    {state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving' : dirty ? 'Save' : 'Saved'}
                                </button>
                            </div>
                        </div>

                        {/* Model notes */}
                        {info?.notes && (
                            <p className="mt-3 border-t border-gray-700/50 pt-2 text-xs italic text-gray-500">{info.notes}</p>
                        )}
                        {/* Custom model hint */}
                        {isCustom && !info && (
                            <p className="mt-3 border-t border-gray-700/50 pt-2 text-xs text-gray-500">
                                Pricing data unavailable for custom models — check{' '}
                                <span className="text-gray-400">openrouter.ai/models</span> for current rates.
                            </p>
                        )}
                        {errors[group] && (
                            <p className="mt-2 text-xs text-red-400">{errors[group]}</p>
                        )}
                    </div>
                );
            })}
            <p className="pt-2 text-[11px] text-gray-500">
                Prices are approximate references for cost comparison only — confirm current rates with the provider before relying on them for billing decisions.
            </p>
        </div>
    );
}
