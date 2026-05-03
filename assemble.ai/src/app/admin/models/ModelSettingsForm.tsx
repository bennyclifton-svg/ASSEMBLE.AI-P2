'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelSettingsRow } from './page';
import type { FeatureGroup, Provider } from '@/lib/ai/types';
import type { ModelInfo } from '@/lib/ai/pricing';
import { modelsForProviderRanked } from '@/lib/ai/pricing';

interface RowMeta {
    title: string;
    description: string;
}

interface Props {
    initialSettings: ModelSettingsRow[];
    catalog: ModelInfo[];
    groupLabels: Partial<Record<FeatureGroup, { title: string; description: string }>>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface RowState {
    featureGroup: FeatureGroup;
    meta: RowMeta;
    provider: Provider;
    modelId: string;
    /** True when current draft has not been saved yet. */
    dirty: boolean;
    saveState: SaveState;
    error: string | null;
}

const PROVIDER_ORDER: Provider[] = ['anthropic', 'openai', 'openrouter'];

const PROVIDER_LABELS: Record<Provider, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
};

export function ModelSettingsForm({ initialSettings, catalog: _catalog, groupLabels }: Props) {
    const router = useRouter();

    const initialRows = useMemo<RowState[]>(() => {
        const rows: RowState[] = [];
        for (const s of initialSettings) {
            const meta = groupLabels[s.featureGroup];
            if (!meta) continue;
            rows.push({
                featureGroup: s.featureGroup,
                meta,
                provider: s.provider,
                modelId: s.modelId,
                dirty: false,
                saveState: 'idle',
                error: null,
            });
        }
        return rows;
    }, [initialSettings, groupLabels]);

    const [rows, setRows] = useState<RowState[]>(initialRows);

    function patchRow(featureGroup: FeatureGroup, patch: Partial<RowState>) {
        setRows((prev) => prev.map((r) => (r.featureGroup === featureGroup ? { ...r, ...patch } : r)));
    }

    function selectProvider(featureGroup: FeatureGroup, next: Provider) {
        setRows((prev) =>
            prev.map((r) => {
                if (r.featureGroup !== featureGroup) return r;
                if (r.provider === next) return r;
                // Snap model to cheapest for the new provider (top of the list).
                const ranked = modelsForProviderRanked(next);
                const nextModelId = ranked[0]?.modelId ?? '';
                return {
                    ...r,
                    provider: next,
                    modelId: nextModelId,
                    dirty: true,
                    saveState: 'idle',
                    error: null,
                };
            })
        );
    }

    function selectModel(featureGroup: FeatureGroup, modelId: string) {
        setRows((prev) =>
            prev.map((r) => {
                if (r.featureGroup !== featureGroup) return r;
                if (r.modelId === modelId) return r;
                return {
                    ...r,
                    modelId,
                    dirty: true,
                    saveState: 'idle',
                    error: null,
                };
            })
        );
    }

    async function save(featureGroup: FeatureGroup) {
        const row = rows.find((r) => r.featureGroup === featureGroup);
        if (!row) return;
        if (!row.modelId) {
            patchRow(featureGroup, { error: 'Pick a model before saving.' });
            return;
        }

        patchRow(featureGroup, { saveState: 'saving', error: null });

        try {
            const res = await fetch('/api/admin/models', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureGroup: row.featureGroup,
                    provider: row.provider,
                    modelId: row.modelId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');

            patchRow(featureGroup, { saveState: 'saved', dirty: false });
            setTimeout(() => patchRow(featureGroup, { saveState: 'idle' }), 1500);
            router.refresh();
        } catch (err) {
            patchRow(featureGroup, {
                saveState: 'error',
                error: err instanceof Error ? err.message : 'Save failed',
            });
        }
    }

    return (
        <div className="space-y-3">
            {rows.map((row) => (
                <FeatureGroupRow
                    key={row.featureGroup}
                    row={row}
                    onSelectProvider={(p) => selectProvider(row.featureGroup, p)}
                    onSelectModel={(m) => selectModel(row.featureGroup, m)}
                    onSave={() => save(row.featureGroup)}
                />
            ))}
            <p className="pt-2 text-[11px] text-[var(--color-text-muted)]">
                Prices are approximate references for cost comparison only — confirm current rates with the provider before relying on them for billing decisions.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface RowProps {
    row: RowState;
    onSelectProvider: (p: Provider) => void;
    onSelectModel: (modelId: string) => void;
    onSave: () => void;
}

function FeatureGroupRow({ row, onSelectProvider, onSelectModel, onSave }: RowProps) {
    const rankedModels = useMemo(() => modelsForProviderRanked(row.provider), [row.provider]);
    const selectedInfo = rankedModels.find((m) => m.modelId === row.modelId);

    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* Title + description */}
                <div className="lg:col-span-4">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {row.meta.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {row.meta.description}
                    </p>
                </div>

                {/* Provider — stacked toggle, no dropdown */}
                <div className="lg:col-span-3">
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                        Provider
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {PROVIDER_ORDER.map((p) => {
                            const active = p === row.provider;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => onSelectProvider(p)}
                                    aria-pressed={active}
                                    className={cn(
                                        'rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors',
                                        active
                                            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary-tint)] text-[var(--color-text-primary)]'
                                            : 'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]'
                                    )}
                                >
                                    {PROVIDER_LABELS[p]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Model — full ranked column, no dropdown */}
                <div className="lg:col-span-4">
                    <div className="mb-1.5 flex items-center justify-between">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                            Model
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                            cheapest → most expensive
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        {rankedModels.map((m) => {
                            const active = m.modelId === row.modelId;
                            return (
                                <button
                                    key={m.modelId}
                                    type="button"
                                    onClick={() => onSelectModel(m.modelId)}
                                    aria-pressed={active}
                                    className={cn(
                                        'flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-left text-xs transition-colors',
                                        active
                                            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary-tint)] text-[var(--color-text-primary)]'
                                            : 'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]'
                                    )}
                                >
                                    <span className="truncate font-medium">{m.label}</span>
                                    <span className="flex-shrink-0 text-[10px] text-[var(--color-text-muted)]">
                                        ${m.inputPer1M}/${m.outputPer1M}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Save action */}
                <div className="flex flex-col items-stretch justify-end gap-2 lg:col-span-1">
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!row.dirty || row.saveState === 'saving' || !row.modelId}
                        className={cn(
                            'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                            row.saveState === 'saved'
                                ? 'bg-[var(--color-accent-green)] text-white'
                                : row.dirty && row.modelId
                                  ? 'bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary-hover)]'
                                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
                        )}
                    >
                        {row.saveState === 'saving' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : row.saveState === 'saved' ? (
                            <Check className="h-3.5 w-3.5" />
                        ) : null}
                        {row.saveState === 'saved'
                            ? 'Saved'
                            : row.saveState === 'saving'
                              ? 'Saving'
                              : 'Save'}
                    </button>
                </div>
            </div>

            {/* Notes / errors */}
            {selectedInfo?.notes && (
                <p className="mt-3 border-t border-[var(--color-border-subtle)] pt-2 text-xs italic text-[var(--color-text-secondary)]">
                    {selectedInfo.notes}
                </p>
            )}
            {row.error && (
                <p className="mt-2 text-xs text-red-400">{row.error}</p>
            )}
        </div>
    );
}
