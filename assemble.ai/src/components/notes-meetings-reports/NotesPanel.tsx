/**
 * Notes Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Sitewise register view for RFIs, reviews, notes, variations, and related
 * project communications. Rows use the same dense selection behaviour as the
 * document repository; the selected row opens in the right-hand editor shell.
 */

'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Bold,
    Check,
    Eye,
    EyeOff,
    FileText,
    Italic,
    List,
    Minus,
    Plus,
    RotateCcw,
    RotateCw,
    Save,
    Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { NotesRow } from './NotesRow';
import { NoteContent } from './NoteContent';
import { getRecordTypeAccent, getRecordTypeColor, getRecordTypeLabel, RECORD_TYPE_ORDER } from './record-style';
import { useNotes, useNoteMutations } from '@/lib/hooks/use-notes';
import { useUiPreferences, type NotesSortDir, type NotesSortField } from '@/lib/hooks/use-ui-preferences';
import { cn } from '@/lib/utils';
import {
    getNoteType,
    type GenerateNoteContentResponse,
    type Note,
    type NoteType,
    type UpdateNoteRequest,
} from '@/types/notes-meetings-reports';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface NotesPanelProps {
    projectId: string;
    projectName?: string;
    buildingClass?: string | null;
    projectType?: string | null;
    profileData?: {
        subclass?: string[];
        scaleData?: Record<string, number>;
        complexity?: Record<string, string | string[]>;
        workScope?: string[];
    };
    onSaveTransmittal?: (noteId: string) => void;
    onLoadTransmittal?: (noteId: string) => void;
    onExpandedChange?: (hasExpanded: boolean) => void;
    className?: string;
}

const DEFAULT_SORT_DIR_BY_FIELD: Record<NotesSortField, NotesSortDir> = {
    date: 'desc',
    type: 'asc',
    name: 'asc',
};

const TYPE_SORT_ORDER: Record<NoteType, number> = RECORD_TYPE_ORDER.reduce((acc, type, index) => {
    acc[type] = index;
    return acc;
}, {} as Record<NoteType, number>);

type DetailViewMode = 'short' | 'long';

const muted = 'var(--sw-muted)';

function createEmptyTypeCounts(): Record<NoteType, number> {
    return RECORD_TYPE_ORDER.reduce((acc, type) => {
        acc[type] = 0;
        return acc;
    }, {} as Record<NoteType, number>);
}

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function deriveProfileCompletion(args: {
    buildingClass?: string | null;
    projectType?: string | null;
    profile?: NotesPanelProps['profileData'];
}): number {
    const { buildingClass, projectType, profile } = args;
    let filled = 0;
    if (buildingClass) filled++;
    if (projectType) filled++;
    if ((profile?.subclass?.length ?? 0) > 0) filled++;
    if (profile?.scaleData?.gfa_sqm != null) filled++;
    if (profile?.scaleData?.storeys != null) filled++;
    if (profile?.scaleData?.units != null) filled++;
    if (profile?.complexity && Object.keys(profile.complexity).length >= 5) filled++;
    if ((profile?.workScope?.length ?? 0) > 0) filled++;
    return Math.round((filled / 8) * 100);
}

function RecordsBreadcrumb({ projectName, recordCrumb }: { projectName: string; recordCrumb: string }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2"
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 12,
                color: muted,
            }}
        >
            <span>{slugifyProjectName(projectName)}</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>RECORDS</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>{recordCrumb}</span>
        </nav>
    );
}

function StatusPill({ label, tone }: { label: string; tone?: 'dark' }) {
    const isDark = tone === 'dark';
    return (
        <span
            style={{
                fontFamily: 'var(--sw-font-mono)',
                fontSize: 11,
                padding: '4px 10px',
                background: isDark ? 'var(--sw-ink)' : 'var(--sw-paper)',
                border: isDark ? '1px solid var(--sw-ink)' : '1px solid var(--sw-rule)',
                color: isDark ? 'var(--sw-paper)' : 'var(--sw-ink)',
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </span>
    );
}

function normaliseSortField(value: unknown): NotesSortField {
    if (value === 'type' || value === 'name') return value;
    return 'date';
}

function normaliseSortDir(value: unknown, field: NotesSortField): NotesSortDir {
    return value === 'asc' || value === 'desc' ? value : DEFAULT_SORT_DIR_BY_FIELD[field];
}

function noteSortTimestamp(note: NoteWithCount): number {
    const date = note.noteDate || note.createdAt;
    const time = date ? new Date(date.includes('T') ? date : `${date}T00:00:00`).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
}

function formatDetailDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isTextEditingTarget(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true';
}

export function NotesPanel({
    projectId,
    projectName = 'project',
    buildingClass,
    projectType,
    profileData,
    onSaveTransmittal,
    onLoadTransmittal,
    onExpandedChange,
    className,
}: NotesPanelProps) {
    const { notes, isLoading, error, refetch } = useNotes({ projectId });
    const { createNote, updateNote, deleteNote, copyNote } = useNoteMutations(projectId);
    const { preferences, updatePreferences } = useUiPreferences(projectId);

    const prefNotes = preferences.notes ?? {};
    const sortField = normaliseSortField(prefNotes.sortField);
    const sortDir = normaliseSortDir(prefNotes.sortDir, sortField);
    const [sortDirByField, setSortDirByField] = useState<Record<NotesSortField, NotesSortDir>>(DEFAULT_SORT_DIR_BY_FIELD);
    const effectiveSortDirByField = useMemo(
        () => ({ ...sortDirByField, [sortField]: sortDir }),
        [sortDirByField, sortField, sortDir]
    );

    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
    const [lastSelectedNoteId, setLastSelectedNoteId] = useState<string | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<Set<NoteType>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        onExpandedChange?.(activeNoteId !== null);
    }, [activeNoteId, onExpandedChange]);

    useEffect(() => {
        const currentIds = new Set(notes.map((note) => note.id));
        setSelectedNoteIds((prev) => {
            const next = new Set([...prev].filter((id) => currentIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
        setActiveNoteId((prev) => (prev && currentIds.has(prev) ? prev : null));
    }, [notes]);

    const sortedNotes = useMemo(() => {
        const direction = sortDir === 'asc' ? 1 : -1;
        return [...(notes as NoteWithCount[])].sort((a, b) => {
            if (sortField === 'type') {
                const typeDiff = TYPE_SORT_ORDER[getNoteType(a.type)] - TYPE_SORT_ORDER[getNoteType(b.type)];
                if (typeDiff !== 0) return typeDiff * direction;
            } else if (sortField === 'name') {
                const nameDiff = a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
                if (nameDiff !== 0) return nameDiff * direction;
            } else {
                const dateDiff = noteSortTimestamp(a) - noteSortTimestamp(b);
                if (dateDiff !== 0) return dateDiff * direction;
                if (!!a.noteDate !== !!b.noteDate) return a.noteDate ? -1 : 1;
            }
            return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
        });
    }, [notes, sortDir, sortField]);

    const visibleNotes = useMemo(() => {
        if (selectedTypes.size === 0) return sortedNotes;
        return sortedNotes.filter((note) => selectedTypes.has(getNoteType(note.type)));
    }, [sortedNotes, selectedTypes]);

    const typeCounts = useMemo(() => {
        const counts = createEmptyTypeCounts();
        notes.forEach((note) => {
            counts[getNoteType(note.type)] += 1;
        });
        return counts;
    }, [notes]);

    const activeNote = useMemo(
        () => visibleNotes.find((note) => note.id === activeNoteId) ?? null,
        [activeNoteId, visibleNotes]
    );

    const profileCompletionPct = useMemo(
        () => deriveProfileCompletion({ buildingClass, projectType, profile: profileData }),
        [buildingClass, projectType, profileData]
    );

    const recordCrumb = useMemo(() => {
        if (activeNote) return getRecordTypeLabel(getNoteType(activeNote.type)).toUpperCase();
        if (selectedTypes.size === 1) {
            const [type] = Array.from(selectedTypes);
            return getRecordTypeLabel(type).toUpperCase();
        }
        return 'ALL';
    }, [activeNote, selectedTypes]);

    const allVisibleSelected = visibleNotes.length > 0 && visibleNotes.every((note) => selectedNoteIds.has(note.id));
    const someVisibleSelected = visibleNotes.some((note) => selectedNoteIds.has(note.id));

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isTextEditingTarget()) return;

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && visibleNotes.length > 0) {
                event.preventDefault();
                const allVisible = new Set(visibleNotes.map((note) => note.id));
                setSelectedNoteIds(allVisible);
                setLastSelectedNoteId(visibleNotes[visibleNotes.length - 1]?.id ?? null);
                return;
            }

            if (event.key === 'Escape' && (selectedNoteIds.size > 0 || activeNoteId)) {
                setSelectedNoteIds(new Set());
                setLastSelectedNoteId(null);
                setActiveNoteId(null);
                return;
            }

            if (event.key === 'Delete' && selectedNoteIds.size > 0) {
                setShowBulkDeleteConfirm(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeNoteId, selectedNoteIds, visibleNotes]);

    const handleCreateNote = useCallback(async (initial?: { title?: string; content?: string }) => {
        const created = await createNote({
            projectId,
            type: 'note',
            color: getRecordTypeColor('note'),
            ...initial,
        });
        setSelectedNoteIds(new Set([created.id]));
        setLastSelectedNoteId(created.id);
        setActiveNoteId(created.id);
        return created;
    }, [createNote, projectId]);

    const handleUpdateNote = useCallback(async (noteId: string, data: Parameters<typeof updateNote>[1]) => {
        await updateNote(noteId, data);
    }, [updateNote]);

    const handleCopyNote = useCallback(async (noteId: string) => {
        const copied = await copyNote(noteId);
        setSelectedNoteIds(new Set([copied.id]));
        setLastSelectedNoteId(copied.id);
        setActiveNoteId(copied.id);
    }, [copyNote]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedNoteIds.size === 0) return;
        setIsBulkDeleting(true);
        try {
            await Promise.all(Array.from(selectedNoteIds).map((noteId) => deleteNote(noteId)));
            setSelectedNoteIds(new Set());
            setLastSelectedNoteId(null);
            setActiveNoteId(null);
            setShowBulkDeleteConfirm(false);
        } finally {
            setIsBulkDeleting(false);
        }
    }, [deleteNote, selectedNoteIds]);

    const handleRequestDeleteNote = useCallback((noteId: string) => {
        setSelectedNoteIds(new Set([noteId]));
        setLastSelectedNoteId(noteId);
        setShowBulkDeleteConfirm(true);
    }, []);

    const handleSortChange = useCallback((field: NotesSortField) => {
        const nextDir = field === sortField
            ? (sortDir === 'asc' ? 'desc' : 'asc')
            : effectiveSortDirByField[field];
        setSortDirByField((prev) => ({ ...prev, [field]: nextDir }));
        updatePreferences({ notes: { sortField: field, sortDir: nextDir, view: 'list' } });
    }, [effectiveSortDirByField, sortDir, sortField, updatePreferences]);

    const handleTypeFilterClick = useCallback((type: NoteType, event: MouseEvent<HTMLButtonElement>) => {
        const additive = event.ctrlKey || event.metaKey;
        setSelectedTypes((prev) => {
            const next = new Set(prev);
            if (additive) {
                if (next.has(type)) next.delete(type);
                else next.add(type);
            } else if (next.size === 1 && next.has(type)) {
                next.clear();
            } else {
                next.clear();
                next.add(type);
            }
            return next;
        });
    }, []);

    const handleSelectNote = useCallback((noteId: string, event: MouseEvent<HTMLTableRowElement>) => {
        const next = new Set(selectedNoteIds);
        const isAlreadySelected = next.has(noteId);

        if (event.shiftKey && lastSelectedNoteId) {
            const start = visibleNotes.findIndex((note) => note.id === lastSelectedNoteId);
            const end = visibleNotes.findIndex((note) => note.id === noteId);
            if (start !== -1 && end !== -1) {
                const low = Math.min(start, end);
                const high = Math.max(start, end);
                visibleNotes.slice(low, high + 1).forEach((note) => next.add(note.id));
            }
            setLastSelectedNoteId(noteId);
            setActiveNoteId(noteId);
        } else if (event.ctrlKey || event.metaKey) {
            if (isAlreadySelected) {
                next.delete(noteId);
                if (activeNoteId === noteId) {
                    const fallbackId = visibleNotes.find((note) => note.id !== noteId && next.has(note.id))?.id ?? null;
                    setActiveNoteId(fallbackId);
                }
            } else {
                next.add(noteId);
                setActiveNoteId(noteId);
            }
            setLastSelectedNoteId(noteId);
        } else {
            next.clear();
            next.add(noteId);
            setLastSelectedNoteId(noteId);
            setActiveNoteId(noteId);
        }

        setSelectedNoteIds(next);
    }, [activeNoteId, lastSelectedNoteId, selectedNoteIds, visibleNotes]);

    const handleToggleSelectAllVisible = useCallback(() => {
        if (visibleNotes.length === 0) return;
        setSelectedNoteIds((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                visibleNotes.forEach((note) => next.delete(note.id));
            } else {
                visibleNotes.forEach((note) => next.add(note.id));
            }
            return next;
        });
        if (allVisibleSelected) {
            setLastSelectedNoteId(null);
            if (activeNoteId && visibleNotes.some((note) => note.id === activeNoteId)) {
                setActiveNoteId(null);
            }
        } else {
            setLastSelectedNoteId(visibleNotes[visibleNotes.length - 1]?.id ?? null);
            setActiveNoteId((prev) => prev ?? visibleNotes[0]?.id ?? null);
        }
    }, [activeNoteId, allVisibleSelected, visibleNotes]);

    if (error) {
        return (
            <div className={cn('flex h-full flex-col', className)} style={{ background: 'var(--sw-paper)' }}>
                <div className="flex flex-1 items-center justify-center p-8">
                    <div className="flex max-w-sm flex-col items-center justify-center border border-[var(--sw-rule)] bg-white p-8 text-center">
                        <div className="mb-4 bg-[var(--sw-rose-tint)] p-4">
                            <AlertCircle className="h-8 w-8 text-[var(--sw-rose-dk)]" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-[var(--sw-ink)]">Failed to load records</h3>
                        <p className="mb-4 text-sm text-[var(--sw-muted)]">There was an error loading your records.</p>
                        <Button variant="outline" onClick={refetch}>
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const selectedCount = selectedNoteIds.size;

    return (
        <div className={cn('flex h-full flex-col', className)} style={{ background: 'var(--sw-paper)' }}>
            <header className="shrink-0 px-4 pt-2 pb-3" style={{ borderBottom: '1px solid var(--sw-rule-2)' }}>
                <div className="mb-2 flex items-center justify-between gap-4">
                    <RecordsBreadcrumb projectName={projectName} recordCrumb={recordCrumb} />
                    <div className="flex gap-1.5">
                        <StatusPill label={`profile: ${profileCompletionPct}% complete`} />
                        <StatusPill label="stage: detail design" tone="dark" />
                    </div>
                </div>

                <div className="mb-2 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <h2
                            className="text-[30px] font-bold leading-none text-[var(--sw-ink)]"
                            style={{ fontFamily: 'var(--sw-font-sans)', letterSpacing: 0 }}
                        >
                            Records
                        </h2>
                        <div className="mt-1 min-h-[18px] text-xs text-[var(--sw-muted)]" style={{ fontFamily: 'var(--sw-font-mono)' }}>
                            {visibleNotes.length} visible / {notes.length} total
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <RecordTypeFilterButton
                        label="all"
                        count={notes.length}
                        selected={selectedTypes.size === 0}
                        onClick={() => setSelectedTypes(new Set())}
                    />
                    {RECORD_TYPE_ORDER.map((type) => {
                        const selected = selectedTypes.has(type);
                        return (
                            <RecordTypeFilterButton
                                key={type}
                                label={getRecordTypeLabel(type)}
                                count={typeCounts[type]}
                                accent={getRecordTypeAccent(type)}
                                selected={selected}
                                onClick={(event) => handleTypeFilterClick(type, event)}
                            />
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => {
                            void handleCreateNote();
                        }}
                        disabled={isLoading}
                        className="ml-auto inline-flex h-7 items-center gap-1.5 bg-[var(--sw-rose)] px-3 text-[11px] font-bold uppercase text-[var(--sw-ink)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New record
                    </button>
                </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(360px,0.82fr)_minmax(520px,1.18fr)]">
                <section className="flex min-h-[260px] min-w-0 flex-col self-start overflow-hidden border border-[var(--sw-rule)] bg-white @container">
                    {isLoading ? (
                        <div className="p-4">
                            <Skeleton className="mb-2 h-8" />
                            <Skeleton className="mb-2 h-8" />
                            <Skeleton className="mb-2 h-8" />
                            <Skeleton className="h-8" />
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 border border-dashed border-[var(--sw-rule)] bg-white m-3">
                            <p className="text-xs text-[var(--sw-muted)]" style={{ fontFamily: 'var(--sw-font-mono)' }}>
                                No records yet.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleCreateNote();
                                }}
                                className="inline-flex items-center gap-1.5 border border-[var(--sw-rule)] px-3 py-1.5 text-[11px] font-semibold uppercase text-[var(--sw-ink)] transition-colors hover:border-[var(--sw-ink)] hover:bg-[var(--sw-rose-tint)]"
                                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                New record
                            </button>
                        </div>
                    ) : visibleNotes.length === 0 ? (
                        <div className="m-3 flex flex-1 items-center justify-center border border-dashed border-[var(--sw-rule)] bg-white">
                            <p className="text-xs text-[var(--sw-muted)]" style={{ fontFamily: 'var(--sw-font-mono)' }}>
                                No records match the current type filter.
                            </p>
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <table
                                className="w-full table-fixed caption-bottom text-[11px]"
                                style={{ fontFamily: 'var(--sw-font-mono)', lineHeight: 1.1 }}
                            >
                                <TableHeader>
                                    <TableRow className="border-[var(--sw-rule-2)] bg-white hover:bg-white">
                                        <TypeSortableHead
                                            className="w-24 !px-3"
                                            label="Type"
                                            active={sortField === 'type'}
                                            dir={sortDir}
                                            onClick={() => handleSortChange('type')}
                                            allVisibleSelected={allVisibleSelected}
                                            someVisibleSelected={someVisibleSelected}
                                            onToggleSelectAll={handleToggleSelectAllVisible}
                                        />
                                        <TableHead
                                            className="cursor-pointer select-none !px-2 text-[10px] font-semibold uppercase text-[var(--sw-muted)] transition-colors hover:text-[var(--sw-ink)]"
                                            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.24em' }}
                                            onClick={() => handleSortChange('name')}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                Name
                                                {sortField === 'name' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                            </span>
                                            {' '}
                                            <span className={selectedCount > 0 ? 'text-[var(--sw-rose)]' : 'text-[var(--sw-muted)]'}>
                                                ({selectedCount > 0 ? selectedCount : visibleNotes.length})
                                            </span>
                                        </TableHead>
                                        <SortableHead
                                            className="w-24 !px-3 text-right"
                                            label="Date"
                                            active={sortField === 'date'}
                                            dir={sortDir}
                                            onClick={() => handleSortChange('date')}
                                        />
                                        <TableHead className="w-8 !px-1 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setShowBulkDeleteConfirm(true)}
                                                disabled={selectedCount === 0 || isBulkDeleting}
                                                className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)] disabled:cursor-not-allowed disabled:opacity-35"
                                                title={selectedCount === 0 ? 'Select records to delete' : `Delete ${selectedCount} selected record${selectedCount !== 1 ? 's' : ''}`}
                                            >
                                                {isBulkDeleting ? <LoaderIcon /> : <Trash className="h-4 w-4" />}
                                            </button>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleNotes.map((note) => (
                                        <NotesRow
                                            key={note.id}
                                            note={note}
                                            projectId={projectId}
                                            isSelected={selectedNoteIds.has(note.id)}
                                            isActive={activeNoteId === note.id}
                                            onSelect={(event) => handleSelectNote(note.id, event)}
                                            onUpdate={(data) => handleUpdateNote(note.id, data)}
                                            onDelete={() => handleRequestDeleteNote(note.id)}
                                        />
                                    ))}
                                </TableBody>
                            </table>
                        </div>
                    )}
                </section>

                <NoteDetailShell
                    note={activeNote}
                    selectedCount={selectedCount}
                    onCreateRecord={handleCreateNote}
                    onUpdate={(data) => activeNote ? handleUpdateNote(activeNote.id, data) : Promise.resolve()}
                    onCopy={() => activeNote ? handleCopyNote(activeNote.id) : Promise.resolve()}
                    onSaveTransmittal={activeNote && onSaveTransmittal ? () => onSaveTransmittal(activeNote.id) : undefined}
                    onLoadTransmittal={activeNote && onLoadTransmittal ? () => onLoadTransmittal(activeNote.id) : undefined}
                    onSaveNewTransmittal={onSaveTransmittal}
                />
            </div>

            <AuroraConfirmDialog
                open={showBulkDeleteConfirm}
                onOpenChange={setShowBulkDeleteConfirm}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedCount} selected record${selectedCount === 1 ? '' : 's'}?`}
                description="This will permanently delete the selected records and their attachments."
            />
        </div>
    );
}

interface SortableHeadProps {
    label: string;
    active: boolean;
    dir: NotesSortDir;
    className?: string;
    onClick: () => void;
}

function SortableHead({ label, active, dir, className, onClick }: SortableHeadProps) {
    return (
        <TableHead
            className={cn(
                'cursor-pointer select-none text-[10px] font-semibold uppercase text-[var(--sw-muted)] transition-colors hover:text-[var(--sw-ink)]',
                className
            )}
            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.24em' }}
            onClick={onClick}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </span>
        </TableHead>
    );
}

interface TypeSortableHeadProps extends SortableHeadProps {
    allVisibleSelected: boolean;
    someVisibleSelected: boolean;
    onToggleSelectAll: () => void;
}

function TypeSortableHead({
    label,
    active,
    dir,
    className,
    onClick,
    allVisibleSelected,
    someVisibleSelected,
    onToggleSelectAll,
}: TypeSortableHeadProps) {
    return (
        <TableHead
            className={cn(
                'select-none text-[10px] font-semibold uppercase text-[var(--sw-muted)]',
                className
            )}
            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.24em' }}
        >
            <span className="inline-flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleSelectAll();
                    }}
                    className={cn(
                        'flex h-3.5 w-3.5 items-center justify-center border transition-colors',
                        someVisibleSelected
                            ? 'border-[var(--sw-rose)] bg-[var(--sw-rose)] text-[var(--sw-ink)]'
                            : 'border-[var(--sw-rule)] bg-white hover:border-[var(--sw-ink)]'
                    )}
                    title={allVisibleSelected ? 'Clear visible selection' : 'Select all visible records'}
                >
                    {allVisibleSelected ? <Check className="h-2.5 w-2.5" /> : someVisibleSelected ? <Minus className="h-2.5 w-2.5" /> : null}
                </button>
                <button
                    type="button"
                    onClick={onClick}
                    className="inline-flex items-center gap-1 transition-colors hover:text-[var(--sw-ink)]"
                >
                    {label}
                    {active && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </button>
            </span>
        </TableHead>
    );
}

interface RecordTypeFilterButtonProps {
    label: string;
    count: number;
    selected: boolean;
    accent?: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function RecordTypeFilterButton({ label, count, selected, accent, onClick }: RecordTypeFilterButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex h-7 items-center gap-1.5 border px-2.5 text-[10px] font-semibold transition-colors',
                selected
                    ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                    : 'border-[var(--sw-rule)] bg-white text-[var(--sw-muted)] hover:border-[var(--sw-ink)] hover:text-[var(--sw-ink)]'
            )}
            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
        >
            {accent && (
                <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0"
                    style={{ background: accent }}
                />
            )}
            <span>{label}</span>
            <span className={selected ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'}>
                {count}
            </span>
        </button>
    );
}

interface NoteDetailShellProps {
    note: NoteWithCount | null;
    selectedCount: number;
    onCreateRecord: (initial?: { title?: string; content?: string }) => Promise<Note>;
    onUpdate: (data: UpdateNoteRequest) => Promise<void>;
    onCopy: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    onSaveNewTransmittal?: (noteId: string) => void;
}

function NoteDetailShell({
    note,
    selectedCount,
    onCreateRecord,
    onUpdate,
    onCopy,
    onSaveTransmittal,
    onLoadTransmittal,
    onSaveNewTransmittal,
}: NoteDetailShellProps) {
    const [viewMode, setViewMode] = useState<DetailViewMode>('long');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreatingDraft, setIsCreatingDraft] = useState(false);
    const [showEmptyAttachments, setShowEmptyAttachments] = useState(true);

    const noteType = note ? getNoteType(note.type) : null;
    const typeAccent = noteType ? getRecordTypeAccent(noteType) : 'var(--sw-rose)';
    const detailDate = note ? formatDetailDate(note.noteDate) : '';

    const handleRefresh = useCallback(async () => {
        if (!note) return;

        setIsRefreshing(true);
        try {
            const response = await fetch('/api/ai/generate-note-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noteId: note.id,
                    projectId: note.projectId,
                    existingContent: note.content || undefined,
                    existingTitle: note.title,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to refresh record content');
            }

            const result: GenerateNoteContentResponse = await response.json();
            await onUpdate({ content: result.content });
            setViewMode('long');
        } catch (error) {
            console.error('[NotesPanel] Failed to refresh record content:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [note, onUpdate]);

    const handleCreateDraft = useCallback(async (initial?: { title?: string; content?: string }) => {
        setIsCreatingDraft(true);
        try {
            return await onCreateRecord(initial);
        } finally {
            setIsCreatingDraft(false);
        }
    }, [onCreateRecord]);

    if (!note || !noteType) {
        return (
            <section className="flex min-h-[260px] min-w-0 flex-col overflow-hidden">
                <div
                    className="flex h-9 items-center gap-2 px-3"
                    style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
                >
                    <span
                        aria-hidden="true"
                        className="inline-block rounded-full"
                        style={{ width: 8, height: 8, background: 'var(--sw-rose)' }}
                    />
                    <span
                        className="text-[10px] font-semibold uppercase"
                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.18em' }}
                    >
                        Record selected
                    </span>
                </div>

                <div
                    className="min-h-0 flex-1 overflow-y-auto bg-white"
                    style={{
                        border: '1px solid var(--sw-rule)',
                        borderTop: 'none',
                        borderLeft: `3px solid ${getRecordTypeAccent('note')}`,
                    }}
                >
                    <div
                        className="flex items-center justify-between gap-3 px-4 py-2"
                        style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                void handleCreateDraft();
                            }}
                            className="min-w-0 text-left"
                        >
                            <div
                                className="truncate text-[10px] font-semibold uppercase text-[var(--sw-muted)]"
                                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.18em' }}
                            >
                                Record type
                            </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <div
                                role="group"
                                aria-label="View mode"
                                className="inline-flex items-center"
                                style={{
                                    border: '1px solid var(--sw-rule)',
                                    fontFamily: 'var(--sw-font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.05em',
                                }}
                            >
                                <DetailViewModeButton
                                    label="Short"
                                    active={viewMode === 'short'}
                                    onClick={() => setViewMode('short')}
                                />
                                <DetailViewModeButton
                                    label="Long"
                                    active={viewMode === 'long'}
                                    onClick={() => setViewMode('long')}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleCreateDraft();
                                }}
                                disabled={isCreatingDraft}
                                title="Refresh record content"
                                aria-label="Refresh record content"
                                className="inline-flex items-center border border-[var(--sw-rule)] bg-transparent px-1.5 py-1 text-[var(--sw-rose-dk)] transition-colors hover:bg-[var(--sw-rose-tint)] disabled:cursor-wait disabled:opacity-55"
                            >
                                <RotateCw className={cn('h-3 w-3', isCreatingDraft && 'animate-spin')} />
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void handleCreateDraft();
                        }}
                        className="block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--sw-paper-2)]"
                        style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                    >
                        <span
                            className="block text-lg font-semibold text-[var(--sw-muted)]"
                            style={{ fontFamily: 'var(--sw-font-sans)' }}
                        >
                            Record title
                        </span>
                    </button>

                    <div
                        className="flex items-center gap-0.5 px-4 py-1"
                        style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                    >
                        {[
                            { title: 'Bold', icon: Bold },
                            { title: 'Italic', icon: Italic },
                            { title: 'Bullet list', icon: List },
                        ].map(({ title, icon: Icon }) => (
                            <button
                                key={title}
                                type="button"
                                onClick={() => {
                                    void handleCreateDraft();
                                }}
                                className="p-1.5 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-ink)]"
                                title={title}
                            >
                                <Icon className="h-4 w-4" />
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void handleCreateDraft();
                        }}
                        className="block min-h-[230px] w-full px-4 py-4 text-left transition-colors hover:bg-[var(--sw-paper-2)]"
                    >
                        <span
                            className="block text-sm leading-7 text-[var(--sw-muted)]"
                            style={{ fontFamily: 'var(--sw-font-body)' }}
                        >
                            Body text. Click here to start a new record.
                        </span>
                    </button>

                    <div className="px-4 py-4" style={{ borderTop: '1px solid var(--sw-rule-2)' }}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div
                                className="text-sm font-semibold uppercase text-[var(--sw-ink)]"
                                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.08em' }}
                            >
                                Attachments
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const created = await handleCreateDraft();
                                        onSaveNewTransmittal?.(created.id);
                                    }}
                                    disabled={isCreatingDraft}
                                    className="inline-flex h-7 items-center gap-1 border border-black/15 bg-black/5 px-2 text-xs font-medium text-black/60 transition-colors hover:bg-[var(--sw-rose-tint)] disabled:cursor-wait disabled:opacity-55"
                                    title="Save selected documents"
                                >
                                    <Save className="h-3 w-3" />
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleCreateDraft();
                                    }}
                                    disabled={isCreatingDraft}
                                    className="inline-flex h-7 items-center gap-1 border border-black/15 bg-black/5 px-2 text-xs font-medium text-black/60 transition-colors hover:bg-[var(--sw-rose-tint)] disabled:cursor-wait disabled:opacity-55"
                                    title="Load attachments"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Load
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEmptyAttachments((prev) => !prev)}
                                    className="inline-flex h-7 w-7 items-center justify-center text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-ink)]"
                                    title={showEmptyAttachments ? 'Hide attachments' : 'Show attachments'}
                                >
                                    {showEmptyAttachments ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>
                        {showEmptyAttachments && (
                            <button
                                type="button"
                                onClick={async () => {
                                    const created = await handleCreateDraft();
                                    onSaveNewTransmittal?.(created.id);
                                }}
                                className="flex min-h-[110px] w-full flex-col items-center justify-center bg-white px-4 text-center text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-paper-2)]"
                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                            >
                                <FileText className="mb-2 h-8 w-8 opacity-45" />
                                <span className="text-sm">No documents attached. Use Save to select documents from the repository.</span>
                                <span className="mt-1 text-xs">Select documents, then use Save</span>
                            </button>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    const meta = [
        getRecordTypeLabel(noteType),
        detailDate || 'No date',
        selectedCount > 1 ? `${selectedCount} selected` : null,
    ].filter(Boolean).join(' / ');

    return (
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div
                className="flex h-9 shrink-0 items-center gap-2 px-3"
                style={{ background: 'var(--sw-ink)', color: 'var(--sw-paper)' }}
            >
                <span
                    aria-hidden="true"
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, background: typeAccent }}
                />
                <span
                    className="text-[10px] font-semibold uppercase"
                    style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.18em' }}
                >
                    Record selected
                </span>
                <span
                    className="ml-auto truncate text-[10px]"
                    style={{ fontFamily: 'var(--sw-font-mono)', color: 'rgba(232,228,218,0.6)' }}
                >
                    {meta}
                </span>
            </div>

            <div
                className="min-h-0 flex-1 overflow-y-auto bg-white"
                style={{
                    border: '1px solid var(--sw-rule)',
                    borderTop: 'none',
                    borderLeft: `3px solid ${typeAccent}`,
                }}
            >
                <div
                    className="flex items-center justify-between gap-3 px-4 py-2"
                    style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                >
                    <div className="min-w-0">
                        <div
                            className="truncate text-[10px] font-semibold uppercase"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                letterSpacing: '0.18em',
                                color: typeAccent,
                            }}
                        >
                            {getRecordTypeLabel(noteType)} record
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <div
                            role="group"
                            aria-label="View mode"
                            className="inline-flex items-center"
                            style={{
                                border: '1px solid var(--sw-rule)',
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.05em',
                            }}
                        >
                            <DetailViewModeButton
                                label="Short"
                                active={viewMode === 'short'}
                                onClick={() => setViewMode('short')}
                            />
                            <DetailViewModeButton
                                label="Long"
                                active={viewMode === 'long'}
                                onClick={() => setViewMode('long')}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            title="Refresh record content"
                            aria-label="Refresh record content"
                            className="inline-flex items-center border border-[var(--sw-rule)] bg-transparent px-1.5 py-1 text-[var(--sw-rose-dk)] transition-colors hover:bg-[var(--sw-rose-tint)] disabled:cursor-wait disabled:opacity-55"
                        >
                            <RotateCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                <NoteContent
                    key={note.id}
                    note={{ ...note, color: getRecordTypeColor(noteType) }}
                    onUpdate={onUpdate}
                    onCopy={onCopy}
                    onSaveTransmittal={onSaveTransmittal}
                    onLoadTransmittal={onLoadTransmittal}
                    hideToolbar={true}
                    surface="sitewise"
                    editorToolbarVariant="mini"
                    showAiToolbar={false}
                    className={cn(
                        'flex min-h-0 flex-col',
                        viewMode === 'long' ? 'min-h-[520px]' : 'min-h-[320px]'
                    )}
                />
            </div>
        </section>
    );
}

interface DetailViewModeButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

function DetailViewModeButton({ label, active, onClick }: DetailViewModeButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="px-2 py-1 transition-colors"
            style={{
                background: active ? 'var(--sw-ink)' : 'transparent',
                color: active ? 'var(--sw-paper)' : 'var(--sw-muted)',
                borderRight: label === 'Short' ? '1px solid var(--sw-rule)' : 'none',
            }}
        >
            {label}
        </button>
    );
}

function LoaderIcon() {
    return <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[var(--sw-muted)] border-t-transparent" />;
}

export default NotesPanel;
