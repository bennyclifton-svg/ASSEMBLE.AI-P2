'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, FolderClosed, Home, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Entry {
    name: string;
    path: string;
}

interface BrowseResponse {
    path: string;
    parent: string | null;
    isRoot: boolean;
    entries: Entry[];
    home: string;
    separator: string;
    error?: string;
}

interface Props {
    open: boolean;
    initialPath: string;
    onClose: () => void;
    onSelect: (path: string) => void;
}

export function FolderBrowserModal({ open, initialPath, onClose, onSelect }: Props) {
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [data, setData] = useState<BrowseResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            void browse(initialPath);
        }
    }, [open, initialPath]);

    async function browse(target: string) {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/admin/storage/browse?path=${encodeURIComponent(target)}`
            );
            const json = (await response.json()) as BrowseResponse;
            if (!response.ok || json.error) {
                setError(json.error || 'Could not open folder');
                if (json.path) setCurrentPath(json.path);
                return;
            }
            setData(json);
            setCurrentPath(json.path);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not open folder');
        } finally {
            setLoading(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="sitewise-card relative z-10 flex max-h-[80vh] w-[min(640px,92vw)] flex-col bg-white">
                <div className="flex items-center justify-between border-b border-[var(--sw-rule-2)] px-4 py-3">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sw-ink)]">
                        Select upload folder
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="sitewise-icon-button"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 border-b border-[var(--sw-rule-2)] px-4 py-2">
                    <button
                        type="button"
                        onClick={() => data?.parent && browse(data.parent)}
                        disabled={!data?.parent || loading}
                        className="sitewise-icon-button"
                        title="Parent folder"
                        aria-label="Go up one folder"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => data && browse(data.home)}
                        disabled={loading}
                        className="sitewise-icon-button"
                        title="Home"
                        aria-label="Home folder"
                    >
                        <Home className="h-4 w-4" />
                    </button>
                    <input
                        type="text"
                        value={currentPath}
                        onChange={(event) => setCurrentPath(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                void browse(currentPath);
                            }
                        }}
                        className="min-h-[30px] flex-1 border px-2 py-1 font-mono text-[11px]"
                        placeholder="Type a path and press Enter"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center gap-2 px-4 py-4 font-mono text-xs text-[var(--sw-muted)]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading
                        </div>
                    )}
                    {error && !loading && (
                        <div className="px-4 py-4 font-mono text-xs text-[var(--sw-rose-dk)]">
                            {error}
                        </div>
                    )}
                    {!loading && !error && data && (
                        <ul className="divide-y divide-[var(--sw-rule-2)]">
                            {data.entries.length === 0 ? (
                                <li className="px-4 py-3 font-mono text-[11px] text-[var(--sw-muted)]">
                                    No subfolders here.
                                </li>
                            ) : (
                                data.entries.map((entry) => (
                                    <li key={entry.path}>
                                        <button
                                            type="button"
                                            onClick={() => browse(entry.path)}
                                            className={cn(
                                                'flex w-full items-center gap-2 px-4 py-2 text-left font-mono text-[11px] text-[var(--sw-ink)]',
                                                'hover:bg-[var(--sw-rose-tint)]'
                                            )}
                                        >
                                            <FolderClosed className="h-3.5 w-3.5 flex-shrink-0 text-[var(--sw-muted)]" />
                                            <span className="truncate">{entry.name}</span>
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[var(--sw-rule-2)] px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="sitewise-button sitewise-button-muted"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSelect(currentPath);
                            onClose();
                        }}
                        disabled={!currentPath || loading}
                        className="sitewise-button sitewise-button-primary"
                    >
                        Use this folder
                    </button>
                </div>
            </div>
        </div>
    );
}
