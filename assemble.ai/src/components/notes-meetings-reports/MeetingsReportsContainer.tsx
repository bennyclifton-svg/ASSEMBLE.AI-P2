/**
 * Meetings & Reports Container Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Register/detail view for meeting and report groups. The selected register row
 * opens the existing meeting/report panel on the right, preserving versions,
 * attachment handling, copy/delete, and PDF/DOCX export controls.
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { mutate as globalMutate } from 'swr';
import { MeetingsPanel } from './MeetingsPanel';
import { ReportsPanel } from './ReportsPanel';
import { useMeetingGroups, type MeetingGroup } from '@/lib/hooks/use-meeting-groups';
import { useReportGroups, type ReportGroup } from '@/lib/hooks/use-report-groups';
import { cn } from '@/lib/utils';

interface MeetingsReportsContainerProps {
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
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    className?: string;
}

type RegisterKind = 'meeting' | 'report';

interface ActiveRegisterItem {
    kind: RegisterKind;
    id: string;
}

interface RegisterItem extends ActiveRegisterItem {
    typeLabel: string;
    name: string;
    state: string;
    accent: string;
}

const muted = 'var(--sw-muted)';

function slugifyProjectName(projectName: string): string {
    return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function deriveProfileCompletion(args: {
    buildingClass?: string | null;
    projectType?: string | null;
    profile?: MeetingsReportsContainerProps['profileData'];
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

function MeetingsReportsBreadcrumb({
    projectName,
    activeCrumb,
}: {
    projectName: string;
    activeCrumb: string;
}) {
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
            <span style={{ color: 'var(--sw-ink)' }}>MEET & REPORT</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span style={{ color: 'var(--sw-ink)' }}>{activeCrumb}</span>
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

function toMeetingItem(group: MeetingGroup): RegisterItem {
    return {
        kind: 'meeting',
        id: group.id,
        typeLabel: 'meeting',
        name: group.title || `Meeting ${group.groupNumber}`,
        state: 'versions',
        accent: 'var(--sw-cyan)',
    };
}

function toReportItem(group: ReportGroup): RegisterItem {
    return {
        kind: 'report',
        id: group.id,
        typeLabel: 'report',
        name: group.title || `Report ${group.groupNumber}`,
        state: 'versions',
        accent: 'var(--sw-lav)',
    };
}

function isSameItem(a: ActiveRegisterItem | null, b: ActiveRegisterItem): boolean {
    return a?.kind === b.kind && a.id === b.id;
}

export function MeetingsReportsContainer({
    projectId,
    projectName = 'project',
    buildingClass,
    projectType,
    profileData,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    className,
}: MeetingsReportsContainerProps) {
    const {
        groups: meetingGroups,
        isLoading: isLoadingMeetingGroups,
        createGroup: createMeetingGroup,
        renameGroup: renameMeetingGroup,
        deleteGroup: deleteMeetingGroup,
    } = useMeetingGroups(projectId);

    const {
        groups: reportGroups,
        isLoading: isLoadingReportGroups,
        createGroup: createReportGroup,
        renameGroup: renameReportGroup,
        deleteGroup: deleteReportGroup,
    } = useReportGroups(projectId);

    const [activeItem, setActiveItem] = useState<ActiveRegisterItem | null>(null);
    const [editingItem, setEditingItem] = useState<ActiveRegisterItem | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    const registerItems = useMemo<RegisterItem[]>(() => ([
        ...meetingGroups.map(toMeetingItem),
        ...reportGroups.map(toReportItem),
    ]), [meetingGroups, reportGroups]);

    const effectiveActiveItem = useMemo<ActiveRegisterItem | null>(() => {
        if (activeItem && registerItems.some((item) => isSameItem(activeItem, item))) {
            return activeItem;
        }

        const first = registerItems[0];
        return first ? { kind: first.kind, id: first.id } : null;
    }, [activeItem, registerItems]);

    const profileCompletionPct = useMemo(
        () => deriveProfileCompletion({ buildingClass, projectType, profile: profileData }),
        [buildingClass, projectType, profileData]
    );

    const activeRegisterItem = useMemo(
        () => registerItems.find((item) => effectiveActiveItem && isSameItem(effectiveActiveItem, item)) ?? null,
        [effectiveActiveItem, registerItems]
    );

    const activeMeetingGroup = effectiveActiveItem?.kind === 'meeting'
        ? meetingGroups.find((group) => group.id === effectiveActiveItem.id) ?? null
        : null;
    const activeReportGroup = effectiveActiveItem?.kind === 'report'
        ? reportGroups.find((group) => group.id === effectiveActiveItem.id) ?? null
        : null;

    const activeCrumb = activeRegisterItem?.typeLabel.toUpperCase() ?? 'ALL';
    const isLoading = isLoadingMeetingGroups || isLoadingReportGroups;

    const handleCreateMeetingGroup = useCallback(async () => {
        const created = await createMeetingGroup();
        if (created) {
            setActiveItem({ kind: 'meeting', id: created.id });
        }
    }, [createMeetingGroup]);

    const handleCreateReportGroup = useCallback(async () => {
        const created = await createReportGroup();
        if (created) {
            setActiveItem({ kind: 'report', id: created.id });
        }
    }, [createReportGroup]);

    const handleDeleteMeetingGroup = useCallback(async (groupId: string) => {
        const deleted = await deleteMeetingGroup(groupId);
        if (deleted && effectiveActiveItem?.kind === 'meeting' && effectiveActiveItem.id === groupId) {
            setActiveItem(null);
        }
    }, [deleteMeetingGroup, effectiveActiveItem]);

    const handleDeleteReportGroup = useCallback(async (groupId: string) => {
        const deleted = await deleteReportGroup(groupId);
        if (deleted && effectiveActiveItem?.kind === 'report' && effectiveActiveItem.id === groupId) {
            setActiveItem(null);
        }
    }, [deleteReportGroup, effectiveActiveItem]);

    const handleSaveTransmittal = useCallback(async (type: RegisterKind, id: string) => {
        if (!selectedDocumentIds) return;

        const endpoint = type === 'meeting'
            ? `/api/meetings/${id}/transmittal`
            : `/api/project-reports/${id}/transmittal`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: selectedDocumentIds }),
            });

            if (!response.ok) return;
            globalMutate(endpoint);
        } catch (err) {
            console.error(`[MeetingsReportsContainer] Error saving transmittal for ${type}:`, err);
        }
    }, [selectedDocumentIds]);

    const beginEdit = useCallback((item: RegisterItem) => {
        setActiveItem({ kind: item.kind, id: item.id });
        setEditingItem({ kind: item.kind, id: item.id });
        setDraftTitle(item.name);
        requestAnimationFrame(() => {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        });
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingItem(null);
        setDraftTitle('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editingItem) return;
        const target = registerItems.find((item) => isSameItem(editingItem, item));
        const next = draftTitle.trim();
        setEditingItem(null);
        if (!target || !next || next === target.name) return;
        if (editingItem.kind === 'meeting') {
            await renameMeetingGroup(editingItem.id, next);
        } else {
            await renameReportGroup(editingItem.id, next);
        }
    }, [draftTitle, editingItem, registerItems, renameMeetingGroup, renameReportGroup]);

    const handleLoadTransmittal = useCallback(async (type: RegisterKind, id: string) => {
        const endpoint = type === 'meeting'
            ? `/api/meetings/${id}/transmittal`
            : `/api/project-reports/${id}/transmittal`;

        try {
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                const documentIds = data.documents?.map((doc: { documentId: string }) => doc.documentId) || [];
                onSetSelectedDocumentIds?.(documentIds);
            }
        } catch (err) {
            console.error(`[MeetingsReportsContainer] Error loading transmittal for ${type}:`, err);
        }
    }, [onSetSelectedDocumentIds]);

    const detailPanel = activeMeetingGroup ? (
        <MeetingsPanel
            key={activeMeetingGroup.id}
            projectId={projectId}
            groupId={activeMeetingGroup.id}
            groupTitle={activeMeetingGroup.title}
            onRenameGroup={(newTitle) => renameMeetingGroup(activeMeetingGroup.id, newTitle)}
            onDeleteGroup={() => handleDeleteMeetingGroup(activeMeetingGroup.id)}
            onSaveTransmittal={(meetingId) => handleSaveTransmittal('meeting', meetingId)}
            onLoadTransmittal={(meetingId) => handleLoadTransmittal('meeting', meetingId)}
            displayMode="detail"
        />
    ) : activeReportGroup ? (
        <ReportsPanel
            key={activeReportGroup.id}
            projectId={projectId}
            groupId={activeReportGroup.id}
            groupTitle={activeReportGroup.title}
            onRenameGroup={(newTitle) => renameReportGroup(activeReportGroup.id, newTitle)}
            onDeleteGroup={() => handleDeleteReportGroup(activeReportGroup.id)}
            onSaveTransmittal={(reportId) => handleSaveTransmittal('report', reportId)}
            onLoadTransmittal={(reportId) => handleLoadTransmittal('report', reportId)}
            displayMode="detail"
        />
    ) : (
        <section
            className="flex min-h-[420px] items-center justify-center border border-[var(--sw-rule)] bg-white px-6 text-center"
            style={{ fontFamily: 'var(--sw-font-mono)', color: muted }}
        >
            <div>
                <p className="text-xs">No meeting or report selected.</p>
                <p className="mt-2 text-[11px]">Create a meeting or report to begin.</p>
            </div>
        </section>
    );

    return (
        <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
            <header className="flex-shrink-0 px-2 pt-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <MeetingsReportsBreadcrumb projectName={projectName} activeCrumb={activeCrumb} />
                    <div className="flex shrink-0 gap-1.5">
                        <StatusPill label={`profile: ${profileCompletionPct}% complete`} />
                        <StatusPill label="stage: detail design" tone="dark" />
                    </div>
                </div>

                <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 30,
                                fontWeight: 700,
                                letterSpacing: '-0.025em',
                                margin: 0,
                                lineHeight: 1.1,
                                color: 'var(--sw-ink)',
                            }}
                        >
                            Meet & Report
                        </h1>
                        <div
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 12,
                                color: muted,
                                marginTop: 4,
                                minHeight: 18,
                            }}
                        >
                            {meetingGroups.length} meetings / {reportGroups.length} reports
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCreateMeetingGroup}
                            className="inline-flex h-9 items-center gap-1.5 border border-[var(--sw-rose)] bg-[var(--sw-rose)] px-3 text-[11px] font-semibold text-[var(--sw-ink)] transition-colors hover:bg-[var(--sw-rose-dk)] hover:text-white"
                            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.06em' }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            NEW MEETING
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateReportGroup}
                            className="inline-flex h-9 items-center gap-1.5 border border-[var(--sw-ink)] bg-[var(--sw-ink)] px-3 text-[11px] font-semibold text-[var(--sw-paper)] transition-colors hover:bg-transparent hover:text-[var(--sw-ink)]"
                            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.06em' }}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            NEW REPORT
                        </button>
                    </div>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
                    <section
                        className="min-w-0 self-start overflow-hidden"
                        aria-label="Meeting and report register"
                        style={{
                            background: 'rgba(255, 255, 255, 0.72)',
                            border: '1px solid var(--sw-rule)',
                        }}
                    >
                        <div
                            className="grid h-8 grid-cols-[84px_minmax(0,1fr)_74px] items-center border-b border-[var(--sw-rule-2)] px-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.18em',
                                color: 'var(--sw-muted)',
                            }}
                        >
                            <span>type</span>
                            <span>name</span>
                            <span className="text-right">state</span>
                        </div>

                        {registerItems.length > 0 ? (
                            <div>
                                {registerItems.map((item) => {
                                    const isActive = activeRegisterItem ? isSameItem(activeRegisterItem, item) : false;
                                    const isEditing = editingItem ? isSameItem(editingItem, item) : false;

                                    return (
                                        <div
                                            key={`${item.kind}-${item.id}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                if (isEditing) return;
                                                setActiveItem({ kind: item.kind, id: item.id });
                                            }}
                                            onKeyDown={(event) => {
                                                if (isEditing) return;
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    setActiveItem({ kind: item.kind, id: item.id });
                                                }
                                            }}
                                            className={cn(
                                                'grid h-10 w-full cursor-pointer grid-cols-[84px_minmax(0,1fr)_74px] items-center border-b border-l-2 border-[var(--sw-rule-2)] px-3 text-left transition-colors last:border-b-0',
                                                isActive
                                                    ? 'border-l-4 bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)]'
                                                    : 'bg-transparent hover:bg-[var(--sw-paper-2)]'
                                            )}
                                            style={{
                                                borderLeftColor: item.accent,
                                                fontFamily: 'var(--sw-font-mono)',
                                            }}
                                            aria-pressed={isActive}
                                        >
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <span
                                                    aria-hidden="true"
                                                    className="h-1.5 w-1.5 shrink-0"
                                                    style={{ background: item.accent }}
                                                />
                                                <span
                                                    className={cn(
                                                        'truncate text-[10px] font-semibold',
                                                        isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]',
                                                        isActive && 'font-bold'
                                                    )}
                                                    title={item.typeLabel}
                                                >
                                                    {item.typeLabel}
                                                </span>
                                            </span>
                                            {isEditing ? (
                                                <input
                                                    ref={editInputRef}
                                                    value={draftTitle}
                                                    onChange={(event) => setDraftTitle(event.target.value)}
                                                    onBlur={() => {
                                                        void saveEdit();
                                                    }}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onDoubleClick={(event) => event.stopPropagation()}
                                                    onKeyDown={(event) => {
                                                        event.stopPropagation();
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            void saveEdit();
                                                        } else if (event.key === 'Escape') {
                                                            event.preventDefault();
                                                            cancelEdit();
                                                        }
                                                    }}
                                                    className="mx-2 h-7 w-[calc(100%-1rem)] border border-[var(--sw-rule)] bg-white px-1.5 text-[11px] text-[var(--sw-ink)] outline-none focus:border-[var(--sw-rose)]"
                                                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                                                />
                                            ) : (
                                                <span
                                                    className={cn(
                                                        'truncate px-2 text-[11px]',
                                                        isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]',
                                                        isActive && 'font-semibold'
                                                    )}
                                                    title={item.name}
                                                    onDoubleClick={(event) => {
                                                        event.stopPropagation();
                                                        beginEdit(item);
                                                    }}
                                                >
                                                    {item.name}
                                                </span>
                                            )}
                                            <span className={cn(
                                                'flex items-center justify-end gap-1 text-[10px]',
                                                isActive ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'
                                            )}>
                                                <span className="truncate">{item.state}</span>
                                                {isActive ? <Check className="h-3 w-3 shrink-0 text-[var(--sw-paper)]" /> : null}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center px-4 text-center text-xs text-[var(--sw-muted)]">
                                {isLoading ? 'Loading meetings and reports...' : 'No meetings or reports yet.'}
                            </div>
                        )}
                    </section>

                    <div className="min-w-0 overflow-x-auto">
                        {detailPanel}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MeetingsReportsContainer;
