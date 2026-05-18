'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Clock, Download, FileText, Link2, Loader2, MessageSquare, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useRfiExportMutations, useRfiExports, useRfiMutations, useRfis } from '@/lib/hooks/use-rfis';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { cn } from '@/lib/utils';
import {
    RFI_FILTER_LABELS,
    RFI_FILTERS,
    RFI_PRIORITIES,
    RFI_PRIORITY_LABELS,
    RFI_STATUSES,
    RFI_STATUS_LABELS,
    type CreateRfiRequest,
    type RfiExportFormat,
    type RfiEvidenceLink,
    type RfiEvidenceTargetType,
    type RfiFilter,
    type RfiIssuedArtefact,
    type RfiPriority,
    type RfiRecord,
    type RfiStatus,
    type UpdateRfiRequest,
    toLocalIsoDate,
} from '@/types/rfi';

interface RfiRegisterPanelProps {
    projectId: string;
    projectName?: string;
    embedded?: boolean;
    // Incrementing counter to trigger RFI create from a parent (e.g. the Records
    // header's "+ New record" button). Ignored when 0/undefined.
    createSignal?: number;
}

interface RfiDraft {
    title: string;
    question: string;
    status: RfiStatus;
    priority: RfiPriority;
    responsibleStakeholderId: string;
    dueDate: string;
}

interface EvidenceCandidate {
    id: string;
    label: string;
}

type EvidenceCandidatesByType = Record<RfiEvidenceTargetType, EvidenceCandidate[]>;

interface ResponseEvidenceOption extends EvidenceCandidate {
    targetType: RfiEvidenceTargetType;
    value: string;
}

interface DocumentCandidateResponse {
    id: string;
    originalName?: string | null;
    drawingName?: string | null;
    drawingNumber?: string | null;
}

interface NoteCandidateResponse {
    id: string;
    title: string;
    type?: string;
}

interface CorrespondenceCandidateResponse {
    id: string;
    subject: string;
}

const emptyDraft: RfiDraft = {
    title: '',
    question: '',
    status: 'draft',
    priority: 'medium',
    responsibleStakeholderId: '',
    dueDate: '',
};

const emptyEvidenceCandidates: EvidenceCandidatesByType = {
    document: [],
    note: [],
    correspondence: [],
};

const emptyResponseDraft = {
    responseText: '',
    responseDate: toLocalIsoDate(),
    evidenceKey: '',
};

const muted = 'var(--sw-muted)';

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function toDraft(rfi: RfiRecord | null): RfiDraft {
    if (!rfi) return emptyDraft;
    return {
        title: rfi.title,
        question: rfi.question,
        status: rfi.status,
        priority: rfi.priority,
        responsibleStakeholderId: rfi.responsibleStakeholderId ?? '',
        dueDate: rfi.dueDate ?? '',
    };
}

function toPayload(draft: RfiDraft): CreateRfiRequest | UpdateRfiRequest {
    return {
        title: draft.title,
        question: draft.question,
        status: draft.status,
        priority: draft.priority,
        responsibleStakeholderId: draft.responsibleStakeholderId || null,
        dueDate: draft.dueDate || null,
    };
}

function formatDueDate(value: string | null): string {
    if (!value) return '-';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatDueDateCompact(value: string | null): string {
    if (!value) return '-';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const yy = String(year).slice(-2);
    return `${dd}/${mm}/${yy}`;
}

function abbreviateResponsibility(label: string): string {
    const trimmed = label.trim();
    if (!trimmed) return '-';
    return trimmed.slice(0, 3).toUpperCase();
}

function documentLabel(document: DocumentCandidateResponse): string {
    const drawingPrefix = document.drawingNumber ? `${document.drawingNumber} - ` : '';
    return `${drawingPrefix}${document.drawingName || document.originalName || document.id}`;
}

function evidenceTypeLabel(targetType: RfiEvidenceTargetType): string {
    if (targetType === 'document') return 'Document';
    if (targetType === 'note') return 'Note';
    return 'Correspondence';
}

function stateLabel(rfi: RfiRecord): string {
    if (rfi.displayState === 'overdue') return 'Overdue';
    if (rfi.displayState === 'due_today') return 'Due today';
    return RFI_STATUS_LABELS[rfi.status];
}

function auditActionLabel(action: string): string {
    if (action === 'response_recorded') return 'Response recorded';
    if (action === 'closed') return 'Closed';
    return 'Reopened';
}

function formatTimestamp(value: string): string {
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatFileSize(value: number): string {
    if (value < 1024) return `${value} B`;
    const kb = value / 1024;
    if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function exportHref(projectId: string, rfiId: string, artefact: RfiIssuedArtefact): string {
    return `/api/projects/${projectId}/rfis/${rfiId}/exports/${artefact.id}`;
}

function RfiBreadcrumb({ projectName, activeLabel }: { projectName: string; activeLabel: string }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2"
            style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 12, color: muted }}
        >
            <span className="shrink-0">{slugifyProjectName(projectName)}</span>
            <span className="shrink-0" style={{ opacity: 0.5 }}>/</span>
            <span className="shrink-0" style={{ color: 'var(--sw-ink)' }}>rfi register</span>
            <span className="shrink-0" style={{ opacity: 0.5 }}>/</span>
            <span className="truncate" style={{ color: 'var(--sw-ink)' }}>{activeLabel}</span>
        </nav>
    );
}

function RegisterStatusPill({ rfi }: { rfi: RfiRecord }) {
    const urgent = rfi.displayState === 'overdue' || rfi.priority === 'urgent';
    return (
        <span
            className={cn(
                'inline-flex h-6 max-w-[120px] items-center gap-1 truncate border px-2 text-[11px] font-medium',
                urgent
                    ? 'border-[var(--sw-rose)] bg-[rgba(248,101,122,0.12)] text-[var(--sw-ink)]'
                    : 'border-[var(--sw-rule)] bg-[var(--sw-shell)] text-[var(--sw-muted)]'
            )}
            style={{ fontFamily: 'var(--sw-font-mono)' }}
        >
            {rfi.displayState === 'overdue' ? <AlertCircle className="h-3 w-3 shrink-0" /> : null}
            <span className="truncate">{stateLabel(rfi)}</span>
        </span>
    );
}

export function RfiRegisterPanel({ projectId, projectName = 'project', embedded = false, createSignal = 0 }: RfiRegisterPanelProps) {
    const [filter, setFilter] = useState<RfiFilter>('all');
    const [selectedRfiId, setSelectedRfiId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState<RfiDraft>(emptyDraft);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [evidenceTargetType, setEvidenceTargetType] = useState<RfiEvidenceTargetType>('document');
    const [evidenceTargetId, setEvidenceTargetId] = useState('');
    const [evidenceCandidates, setEvidenceCandidates] =
        useState<EvidenceCandidatesByType>(emptyEvidenceCandidates);
    const [isEvidenceSaving, setIsEvidenceSaving] = useState(false);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);
    const [responseDraft, setResponseDraft] = useState(emptyResponseDraft);
    const [isLifecycleSaving, setIsLifecycleSaving] = useState(false);
    const [lifecycleError, setLifecycleError] = useState<string | null>(null);
    const [exportingFormat, setExportingFormat] = useState<RfiExportFormat | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    const { rfis, total, isLoading, error } = useRfis({ projectId, filter });
    const {
        createRfi,
        updateRfi,
        recordResponse,
        closeRfi,
        reopenRfi,
        addEvidence,
        removeEvidence,
    } = useRfiMutations(projectId, filter);
    const { generateExport } = useRfiExportMutations(projectId);
    const { stakeholders, isLoading: isLoadingStakeholders } = useStakeholders({ projectId });

    const activeRfi = useMemo(
        () => rfis.find((rfi) => rfi.id === selectedRfiId) ?? null,
        [rfis, selectedRfiId]
    );
    const { issuedArtefacts, latestIssuedArtefact, isLoading: isLoadingExports } = useRfiExports({
        projectId,
        rfiId: activeRfi?.id ?? null,
    });
    const activeLabel = isCreating ? 'new' : activeRfi?.reference.toLowerCase() ?? 'all';
    const enabledStakeholders = useMemo(
        () => stakeholders.filter((stakeholder) => stakeholder.isEnabled !== false),
        [stakeholders]
    );
    const activeEvidenceTargetIds = useMemo(
        () => new Set((activeRfi?.evidenceLinks ?? []).map((link) => `${link.targetType}:${link.targetId}`)),
        [activeRfi]
    );
    const availableEvidenceCandidates = useMemo(
        () =>
            evidenceCandidates[evidenceTargetType].filter(
                (candidate) => !activeEvidenceTargetIds.has(`${evidenceTargetType}:${candidate.id}`)
            ),
        [activeEvidenceTargetIds, evidenceCandidates, evidenceTargetType]
    );
    const responseEvidenceOptions = useMemo<ResponseEvidenceOption[]>(
        () =>
            (Object.entries(evidenceCandidates) as Array<[RfiEvidenceTargetType, EvidenceCandidate[]]>)
                .flatMap(([targetType, candidates]) =>
                    candidates
                        .filter((candidate) => !activeEvidenceTargetIds.has(`${targetType}:${candidate.id}`))
                        .map((candidate) => ({
                            ...candidate,
                            targetType,
                            value: `${targetType}:${candidate.id}`,
                        }))
                ),
        [activeEvidenceTargetIds, evidenceCandidates]
    );
    const editableStatusOptions = useMemo(
        () => RFI_STATUSES.filter((status) => status === 'draft' || status === 'open' || status === draft.status),
        [draft.status]
    );

    useEffect(() => {
        if (isCreating) return;
        if (selectedRfiId && rfis.some((rfi) => rfi.id === selectedRfiId)) return;
        setSelectedRfiId(rfis[0]?.id ?? null);
    }, [isCreating, rfis, selectedRfiId]);

    useEffect(() => {
        if (isCreating) {
            setDraft(emptyDraft);
        } else {
            setDraft(toDraft(activeRfi));
        }
        setSaveError(null);
    }, [activeRfi, isCreating]);

    useEffect(() => {
        let cancelled = false;

        async function loadEvidenceCandidates() {
            try {
                const [documentsResponse, notesResponse, correspondenceResponse] = await Promise.all([
                    fetch(`/api/documents?projectId=${projectId}`),
                    fetch(`/api/notes?projectId=${projectId}`),
                    fetch(`/api/projects/${projectId}/correspondence`),
                ]);

                const [documentsData, notesData, correspondenceData] = await Promise.all([
                    documentsResponse.ok ? documentsResponse.json() : Promise.resolve([]),
                    notesResponse.ok ? notesResponse.json() : Promise.resolve({ notes: [] }),
                    correspondenceResponse.ok ? correspondenceResponse.json() : Promise.resolve({ correspondence: [] }),
                ]);

                if (cancelled) return;

                setEvidenceCandidates({
                    document: (Array.isArray(documentsData) ? documentsData : []).map(
                        (document: DocumentCandidateResponse) => ({
                            id: document.id,
                            label: documentLabel(document),
                        })
                    ),
                    note: ((notesData.notes ?? []) as NoteCandidateResponse[]).map((note) => ({
                        id: note.id,
                        label: note.type === 'rfi' ? `${note.title} (RFI note)` : note.title,
                    })),
                    correspondence: ((correspondenceData.correspondence ?? []) as CorrespondenceCandidateResponse[]).map(
                        (item) => ({
                            id: item.id,
                            label: item.subject,
                        })
                    ),
                });
            } catch {
                if (!cancelled) setEvidenceCandidates(emptyEvidenceCandidates);
            }
        }

        void loadEvidenceCandidates();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    useEffect(() => {
        if (availableEvidenceCandidates.some((candidate) => candidate.id === evidenceTargetId)) return;
        setEvidenceTargetId(availableEvidenceCandidates[0]?.id ?? '');
    }, [availableEvidenceCandidates, evidenceTargetId]);

    useEffect(() => {
        if (responseEvidenceOptions.some((option) => option.value === responseDraft.evidenceKey)) return;
        setResponseDraft((current) => ({ ...current, evidenceKey: '' }));
    }, [responseDraft.evidenceKey, responseEvidenceOptions]);

    useEffect(() => {
        setResponseDraft(emptyResponseDraft);
        setLifecycleError(null);
        setExportError(null);
        setExportingFormat(null);
    }, [activeRfi?.id]);

    const beginCreate = useCallback(() => {
        setIsCreating(true);
        setSelectedRfiId(null);
        setDraft(emptyDraft);
        setSaveError(null);
        setEvidenceError(null);
        setLifecycleError(null);
        setExportError(null);
        setResponseDraft(emptyResponseDraft);
    }, []);

    useEffect(() => {
        if (createSignal > 0) beginCreate();
    }, [createSignal, beginCreate]);

    const selectRfi = useCallback((rfi: RfiRecord) => {
        setIsCreating(false);
        setSelectedRfiId(rfi.id);
        setLifecycleError(null);
    }, []);

    const saveDraft = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            if (isCreating) {
                const created = await createRfi(toPayload(draft) as CreateRfiRequest);
                setIsCreating(false);
                setSelectedRfiId(created.id);
            } else if (activeRfi) {
                const updated = await updateRfi(activeRfi.id, toPayload(draft));
                setSelectedRfiId(updated.id);
            }
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save RFI');
        } finally {
            setIsSaving(false);
        }
    }, [activeRfi, createRfi, draft, isCreating, updateRfi]);

    const addEvidenceLink = useCallback(async () => {
        if (!activeRfi || !evidenceTargetId) return;
        setIsEvidenceSaving(true);
        setEvidenceError(null);
        try {
            const updated = await addEvidence(activeRfi.id, {
                targetType: evidenceTargetType,
                targetId: evidenceTargetId,
            });
            setSelectedRfiId(updated.id);
        } catch (err) {
            setEvidenceError(err instanceof Error ? err.message : 'Failed to add evidence');
        } finally {
            setIsEvidenceSaving(false);
        }
    }, [activeRfi, addEvidence, evidenceTargetId, evidenceTargetType]);

    const removeEvidenceLink = useCallback(async (link: RfiEvidenceLink) => {
        if (!activeRfi) return;
        setIsEvidenceSaving(true);
        setEvidenceError(null);
        try {
            const updated = await removeEvidence(activeRfi.id, link.id);
            setSelectedRfiId(updated.id);
        } catch (err) {
            setEvidenceError(err instanceof Error ? err.message : 'Failed to remove evidence');
        } finally {
            setIsEvidenceSaving(false);
        }
    }, [activeRfi, removeEvidence]);

    const recordRfiResponse = useCallback(async () => {
        if (!activeRfi) return;
        const evidenceOption = responseEvidenceOptions.find((option) => option.value === responseDraft.evidenceKey);
        setIsLifecycleSaving(true);
        setLifecycleError(null);
        try {
            const updated = await recordResponse(activeRfi.id, {
                responseText: responseDraft.responseText,
                responseDate: responseDraft.responseDate,
                evidence: evidenceOption
                    ? { targetType: evidenceOption.targetType, targetId: evidenceOption.id }
                    : null,
            });
            setSelectedRfiId(updated.id);
            setResponseDraft(emptyResponseDraft);
        } catch (err) {
            setLifecycleError(err instanceof Error ? err.message : 'Failed to record response');
        } finally {
            setIsLifecycleSaving(false);
        }
    }, [activeRfi, recordResponse, responseDraft, responseEvidenceOptions]);

    const closeSelectedRfi = useCallback(async () => {
        if (!activeRfi) return;
        setIsLifecycleSaving(true);
        setLifecycleError(null);
        try {
            const updated = await closeRfi(activeRfi.id);
            setSelectedRfiId(updated.id);
        } catch (err) {
            setLifecycleError(err instanceof Error ? err.message : 'Failed to close RFI');
        } finally {
            setIsLifecycleSaving(false);
        }
    }, [activeRfi, closeRfi]);

    const reopenSelectedRfi = useCallback(async () => {
        if (!activeRfi) return;
        setIsLifecycleSaving(true);
        setLifecycleError(null);
        try {
            const updated = await reopenRfi(activeRfi.id);
            setSelectedRfiId(updated.id);
        } catch (err) {
            setLifecycleError(err instanceof Error ? err.message : 'Failed to reopen RFI');
        } finally {
            setIsLifecycleSaving(false);
        }
    }, [activeRfi, reopenRfi]);

    const generateIssuedArtefact = useCallback(async (format: RfiExportFormat) => {
        if (!activeRfi) return;
        setExportingFormat(format);
        setExportError(null);
        try {
            await generateExport(activeRfi.id, { format });
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Failed to generate RFI export');
        } finally {
            setExportingFormat(null);
        }
    }, [activeRfi, generateExport]);

    const canSave = Boolean(draft.title.trim() && draft.question.trim() && !isSaving);
    const canAddEvidence = Boolean(activeRfi && evidenceTargetId && !isEvidenceSaving);
    const canRecordResponse = Boolean(
        activeRfi?.status === 'open' &&
        responseDraft.responseText.trim() &&
        responseDraft.responseDate &&
        !isLifecycleSaving
    );
    const canGenerateExport = Boolean(activeRfi && !exportingFormat);
    const visibleCountLabel = filter === 'all' ? `${total} RFIs` : `${total} shown`;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--sw-shell)]">
            {!embedded && (
                <header className="shrink-0 px-2 pt-2">
                    <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                        <RfiBreadcrumb projectName={projectName} activeLabel={activeLabel} />
                        <button
                            type="button"
                            onClick={beginCreate}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-[var(--sw-cta)] bg-[var(--sw-cta)] px-3 text-[11px] font-semibold text-[var(--sw-cta-fg)] transition-colors hover:bg-[var(--sw-cta-hover)] hover:border-[var(--sw-cta-hover)]"
                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            NEW RFI
                        </button>
                    </div>

                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                            <h1
                                style={{
                                    fontFamily: 'var(--sw-font-sans)',
                                    fontSize: 30,
                                    fontWeight: 700,
                                    margin: 0,
                                    lineHeight: 1.1,
                                    color: 'var(--sw-ink)',
                                }}
                            >
                                RFI Register
                            </h1>
                            <div
                                className="truncate"
                                style={{ fontFamily: 'var(--sw-font-mono)', fontSize: 12, color: muted, marginTop: 4 }}
                            >
                                {visibleCountLabel}
                            </div>
                        </div>

                        <div className="flex max-w-full shrink-0 items-center overflow-x-auto border border-[var(--sw-rule)] bg-white">
                            {RFI_FILTERS.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setFilter(item)}
                                    className={cn(
                                        'h-8 shrink-0 border-r border-[var(--sw-rule)] px-3 text-[11px] last:border-r-0',
                                        filter === item
                                            ? 'bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                                            : 'bg-white text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                    )}
                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                    aria-pressed={filter === item}
                                >
                                    {RFI_FILTER_LABELS[item]}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[260px_minmax(0,1fr)] gap-3 overflow-hidden p-2 xl:grid-cols-[420px_minmax(0,1fr)] xl:grid-rows-1">
                <section
                    className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-[var(--sw-rule)] bg-white"
                    aria-label="RFI register rows"
                >
                    <div
                        className="grid h-8 shrink-0 grid-cols-[64px_minmax(0,1fr)_44px_84px_64px] items-center gap-2 border-b border-[var(--sw-rule-2)] px-3"
                        style={{
                            fontFamily: 'var(--sw-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.14em',
                            color: muted,
                        }}
                    >
                        <span>no.</span>
                        <span>title</span>
                        <span>resp</span>
                        <span>status</span>
                        <span className="text-right">due</span>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-[var(--sw-muted)]" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-[var(--sw-rose-dk)]">
                            {error.message}
                        </div>
                    ) : rfis.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-[var(--sw-muted)]">
                            No RFIs match this view.
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {rfis.map((rfi) => {
                                const isActive = !isCreating && rfi.id === activeRfi?.id;
                                return (
                                    <button
                                        key={rfi.id}
                                        type="button"
                                        onClick={() => selectRfi(rfi)}
                                        className={cn(
                                            'grid h-8 w-full grid-cols-[64px_minmax(0,1fr)_44px_84px_64px] items-center gap-2 border-b border-l-2 border-[var(--sw-rule-2)] px-3 text-left transition-colors last:border-b-0',
                                            isActive
                                                ? 'border-l-[var(--sw-rose)] bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                                                : 'border-l-transparent bg-white hover:bg-[var(--sw-canvas)]'
                                        )}
                                        aria-pressed={isActive}
                                    >
                                        <span
                                            className={cn(
                                                'truncate text-[11px] font-semibold',
                                                isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]'
                                            )}
                                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                                        >
                                            {rfi.reference}
                                        </span>
                                        <span
                                            className={cn(
                                                'truncate text-[12px] font-medium',
                                                isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]'
                                            )}
                                        >
                                            {rfi.title}
                                        </span>
                                        <span
                                            className={cn(
                                                'truncate text-[10px] uppercase tracking-wider',
                                                isActive ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'
                                            )}
                                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            title={rfi.responsiblePartyLabel}
                                        >
                                            {abbreviateResponsibility(rfi.responsiblePartyLabel)}
                                        </span>
                                        <span className="min-w-0">
                                            <RegisterStatusPill rfi={rfi} />
                                        </span>
                                        <span
                                            className={cn(
                                                'truncate text-right text-[11px]',
                                                rfi.displayState === 'overdue'
                                                    ? 'font-semibold text-[var(--sw-rose-dk)]'
                                                    : isActive
                                                      ? 'text-[rgba(232,228,218,0.72)]'
                                                      : 'text-[var(--sw-muted)]'
                                            )}
                                            style={{ fontFamily: 'var(--sw-font-mono)' }}
                                        >
                                            {formatDueDateCompact(rfi.dueDate)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                    <div
                        className="flex h-9 shrink-0 items-center gap-2 px-3"
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
                            Records / RFI
                        </span>
                        <span
                            className="ml-auto truncate text-[10px]"
                            style={{ fontFamily: 'var(--sw-font-mono)', color: 'rgba(232,228,218,0.6)' }}
                        >
                            {activeRfi?.dueDate ? formatDueDate(activeRfi.dueDate) : 'No date'}
                        </span>
                    </div>

                    <div
                        className="min-h-0 flex-1 overflow-y-auto bg-white"
                        style={{
                            border: '1px solid var(--sw-rule)',
                            borderTop: 'none',
                            borderLeft: '3px solid var(--sw-rose)',
                        }}
                    >
                    <div
                        className="flex items-center justify-between gap-3 px-4 py-2"
                        style={{ borderBottom: '1px solid var(--sw-rule-2)' }}
                    >
                        <div className="flex max-w-full shrink-0 items-center overflow-x-auto border border-[var(--sw-rule)] bg-white">
                            {RFI_FILTERS.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setFilter(item)}
                                    className={cn(
                                        'h-8 shrink-0 border-r border-[var(--sw-rule)] px-3 text-[11px] last:border-r-0',
                                        filter === item
                                            ? 'bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                                            : 'bg-white text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                                    )}
                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                    aria-pressed={filter === item}
                                >
                                    {RFI_FILTER_LABELS[item]}
                                </button>
                            ))}
                        </div>
                        {(isCreating || activeRfi) && (
                            <button
                                type="submit"
                                form="rfi-detail-form"
                                disabled={!canSave}
                                className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[var(--sw-rose)] bg-[var(--sw-rose)] px-3 text-[11px] font-semibold text-[var(--sw-ink)] transition-colors hover:bg-[var(--sw-rose-dk)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                SAVE
                            </button>
                        )}
                    </div>

                    {isCreating || activeRfi ? (
                        <form
                            id="rfi-detail-form"
                            className="flex min-h-full flex-col"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (canSave) void saveDraft();
                            }}
                        >

                            <div className="border-b border-[var(--sw-rule-2)] p-4">
                                <div className="min-w-0">
                                    <div
                                        className="text-[11px] uppercase text-[var(--sw-muted)]"
                                        style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
                                    >
                                        {isCreating ? 'new rfi' : activeRfi?.reference}
                                    </div>
                                    <input
                                        value={draft.title}
                                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                                        placeholder="Untitled RFI"
                                        aria-label="RFI title"
                                        className="mt-1 w-full truncate border-0 bg-transparent px-0 text-xl font-semibold text-[var(--sw-ink)] outline-none placeholder:text-[var(--sw-muted)] focus:bg-[var(--sw-paper-2)] focus:px-2"
                                    />
                                </div>
                                {saveError ? (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--sw-rose-dk)]">
                                        <AlertCircle className="h-4 w-4" />
                                        {saveError}
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid gap-4 p-4">
                                <label className="grid gap-1.5">
                                    <span className="text-xs font-medium text-[var(--sw-muted)]">Request / question</span>
                                    <textarea
                                        value={draft.question}
                                        onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
                                        className="min-h-40 resize-y border border-[var(--sw-rule)] bg-white px-3 py-2 text-sm leading-6 text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                        placeholder="Please confirm..."
                                    />
                                </label>

                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <label className="grid gap-1.5">
                                        <span className="text-xs font-medium text-[var(--sw-muted)]">Status</span>
                                        <select
                                            value={draft.status}
                                            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as RfiStatus }))}
                                            className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                            disabled={draft.status === 'responded' || draft.status === 'closed'}
                                        >
                                            {editableStatusOptions.map((status) => (
                                                <option key={status} value={status}>
                                                    {RFI_STATUS_LABELS[status]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="grid gap-1.5">
                                        <span className="text-xs font-medium text-[var(--sw-muted)]">Priority</span>
                                        <select
                                            value={draft.priority}
                                            onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as RfiPriority }))}
                                            className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                        >
                                            {RFI_PRIORITIES.map((priority) => (
                                                <option key={priority} value={priority}>
                                                    {RFI_PRIORITY_LABELS[priority]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="grid gap-1.5">
                                        <span className="text-xs font-medium text-[var(--sw-muted)]">Responsible party</span>
                                        <select
                                            value={draft.responsibleStakeholderId}
                                            onChange={(event) => setDraft((current) => ({ ...current, responsibleStakeholderId: event.target.value }))}
                                            className="h-10 min-w-0 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                            disabled={isLoadingStakeholders}
                                        >
                                            <option value="">Unassigned</option>
                                            {enabledStakeholders.map((stakeholder) => {
                                                const label = stakeholder.disciplineOrTrade || stakeholder.organization || stakeholder.name;
                                                return (
                                                    <option key={stakeholder.id} value={stakeholder.id}>
                                                        {label}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </label>

                                    <label className="grid gap-1.5">
                                        <span className="text-xs font-medium text-[var(--sw-muted)]">Due date</span>
                                        <input
                                            type="date"
                                            value={draft.dueDate}
                                            onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                                            className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                        />
                                    </label>
                                </div>

                                {!isCreating && activeRfi ? (
                                    <section className="grid gap-3 border-t border-[var(--sw-rule-2)] pt-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold text-[var(--sw-ink)]">Response</h3>
                                            <span
                                                className="text-[11px] uppercase text-[var(--sw-muted)]"
                                                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.12em' }}
                                            >
                                                {RFI_STATUS_LABELS[activeRfi.status]}
                                            </span>
                                        </div>

                                        {activeRfi.responseText || activeRfi.responseDate ? (
                                            <div className="grid gap-2 border border-[var(--sw-rule-2)] bg-[var(--sw-shell)] px-3 py-3">
                                                <div
                                                    className="text-[11px] uppercase text-[var(--sw-muted)]"
                                                    style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.12em' }}
                                                >
                                                    {formatDueDate(activeRfi.responseDate)}
                                                </div>
                                                <div className="whitespace-pre-wrap text-sm leading-6 text-[var(--sw-ink)]">
                                                    {activeRfi.responseText || '-'}
                                                </div>
                                            </div>
                                        ) : null}

                                        {activeRfi.status === 'open' ? (
                                            <div className="grid gap-3">
                                                <label className="grid gap-1.5">
                                                    <span className="text-xs font-medium text-[var(--sw-muted)]">Response text</span>
                                                    <textarea
                                                        value={responseDraft.responseText}
                                                        onChange={(event) => setResponseDraft((current) => ({
                                                            ...current,
                                                            responseText: event.target.value,
                                                        }))}
                                                        className="min-h-28 resize-y border border-[var(--sw-rule)] bg-white px-3 py-2 text-sm leading-6 text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                                        placeholder="Response received..."
                                                    />
                                                </label>

                                                <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                                                    <label className="grid gap-1.5">
                                                        <span className="text-xs font-medium text-[var(--sw-muted)]">Response date</span>
                                                        <input
                                                            type="date"
                                                            value={responseDraft.responseDate}
                                                            onChange={(event) => setResponseDraft((current) => ({
                                                                ...current,
                                                                responseDate: event.target.value,
                                                            }))}
                                                            className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                                        />
                                                    </label>

                                                    <label className="grid gap-1.5">
                                                        <span className="text-xs font-medium text-[var(--sw-muted)]">Response evidence</span>
                                                        <select
                                                            value={responseDraft.evidenceKey}
                                                            onChange={(event) => setResponseDraft((current) => ({
                                                                ...current,
                                                                evidenceKey: event.target.value,
                                                            }))}
                                                            className="h-10 min-w-0 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                                        >
                                                            <option value="">No linked evidence</option>
                                                            {responseEvidenceOptions.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {evidenceTypeLabel(option.targetType)} / {option.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() => void recordRfiResponse()}
                                                        disabled={!canRecordResponse}
                                                        className="mt-auto inline-flex h-10 items-center justify-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                    >
                                                        {isLifecycleSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                                                        RECORD
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {activeRfi.status === 'responded' ? (
                                            <button
                                                type="button"
                                                onClick={() => void closeSelectedRfi()}
                                                disabled={isLifecycleSaving}
                                                className="inline-flex h-10 w-fit items-center justify-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            >
                                                {isLifecycleSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                CLOSE
                                            </button>
                                        ) : null}

                                        {activeRfi.status === 'closed' ? (
                                            <button
                                                type="button"
                                                onClick={() => void reopenSelectedRfi()}
                                                disabled={isLifecycleSaving}
                                                className="inline-flex h-10 w-fit items-center justify-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            >
                                                {isLifecycleSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                                REOPEN
                                            </button>
                                        ) : null}

                                        {lifecycleError ? (
                                            <div className="flex items-center gap-2 text-sm text-[var(--sw-rose-dk)]">
                                                <AlertCircle className="h-4 w-4" />
                                                {lifecycleError}
                                            </div>
                                        ) : null}
                                    </section>
                                ) : null}

                                {!isCreating && activeRfi ? (
                                    <section className="grid gap-3 border-t border-[var(--sw-rule-2)] pt-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-[var(--sw-ink)]">Issued artefacts</h3>
                                                <div
                                                    className="mt-0.5 truncate text-[11px] text-[var(--sw-muted)]"
                                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                >
                                                    {isLoadingExports ? 'Loading versions' : `${issuedArtefacts.length} version${issuedArtefacts.length === 1 ? '' : 's'}`}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void generateIssuedArtefact('pdf')}
                                                    disabled={!canGenerateExport}
                                                    className="inline-flex h-9 items-center justify-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                >
                                                    {exportingFormat === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                                                    PDF
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void generateIssuedArtefact('docx')}
                                                    disabled={!canGenerateExport}
                                                    className="inline-flex h-9 items-center justify-center gap-1.5 border border-[var(--sw-rule)] bg-white px-3 text-[11px] font-semibold text-[var(--sw-ink)] transition-colors hover:border-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                >
                                                    {exportingFormat === 'docx' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                                                    DOCX
                                                </button>
                                            </div>
                                        </div>

                                        {latestIssuedArtefact ? (
                                            <div className="flex min-w-0 items-center gap-3 border border-[var(--sw-rule-2)] bg-[var(--sw-shell)] px-3 py-2">
                                                <FileText className="h-4 w-4 shrink-0 text-[var(--sw-muted)]" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium text-[var(--sw-ink)]">
                                                        v{latestIssuedArtefact.versionNumber} / {latestIssuedArtefact.filename}
                                                    </div>
                                                    <div
                                                        className="text-[11px] text-[var(--sw-muted)]"
                                                        style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                    >
                                                        {latestIssuedArtefact.format.toUpperCase()} / {formatFileSize(latestIssuedArtefact.sizeBytes)} / {formatTimestamp(latestIssuedArtefact.generatedAt)}
                                                    </div>
                                                </div>
                                                <a
                                                    href={exportHref(projectId, activeRfi.id, latestIssuedArtefact)}
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sw-rule)] text-[var(--sw-muted)] hover:border-[var(--sw-ink)] hover:text-[var(--sw-ink)]"
                                                    title="Download latest export"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-[var(--sw-rule)] px-3 py-4 text-sm text-[var(--sw-muted)]">
                                                No issued artefacts.
                                            </div>
                                        )}

                                        {issuedArtefacts.length > 1 ? (
                                            <div className="grid gap-2">
                                                {issuedArtefacts.slice(1).map((artefact) => (
                                                    <div
                                                        key={artefact.id}
                                                        className="flex min-w-0 items-center gap-3 border border-[var(--sw-rule-2)] px-3 py-2"
                                                    >
                                                        <Clock className="h-4 w-4 shrink-0 text-[var(--sw-muted)]" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm text-[var(--sw-ink)]">
                                                                v{artefact.versionNumber} / {artefact.filename}
                                                            </div>
                                                            <div
                                                                className="text-[11px] text-[var(--sw-muted)]"
                                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                            >
                                                                {artefact.format.toUpperCase()} / {formatTimestamp(artefact.generatedAt)}
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={exportHref(projectId, activeRfi.id, artefact)}
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sw-rule)] text-[var(--sw-muted)] hover:border-[var(--sw-ink)] hover:text-[var(--sw-ink)]"
                                                            title={`Download v${artefact.versionNumber}`}
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}

                                        {exportError ? (
                                            <div className="flex items-center gap-2 text-sm text-[var(--sw-rose-dk)]">
                                                <AlertCircle className="h-4 w-4" />
                                                {exportError}
                                            </div>
                                        ) : null}
                                    </section>
                                ) : null}

                                {!isCreating && activeRfi ? (
                                    <section className="grid gap-3 border-t border-[var(--sw-rule-2)] pt-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold text-[var(--sw-ink)]">Evidence</h3>
                                            <span
                                                className="text-[11px] text-[var(--sw-muted)]"
                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            >
                                                {activeRfi.evidenceLinks.length}
                                            </span>
                                        </div>

                                        {activeRfi.sourceNote ? (
                                            <div className="flex min-w-0 items-center gap-2 border border-[var(--sw-rule-2)] bg-[var(--sw-shell)] px-3 py-2 text-xs text-[var(--sw-muted)]">
                                                <Link2 className="h-3.5 w-3.5 shrink-0" />
                                                <span className="shrink-0 font-medium text-[var(--sw-ink)]">Source note</span>
                                                <span className="truncate">{activeRfi.sourceNote.title}</span>
                                            </div>
                                        ) : null}

                                        <div className="grid gap-2">
                                            {activeRfi.evidenceLinks.length === 0 ? (
                                                <div className="border border-dashed border-[var(--sw-rule)] px-3 py-4 text-sm text-[var(--sw-muted)]">
                                                    No evidence linked.
                                                </div>
                                            ) : (
                                                activeRfi.evidenceLinks.map((link) => (
                                                    <div
                                                        key={link.id}
                                                        className="flex min-w-0 items-center gap-3 border border-[var(--sw-rule-2)] px-3 py-2"
                                                    >
                                                        <Link2 className="h-4 w-4 shrink-0 text-[var(--sw-muted)]" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-sm font-medium text-[var(--sw-ink)]">
                                                                {link.label}
                                                            </div>
                                                            <div
                                                                className="text-[11px] uppercase text-[var(--sw-muted)]"
                                                                style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.12em' }}
                                                            >
                                                                {evidenceTypeLabel(link.targetType)}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void removeEvidenceLink(link)}
                                                            disabled={isEvidenceSaving}
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--sw-rule)] text-[var(--sw-muted)] hover:border-[var(--sw-rose)] hover:text-[var(--sw-rose-dk)] disabled:opacity-50"
                                                            title="Remove evidence"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_auto]">
                                            <select
                                                value={evidenceTargetType}
                                                onChange={(event) => {
                                                    setEvidenceTargetType(event.target.value as RfiEvidenceTargetType);
                                                    setEvidenceTargetId('');
                                                }}
                                                className="h-10 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                            >
                                                <option value="document">Document</option>
                                                <option value="note">Note</option>
                                                <option value="correspondence">Correspondence</option>
                                            </select>
                                            <select
                                                value={evidenceTargetId}
                                                onChange={(event) => setEvidenceTargetId(event.target.value)}
                                                className="h-10 min-w-0 border border-[var(--sw-rule)] bg-white px-3 text-sm text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                            >
                                                {availableEvidenceCandidates.length === 0 ? (
                                                    <option value="">No available {evidenceTypeLabel(evidenceTargetType).toLowerCase()}</option>
                                                ) : (
                                                    availableEvidenceCandidates.map((candidate) => (
                                                        <option key={candidate.id} value={candidate.id}>
                                                            {candidate.label}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => void addEvidenceLink()}
                                                disabled={!canAddEvidence}
                                                className="inline-flex h-10 items-center justify-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            >
                                                {isEvidenceSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                                                ADD
                                            </button>
                                        </div>

                                        {evidenceError ? (
                                            <div className="flex items-center gap-2 text-sm text-[var(--sw-rose-dk)]">
                                                <AlertCircle className="h-4 w-4" />
                                                {evidenceError}
                                            </div>
                                        ) : null}
                                    </section>
                                ) : null}

                                {!isCreating && activeRfi ? (
                                    <section className="grid gap-3 border-t border-[var(--sw-rule-2)] pt-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold text-[var(--sw-ink)]">Audit history</h3>
                                            <span
                                                className="text-[11px] text-[var(--sw-muted)]"
                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                            >
                                                {activeRfi.auditTrail.length}
                                            </span>
                                        </div>

                                        {activeRfi.auditTrail.length === 0 ? (
                                            <div className="border border-dashed border-[var(--sw-rule)] px-3 py-4 text-sm text-[var(--sw-muted)]">
                                                No audited lifecycle changes.
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                {activeRfi.auditTrail.map((event) => (
                                                    <div
                                                        key={event.id}
                                                        className="grid gap-1 border border-[var(--sw-rule-2)] px-3 py-2 text-sm"
                                                    >
                                                        <div className="flex min-w-0 items-center justify-between gap-3">
                                                            <span className="font-medium text-[var(--sw-ink)]">
                                                                {auditActionLabel(event.action)}
                                                            </span>
                                                            <span
                                                                className="shrink-0 text-[11px] text-[var(--sw-muted)]"
                                                                style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                            >
                                                                {new Intl.DateTimeFormat('en-AU', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                }).format(new Date(event.createdAt))}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-[var(--sw-muted)]">
                                                            {RFI_STATUS_LABELS[event.previousStatus]} to {RFI_STATUS_LABELS[event.newStatus]} / {event.actorName || event.actorId}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                ) : null}

                                {!isCreating && activeRfi ? (
                                    <div className="grid gap-2 border-t border-[var(--sw-rule-2)] pt-4 text-xs text-[var(--sw-muted)] md:grid-cols-3">
                                        <div>
                                            <span className="font-medium text-[var(--sw-ink)]">Reference</span>
                                            <div>{activeRfi.reference}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-[var(--sw-ink)]">Version</span>
                                            <div>{activeRfi.rowVersion}</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Check className="h-3.5 w-3.5" />
                                            <span>{stateLabel(activeRfi)}</span>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </form>
                    ) : (
                        <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-[var(--sw-muted)]">
                            No RFI selected.
                        </div>
                    )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default RfiRegisterPanel;
