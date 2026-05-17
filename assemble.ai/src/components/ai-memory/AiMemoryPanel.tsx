'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
    AlertCircle,
    Brain,
    Check,
    CircleOff,
    Loader2,
    Pencil,
    Plus,
    Save,
    Trash2,
} from 'lucide-react';
import { useAiMemory, useAiMemoryMutations } from '@/lib/hooks/use-ai-memory';
import { cn } from '@/lib/utils';
import {
    AI_MEMORY_CATEGORIES,
    AI_MEMORY_CATEGORY_LABELS,
    type AiMemoryCategory,
    type AiMemoryEntry,
    type AiMemoryStatus,
} from '@/types/ai-memory';

interface AiMemoryPanelProps {
    projectId: string;
    projectName?: string;
}

interface AiMemoryDraft {
    category: AiMemoryCategory;
    title: string;
    content: string;
    status: AiMemoryStatus;
}

type MemoryFilter = 'all' | AiMemoryStatus;

const emptyDraft: AiMemoryDraft = {
    category: 'preference',
    title: '',
    content: '',
    status: 'active',
};

const muted = 'var(--sw-muted)';

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function formatTimestamp(value: string): string {
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function toDraft(entry: AiMemoryEntry | null): AiMemoryDraft {
    if (!entry) return emptyDraft;
    return {
        category: entry.category,
        title: entry.title,
        content: entry.content,
        status: entry.status,
    };
}

function MemoryBreadcrumb({ projectName, activeLabel }: { projectName: string; activeLabel: string }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2"
            style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 12, color: muted }}
        >
            <span className="shrink-0">{slugifyProjectName(projectName)}</span>
            <span className="shrink-0" style={{ opacity: 0.5 }}>/</span>
            <span className="shrink-0" style={{ color: 'var(--sw-ink)' }}>ai memory</span>
            <span className="shrink-0" style={{ opacity: 0.5 }}>/</span>
            <span className="truncate" style={{ color: 'var(--sw-ink)' }}>{activeLabel}</span>
        </nav>
    );
}

function MemoryStatusPill({ status }: { status: AiMemoryStatus }) {
    const isActive = status === 'active';
    return (
        <span
            className={cn(
                'inline-flex h-6 max-w-[120px] items-center gap-1 border px-2 text-[11px] font-medium',
                isActive
                    ? 'border-[var(--sw-rule)] bg-[var(--sw-paper)] text-[var(--sw-ink)]'
                    : 'border-[var(--sw-rule-2)] bg-transparent text-[var(--sw-muted)]'
            )}
            style={{ fontFamily: 'var(--sw-font-mono)' }}
        >
            {isActive ? <Check className="h-3 w-3 shrink-0" /> : <CircleOff className="h-3 w-3 shrink-0" />}
            <span className="truncate">{isActive ? 'Active' : 'Inactive'}</span>
        </span>
    );
}

function FilterButton({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'h-8 border px-3 text-[11px] font-medium transition-colors',
                active
                    ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                    : 'border-[var(--sw-rule)] bg-transparent text-[var(--sw-muted)] hover:border-[var(--sw-ink)] hover:text-[var(--sw-ink)]'
            )}
            style={{ fontFamily: 'var(--sw-font-mono)' }}
        >
            {children}
        </button>
    );
}

export function AiMemoryPanel({ projectId, projectName = 'project' }: AiMemoryPanelProps) {
    const [filter, setFilter] = useState<MemoryFilter>('active');
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState<AiMemoryDraft>(emptyDraft);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const { entries, activeCount, isLoading, error } = useAiMemory(projectId);
    const { createEntry, updateEntry, deleteEntry } = useAiMemoryMutations(projectId);

    const filteredEntries = useMemo(
        () => entries.filter((entry) => filter === 'all' || entry.status === filter),
        [entries, filter]
    );
    const inactiveCount = entries.length - activeCount;
    const activeEntry = useMemo(
        () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
        [entries, selectedEntryId]
    );
    const activeLabel = isCreating ? 'new' : activeEntry?.title.toLowerCase() ?? 'review';

    useEffect(() => {
        if (isCreating) return;
        if (selectedEntryId && entries.some((entry) => entry.id === selectedEntryId)) return;
        setSelectedEntryId(filteredEntries[0]?.id ?? entries[0]?.id ?? null);
    }, [entries, filteredEntries, isCreating, selectedEntryId]);

    useEffect(() => {
        setDraft(isCreating ? emptyDraft : toDraft(activeEntry));
        setFormError(null);
    }, [activeEntry, isCreating]);

    const beginCreate = useCallback(() => {
        setIsCreating(true);
        setSelectedEntryId(null);
        setDraft(emptyDraft);
        setFormError(null);
    }, []);

    const selectEntry = useCallback((entry: AiMemoryEntry) => {
        setIsCreating(false);
        setSelectedEntryId(entry.id);
        setFormError(null);
    }, []);

    const saveDraft = useCallback(async () => {
        setIsSaving(true);
        setFormError(null);
        try {
            if (isCreating) {
                const created = await createEntry(draft);
                setIsCreating(false);
                setFilter(created.status);
                setSelectedEntryId(created.id);
            } else if (activeEntry) {
                const updated = await updateEntry(activeEntry.id, draft);
                setFilter(updated.status);
                setSelectedEntryId(updated.id);
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to save memory entry');
        } finally {
            setIsSaving(false);
        }
    }, [activeEntry, createEntry, draft, isCreating, updateEntry]);

    const deactivateSelected = useCallback(async () => {
        if (!activeEntry) return;
        setIsDeleting(true);
        setFormError(null);
        try {
            const deleted = await deleteEntry(activeEntry.id);
            setFilter('inactive');
            setSelectedEntryId(deleted.id);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to deactivate memory entry');
        } finally {
            setIsDeleting(false);
        }
    }, [activeEntry, deleteEntry]);

    const canSave = Boolean(draft.title.trim() && draft.content.trim() && !isSaving);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[var(--sw-paper)]">
                <div className="flex items-center gap-2 text-sm text-[var(--sw-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading memory...
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--sw-paper)]">
            <header className="shrink-0 px-2 pt-2">
                <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                    <MemoryBreadcrumb projectName={projectName} activeLabel={activeLabel} />
                    <button
                        type="button"
                        onClick={beginCreate}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)]"
                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        NEW
                    </button>
                </div>

                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1
                            className="text-[30px] font-bold leading-tight text-[var(--sw-ink)]"
                            style={{ fontFamily: 'var(--sw-font-sans)' }}
                        >
                            AI Memory
                        </h1>
                        <div
                            className="mt-1 text-xs text-[var(--sw-muted)]"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                        >
                            {activeCount} active / {inactiveCount} inactive / records and documents override memory
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <FilterButton active={filter === 'active'} onClick={() => setFilter('active')}>
                            ACTIVE
                        </FilterButton>
                        <FilterButton active={filter === 'inactive'} onClick={() => setFilter('inactive')}>
                            INACTIVE
                        </FilterButton>
                        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                            ALL
                        </FilterButton>
                    </div>
                </div>

                <div className="mb-2 flex items-center gap-2 border border-[var(--sw-rule)] bg-white px-3 py-2 text-sm text-[var(--sw-muted)]">
                    <Brain className="h-4 w-4 shrink-0 text-[var(--sw-ink)]" />
                    <span>
                        Advisory preferences and recurring context only. Schema records, files, excerpts, issued artefacts,
                        and current instructions take priority.
                    </span>
                </div>
            </header>

            {error ? (
                <div className="mx-2 flex items-center gap-2 border border-[var(--sw-rose)] bg-[rgba(248,101,122,0.08)] px-3 py-2 text-sm text-[var(--sw-rose-dk)]">
                    <AlertCircle className="h-4 w-4" />
                    {error.message}
                </div>
            ) : null}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden border-t border-[var(--sw-rule)] lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="min-h-0 overflow-y-auto border-r border-[var(--sw-rule)]">
                    {filteredEntries.length === 0 ? (
                        <div className="flex min-h-[240px] items-center justify-center px-6 text-center text-sm text-[var(--sw-muted)]">
                            No {filter === 'all' ? '' : filter} memory entries.
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--sw-rule-2)]">
                            {filteredEntries.map((entry) => {
                                const selected = !isCreating && entry.id === selectedEntryId;
                                return (
                                    <button
                                        type="button"
                                        key={entry.id}
                                        onClick={() => selectEntry(entry)}
                                        className={cn(
                                            'grid w-full min-w-0 gap-2 px-4 py-3 text-left transition-colors hover:bg-white',
                                            selected ? 'bg-white' : 'bg-transparent'
                                        )}
                                    >
                                        <div className="flex min-w-0 items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-[var(--sw-ink)]">
                                                    {entry.title}
                                                </div>
                                                <div
                                                    className="mt-1 text-[11px] uppercase text-[var(--sw-muted)]"
                                                    style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.08em' }}
                                                >
                                                    {AI_MEMORY_CATEGORY_LABELS[entry.category]}
                                                </div>
                                            </div>
                                            <MemoryStatusPill status={entry.status} />
                                        </div>
                                        <p className="line-clamp-2 text-sm text-[var(--sw-muted)]">{entry.content}</p>
                                        <div
                                            className="text-[11px] text-[var(--sw-muted)]"
                                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                                        >
                                            Updated {formatTimestamp(entry.updatedAt)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <section className="min-h-0 overflow-y-auto">
                    {isCreating || activeEntry ? (
                        <form
                            className="grid gap-5 p-5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (canSave) void saveDraft();
                            }}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div
                                        className="mb-1 text-[11px] uppercase text-[var(--sw-muted)]"
                                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.08em' }}
                                    >
                                        {isCreating ? 'new memory' : 'review memory'}
                                    </div>
                                    <h2 className="text-xl font-semibold text-[var(--sw-ink)]">
                                        {isCreating ? 'Add project memory' : activeEntry?.title}
                                    </h2>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {!isCreating && activeEntry ? <MemoryStatusPill status={activeEntry.status} /> : null}
                                    {!isCreating && activeEntry ? (
                                        <button
                                            type="button"
                                            onClick={() => setDraft(toDraft(activeEntry))}
                                            className="inline-flex h-9 w-9 items-center justify-center border border-[var(--sw-rule)] text-[var(--sw-muted)] hover:border-[var(--sw-ink)] hover:text-[var(--sw-ink)]"
                                            title="Reset changes"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_140px]">
                                <label className="grid gap-2 text-sm font-medium text-[var(--sw-ink)]">
                                    Title
                                    <input
                                        value={draft.title}
                                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                                        className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm font-normal text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                        placeholder="e.g. reporting tone"
                                    />
                                </label>
                                <label className="grid gap-2 text-sm font-medium text-[var(--sw-ink)]">
                                    Category
                                    <select
                                        value={draft.category}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                category: event.target.value as AiMemoryCategory,
                                            }))
                                        }
                                        className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm font-normal text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                    >
                                        {AI_MEMORY_CATEGORIES.map((category) => (
                                            <option key={category} value={category}>
                                                {AI_MEMORY_CATEGORY_LABELS[category]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="grid gap-2 text-sm font-medium text-[var(--sw-ink)]">
                                    Status
                                    <select
                                        value={draft.status}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                status: event.target.value as AiMemoryStatus,
                                            }))
                                        }
                                        className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm font-normal text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                            </div>

                            <label className="grid gap-2 text-sm font-medium text-[var(--sw-ink)]">
                                Memory
                                <textarea
                                    value={draft.content}
                                    onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                                    className="min-h-[180px] resize-y border border-[var(--sw-rule)] bg-white px-3 py-2 text-sm font-normal leading-6 text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                    placeholder="Keep this specific enough for the AI to use, and avoid duplicating formal project records."
                                />
                            </label>

                            <div className="grid gap-2 border border-dashed border-[var(--sw-rule)] px-3 py-3 text-sm text-[var(--sw-muted)]">
                                <div className="font-medium text-[var(--sw-ink)]">Advisory boundary</div>
                                <p>
                                    Use memory for preferences, recurring context, assumptions, style choices, and reporting
                                    conventions. Do not use it as the source of truth for scope, dates, budget, approvals,
                                    instructions, or issued artefacts.
                                </p>
                            </div>

                            {formError ? (
                                <div className="flex items-center gap-2 text-sm text-[var(--sw-rose-dk)]">
                                    <AlertCircle className="h-4 w-4" />
                                    {formError}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sw-rule-2)] pt-4">
                                <div
                                    className="text-[11px] text-[var(--sw-muted)]"
                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                >
                                    {activeEntry ? `Created ${formatTimestamp(activeEntry.createdAt)}` : 'Reviewable before reuse'}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isCreating && activeEntry?.status === 'active' ? (
                                        <button
                                            type="button"
                                            onClick={() => void deactivateSelected()}
                                            disabled={isDeleting}
                                            className="inline-flex h-10 items-center gap-1.5 border border-[var(--sw-rule)] px-3 text-[11px] font-semibold text-[var(--sw-muted)] transition-colors hover:border-[var(--sw-rose)] hover:text-[var(--sw-rose-dk)] disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                                        >
                                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                            DEACTIVATE
                                        </button>
                                    ) : null}
                                    <button
                                        type="submit"
                                        disabled={!canSave}
                                        className="inline-flex h-10 items-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-4 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                                    >
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        SAVE
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-[var(--sw-muted)]">
                            No memory selected.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default AiMemoryPanel;
