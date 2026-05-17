'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileText, FolderOpen, Hash, Loader2, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilenameStrategy } from '@/lib/storage/settings';
import { FolderBrowserModal } from './FolderBrowserModal';

interface Props {
    initialSettings: {
        resolvedLocalBasePath: string;
        filenameStrategy: FilenameStrategy;
    };
    defaultLocalBasePath: string;
    useSupabaseStorage: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const STRATEGIES: Array<{
    value: FilenameStrategy;
    label: string;
    description: string;
    icon: typeof FileText;
}> = [
    {
        value: 'preserve_original',
        label: 'Original name',
        description: 'Plan Set.pdf',
        icon: FileText,
    },
    {
        value: 'content_hash',
        label: 'Content hash',
        description: 'a64f...91.pdf',
        icon: Hash,
    },
];

export function StorageSettingsForm({ initialSettings, defaultLocalBasePath, useSupabaseStorage }: Props) {
    const router = useRouter();
    const [localBasePath, setLocalBasePath] = useState(initialSettings.resolvedLocalBasePath);
    const [filenameStrategy, setFilenameStrategy] = useState<FilenameStrategy>(initialSettings.filenameStrategy);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [browserOpen, setBrowserOpen] = useState(false);

    const dirty = useMemo(
        () =>
            localBasePath !== initialSettings.resolvedLocalBasePath ||
            filenameStrategy !== initialSettings.filenameStrategy,
        [filenameStrategy, initialSettings.filenameStrategy, initialSettings.resolvedLocalBasePath, localBasePath]
    );

    function resetDefaultPath() {
        setLocalBasePath(defaultLocalBasePath);
        setSaveState('idle');
        setMessage(null);
    }

    async function save() {
        setSaveState('saving');
        setMessage(null);

        try {
            const response = await fetch('/api/admin/storage', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localBasePath,
                    filenameStrategy,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Save failed');

            setSaveState('saved');
            setMessage('Saved');
            setTimeout(() => {
                setSaveState('idle');
                setMessage(null);
            }, 1500);
            router.refresh();
        } catch (error) {
            setSaveState('error');
            setMessage(error instanceof Error ? error.message : 'Save failed');
        }
    }

    return (
        <div className="space-y-4">
            {useSupabaseStorage && (
                <div className="sitewise-info-card p-4 text-sm text-[var(--sw-ink)]">
                    Supabase storage is active. The local folder is used when Supabase storage is disabled.
                </div>
            )}

            <div className="sitewise-card p-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <div className="sitewise-section-label">Upload folder</div>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--sw-muted)]">
                            New local uploads are written to this folder. Existing files keep their saved paths.
                        </p>
                    </div>

                    <div className="lg:col-span-8">
                        <label className="sitewise-section-label mb-2 block" htmlFor="localBasePath">
                            Local path
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                id="localBasePath"
                                type="text"
                                value={localBasePath}
                                onChange={(event) => {
                                    setLocalBasePath(event.target.value);
                                    setSaveState('idle');
                                    setMessage(null);
                                }}
                                className="min-h-[38px] flex-1 border px-3 py-2 font-mono text-xs"
                                placeholder={defaultLocalBasePath}
                            />
                            <button
                                type="button"
                                onClick={() => setBrowserOpen(true)}
                                className="sitewise-button sitewise-button-muted"
                            >
                                <FolderOpen className="h-3.5 w-3.5" />
                                Browse
                            </button>
                            <button
                                type="button"
                                onClick={resetDefaultPath}
                                className="sitewise-button sitewise-button-muted"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Default
                            </button>
                        </div>
                        <div className="mt-2 font-mono text-[10px] text-[var(--sw-muted)]">
                            The app checks that this folder can be created and written to before saving.
                        </div>
                    </div>
                </div>
            </div>

            <div className="sitewise-card p-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <div className="sitewise-section-label">Filename style</div>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--sw-muted)]">
                            Hashes are still stored in the database for integrity checks.
                        </p>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {STRATEGIES.map(({ value, label, description, icon: Icon }) => {
                                const active = filenameStrategy === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setFilenameStrategy(value);
                                            setSaveState('idle');
                                            setMessage(null);
                                        }}
                                        aria-pressed={active}
                                        className={cn(
                                            'flex min-h-[68px] items-center gap-3 border px-3 py-3 text-left transition-colors',
                                            active
                                                ? 'border-[var(--sw-rose)] bg-[var(--sw-rose-tint)] text-[var(--sw-rose-dk)]'
                                                : 'border-[var(--sw-rule)] bg-white text-[var(--sw-muted)] hover:border-[var(--sw-rose)] hover:text-[var(--sw-ink)]'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
                                                {label}
                                            </span>
                                            <span className="mt-1 block truncate font-mono text-[10px] text-[var(--sw-muted)]">
                                                {description}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={cn('min-h-[18px] text-xs', saveState === 'error' ? 'text-[var(--sw-rose-dk)]' : 'text-[var(--sw-muted)]')}>
                    {message}
                </div>
                <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saveState === 'saving'}
                    className={cn(
                        'sitewise-button',
                        dirty ? 'sitewise-button-primary' : 'sitewise-button-muted cursor-not-allowed'
                    )}
                >
                    {saveState === 'saving' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : saveState === 'saved' ? (
                        <Check className="h-3.5 w-3.5" />
                    ) : (
                        <Save className="h-3.5 w-3.5" />
                    )}
                    {saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved' : 'Save'}
                </button>
            </div>

            <FolderBrowserModal
                open={browserOpen}
                initialPath={localBasePath || defaultLocalBasePath}
                onClose={() => setBrowserOpen(false)}
                onSelect={(picked) => {
                    setLocalBasePath(picked);
                    setSaveState('idle');
                    setMessage(null);
                }}
            />
        </div>
    );
}
