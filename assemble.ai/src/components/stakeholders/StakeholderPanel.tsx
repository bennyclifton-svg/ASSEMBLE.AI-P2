'use client';

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Check, Eye, EyeOff, Minus, Plus, Trash, X } from 'lucide-react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { useStakeholderRefresh } from '@/lib/contexts/stakeholder-refresh-context';
import { StakeholderRow } from './StakeholderRow';
import { Skeleton } from '@/components/ui/skeleton';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { cn } from '@/lib/utils';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { getSubgroupsForGroup } from '@/types/stakeholder';
import type {
  StakeholderGroup,
  StakeholderWithStatus,
  SubmissionStatus,
  TenderStatusType,
  UpdateStakeholderRequest,
} from '@/types/stakeholder';

interface StakeholderPanelProps {
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
}

const GROUP_ORDER: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];

const GROUP_LABELS: Record<StakeholderGroup, string> = {
  client: 'Client',
  authority: 'Authority',
  consultant: 'Consultant',
  contractor: 'Contractor',
};

const GROUP_ACCENTS: Record<StakeholderGroup, string> = {
  client: 'var(--sw-rose)',
  authority: 'var(--sw-cyan)',
  consultant: 'var(--sw-lav)',
  contractor: 'var(--sw-peach)',
};

const muted = 'var(--sw-muted)';

function slugifyProjectName(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function deriveProfileCompletion(args: {
  buildingClass?: string | null;
  projectType?: string | null;
  profile?: StakeholderPanelProps['profileData'];
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

function isTextEditingTarget(): boolean {
  const activeElement = document.activeElement;
  return activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.tagName === 'SELECT' ||
    activeElement?.getAttribute('contenteditable') === 'true';
}

function StakeholderBreadcrumb({ projectName, activeCrumb }: { projectName: string; activeCrumb: string }) {
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
      <span style={{ color: 'var(--sw-ink)' }}>STAKEHOLDERS</span>
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

export function StakeholderPanel({
  projectId,
  projectName = 'project',
  buildingClass,
  projectType,
  profileData,
}: StakeholderPanelProps) {
  const {
    stakeholders,
    counts,
    isLoading,
    createStakeholder,
    updateStakeholder,
    updateTenderStatus,
    updateSubmissionStatus,
    deleteStakeholder,
    generateStakeholders,
  } = useStakeholders({ projectId });

  const { triggerRefresh } = useStakeholderRefresh();
  const [isGenerating, setIsGenerating] = useState<StakeholderGroup | null>(null);
  const [quickAddGroup, setQuickAddGroup] = useState<StakeholderGroup | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<StakeholderGroup>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string> | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<StakeholderGroup | null>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchVisibility() {
      try {
        const res = await fetch(`/api/projects/${projectId}/category-visibility`);
        if (res.ok) setVisibility(await res.json());
      } catch {
        // Category visibility is a convenience control; the table can still render without it.
      }
    }
    fetchVisibility();
  }, [projectId]);

  const stakeholdersByGroup = useMemo(() => {
    return GROUP_ORDER.reduce((acc, group) => {
      acc[group] = stakeholders.filter((s) => s.stakeholderGroup === group);
      return acc;
    }, {} as Record<StakeholderGroup, StakeholderWithStatus[]>);
  }, [stakeholders]);

  const visibleGroups = useMemo(
    () => selectedGroups.size === 0
      ? GROUP_ORDER
      : GROUP_ORDER.filter((group) => selectedGroups.has(group)),
    [selectedGroups]
  );

  const visibleStakeholders = useMemo(
    () => visibleGroups.flatMap((group) => stakeholdersByGroup[group]),
    [stakeholdersByGroup, visibleGroups]
  );

  const profileCompletionPct = useMemo(
    () => deriveProfileCompletion({ buildingClass, projectType, profile: profileData }),
    [buildingClass, projectType, profileData]
  );

  const activeCrumb = useMemo(() => {
    if (selectedGroups.size === 1) {
      const [group] = Array.from(selectedGroups);
      return GROUP_LABELS[group].toUpperCase();
    }
    return 'ALL';
  }, [selectedGroups]);

  const selectedCount = selectedIds.size;
  const deleteTargetIds = pendingDeleteIds ?? selectedIds;
  const deleteTargetCount = deleteTargetIds.size;

  useEffect(() => {
    const currentIds = new Set(stakeholders.map((stakeholder) => stakeholder.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    setLastSelectedId((prev) => (prev && currentIds.has(prev) ? prev : null));
  }, [stakeholders]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget()) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && visibleStakeholders.length > 0) {
        event.preventDefault();
        setSelectedIds(new Set(visibleStakeholders.map((stakeholder) => stakeholder.id)));
        setLastSelectedId(visibleStakeholders[visibleStakeholders.length - 1]?.id ?? null);
        return;
      }

      if (event.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
        setLastSelectedId(null);
        return;
      }

      if (event.key === 'Delete' && selectedIds.size > 0) {
        setPendingDeleteIds(null);
        setShowDeleteConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, visibleStakeholders]);

  const toggleVisibility = useCallback(async (categoryId: string) => {
    const current = visibility[categoryId] !== false;
    const newValue = !current;
    setVisibility((prev) => ({ ...prev, [categoryId]: newValue }));
    try {
      await fetch(`/api/projects/${projectId}/category-visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, isVisible: newValue }),
      });
      triggerRefresh();
    } catch {
      setVisibility((prev) => ({ ...prev, [categoryId]: current }));
    }
  }, [projectId, triggerRefresh, visibility]);

  const handleGenerateForGroup = useCallback(async (group: StakeholderGroup) => {
    setIsGenerating(group);
    try {
      await generateStakeholders({
        mode: 'merge',
        groups: [group],
        includeAuthorities: group === 'authority',
        includeContractors: group === 'contractor',
        smartMerge: true,
      });
    } finally {
      setIsGenerating(null);
    }
  }, [generateStakeholders]);

  const handleQuickAddSubmit = useCallback(async (subgroup: string) => {
    if (!quickAddGroup || !subgroup) return;
    await createStakeholder({
      stakeholderGroup: quickAddGroup,
      name: subgroup,
      disciplineOrTrade: subgroup,
      isEnabled: true,
    });
    setQuickAddGroup(null);
  }, [createStakeholder, quickAddGroup]);

  const handleSelect = useCallback((id: string, event: MouseEvent) => {
    const next = new Set(selectedIds);
    const isSelected = next.has(id);

    if (event.shiftKey && lastSelectedId) {
      const start = visibleStakeholders.findIndex((stakeholder) => stakeholder.id === lastSelectedId);
      const end = visibleStakeholders.findIndex((stakeholder) => stakeholder.id === id);
      if (start !== -1 && end !== -1) {
        const low = Math.min(start, end);
        const high = Math.max(start, end);
        visibleStakeholders.slice(low, high + 1).forEach((stakeholder) => next.add(stakeholder.id));
      }
      setLastSelectedId(id);
    } else if (event.ctrlKey || event.metaKey) {
      if (isSelected) next.delete(id);
      else next.add(id);
      setLastSelectedId(id);
    } else if (selectedIds.size === 1 && selectedIds.has(id)) {
      next.clear();
      setLastSelectedId(null);
    } else {
      next.clear();
      next.add(id);
      setLastSelectedId(id);
    }

    setSelectedIds(next);
  }, [lastSelectedId, selectedIds, visibleStakeholders]);

  const handleToggleGroupSelection = useCallback((group: StakeholderGroup) => {
    const groupStakeholders = stakeholdersByGroup[group];
    if (groupStakeholders.length === 0) return;
    const allSelected = groupStakeholders.every((stakeholder) => selectedIds.has(stakeholder.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupStakeholders.forEach((stakeholder) => next.delete(stakeholder.id));
      } else {
        groupStakeholders.forEach((stakeholder) => next.add(stakeholder.id));
      }
      return next;
    });

    setLastSelectedId(allSelected ? null : groupStakeholders[groupStakeholders.length - 1]?.id ?? null);
  }, [selectedIds, stakeholdersByGroup]);

  const handleFilterClick = useCallback((group: StakeholderGroup, event: MouseEvent<HTMLButtonElement>) => {
    const additive = event.ctrlKey || event.metaKey;
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (additive) {
        if (next.has(group)) next.delete(group);
        else next.add(group);
      } else if (next.size === 1 && next.has(group)) {
        next.clear();
      } else {
        next.clear();
        next.add(group);
      }
      return next;
    });
  }, []);

  const handleRequestDeleteStakeholder = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setLastSelectedId(id);
    setPendingDeleteIds(new Set([id]));
    setShowDeleteConfirm(true);
  }, []);

  const handleRequestDeleteIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(new Set(ids));
    setShowDeleteConfirm(true);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (deleteTargetIds.size === 0) return;
    const idsToDelete = Array.from(deleteTargetIds);
    setIsBulkDeleting(true);
    try {
      await Promise.all(idsToDelete.map((id) => deleteStakeholder(id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
      setLastSelectedId(null);
      setPendingDeleteIds(null);
      setShowDeleteConfirm(false);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [deleteStakeholder, deleteTargetIds]);

  const handleDeleteGroup = useCallback(async () => {
    if (!groupToDelete) return;
    const groupStakeholders = stakeholdersByGroup[groupToDelete];
    setIsBulkDeleting(true);
    try {
      await Promise.all(groupStakeholders.map((stakeholder) => deleteStakeholder(stakeholder.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        groupStakeholders.forEach((stakeholder) => next.delete(stakeholder.id));
        return next;
      });
      setLastSelectedId(null);
      setGroupToDelete(null);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [deleteStakeholder, groupToDelete, stakeholdersByGroup]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col" style={{ background: 'var(--sw-canvas)' }}>
        <div className="p-4">
          <Skeleton className="mb-3 h-8 w-48" />
          <Skeleton className="mb-4 h-7 w-full" />
          <div className="space-y-4">
            {GROUP_ORDER.map((group) => (
              <div key={group} className="border border-[var(--sw-rule)] bg-[var(--sw-shell)]">
                <Skeleton className="h-10 w-full" />
                <div className="space-y-1 p-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--sw-canvas)' }}>
      <header className="shrink-0 px-4 pt-2 pb-3" style={{ borderBottom: '1px solid var(--sw-rule-2)' }}>
        <div className="mb-2 flex items-center justify-between gap-4">
          <StakeholderBreadcrumb projectName={projectName} activeCrumb={activeCrumb} />
        </div>

        <div className="mb-2 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="text-[30px] font-bold leading-none text-[var(--sw-ink)]"
              style={{ fontFamily: 'var(--sw-font-sans)', letterSpacing: 0 }}
            >
              Stakeholders
            </h2>
            <div className="mt-1 min-h-[18px] text-xs text-[var(--sw-muted)]" style={{ fontFamily: 'var(--sw-font-mono)' }}>
              {visibleStakeholders.length} visible / {stakeholders.length} total
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <GroupFilterButton
            label="all"
            count={counts.total}
            selected={selectedGroups.size === 0}
            onClick={() => setSelectedGroups(new Set())}
          />
          {GROUP_ORDER.map((group) => (
            <GroupFilterButton
              key={group}
              label={GROUP_LABELS[group].toLowerCase()}
              count={counts[group]}
              accent={GROUP_ACCENTS[group]}
              selected={selectedGroups.has(group)}
              onClick={(event) => handleFilterClick(group, event)}
            />
          ))}
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setPendingDeleteIds(null);
                setShowDeleteConfirm(true);
              }}
              disabled={isBulkDeleting}
              className="ml-auto inline-flex h-7 items-center gap-1.5 bg-[var(--sw-rose)] px-3 text-[11px] font-bold uppercase text-[var(--sw-ink)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
              style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
            >
              <Trash className="h-3.5 w-3.5" />
              Delete selected
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const groupStakeholders = stakeholdersByGroup[group];
            const selectedInGroup = groupStakeholders.filter((stakeholder) => selectedIds.has(stakeholder.id)).length;
            const allGroupSelected = groupStakeholders.length > 0 &&
              groupStakeholders.every((stakeholder) => selectedIds.has(stakeholder.id));
            const someGroupSelected = selectedInGroup > 0;

            return (
              <GroupCard
                key={group}
                group={group}
                stakeholders={groupStakeholders}
                selectedInGroup={selectedInGroup}
                allGroupSelected={allGroupSelected}
                someGroupSelected={someGroupSelected}
                onToggleGroupSelection={() => handleToggleGroupSelection(group)}
                onUpdate={updateStakeholder}
                onUpdateTenderStatus={updateTenderStatus}
                onUpdateSubmissionStatus={updateSubmissionStatus}
                onRequestDelete={handleRequestDeleteStakeholder}
                onDeleteGroup={setGroupToDelete}
                onDeleteSelected={handleRequestDeleteIds}
                onGenerate={() => handleGenerateForGroup(group)}
                isGenerating={isGenerating === group}
                quickAddGroup={quickAddGroup}
                onQuickAdd={setQuickAddGroup}
                onQuickAddSubmit={handleQuickAddSubmit}
                onQuickAddCancel={() => setQuickAddGroup(null)}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                visibility={visibility}
                onToggleVisibility={toggleVisibility}
                isDeleting={isBulkDeleting}
              />
            );
          })}
        </div>
      </div>

      <AuroraConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setPendingDeleteIds(null);
        }}
        onConfirm={handleBulkDelete}
        title={`Delete ${deleteTargetCount} selected stakeholder${deleteTargetCount === 1 ? '' : 's'}?`}
        description="This will delete the selected stakeholder rows from the register."
        confirmLabel={isBulkDeleting ? 'Deleting...' : 'Delete'}
      />

      <AuroraConfirmDialog
        open={groupToDelete !== null}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
        onConfirm={handleDeleteGroup}
        title={`Delete all ${groupToDelete ? GROUP_LABELS[groupToDelete].toLowerCase() : ''} stakeholders?`}
        description={`This will delete ${groupToDelete ? stakeholdersByGroup[groupToDelete].length : 0} stakeholder rows from this table.`}
        confirmLabel={isBulkDeleting ? 'Deleting...' : 'Delete all'}
      />
    </div>
  );
}

interface GroupCardProps {
  group: StakeholderGroup;
  stakeholders: StakeholderWithStatus[];
  selectedInGroup: number;
  allGroupSelected: boolean;
  someGroupSelected: boolean;
  onToggleGroupSelection: () => void;
  onUpdate: (id: string, data: UpdateStakeholderRequest) => Promise<StakeholderWithStatus | null>;
  onUpdateTenderStatus: (id: string, statusType: TenderStatusType, isActive: boolean) => Promise<boolean> | void;
  onUpdateSubmissionStatus: (id: string, status: SubmissionStatus) => Promise<boolean> | void;
  onRequestDelete: (id: string) => void;
  onDeleteGroup: (group: StakeholderGroup) => void;
  onDeleteSelected: (ids: string[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  quickAddGroup: StakeholderGroup | null;
  onQuickAdd: (group: StakeholderGroup) => void;
  onQuickAddSubmit: (subgroup: string) => void;
  onQuickAddCancel: () => void;
  selectedIds: Set<string>;
  onSelect: (id: string, event: MouseEvent) => void;
  visibility: Record<string, boolean>;
  onToggleVisibility: (categoryId: string) => Promise<void>;
  isDeleting: boolean;
}

function GroupCard({
  group,
  stakeholders,
  selectedInGroup,
  allGroupSelected,
  someGroupSelected,
  onToggleGroupSelection,
  onUpdate,
  onUpdateTenderStatus,
  onUpdateSubmissionStatus,
  onRequestDelete,
  onDeleteGroup,
  onDeleteSelected,
  onGenerate,
  isGenerating,
  quickAddGroup,
  onQuickAdd,
  onQuickAddSubmit,
  onQuickAddCancel,
  selectedIds,
  onSelect,
  visibility,
  onToggleVisibility,
  isDeleting,
}: GroupCardProps) {
  const categoryId = group === 'consultant' ? 'consultants' : group === 'contractor' ? 'contractors' : null;
  const hasVisibilityToggle = categoryId !== null;
  const isVisible = categoryId ? visibility[categoryId] !== false : true;
  const hasSelectedInGroup = selectedInGroup > 0;
  const accent = GROUP_ACCENTS[group];
  const selectedInGroupIds = stakeholders
    .filter((stakeholder) => selectedIds.has(stakeholder.id))
    .map((stakeholder) => stakeholder.id);

  const handleTrashClick = () => {
    if (hasSelectedInGroup) onDeleteSelected(selectedInGroupIds);
    else onDeleteGroup(group);
  };

  const trashTitle = hasSelectedInGroup
    ? `Delete ${selectedInGroup} selected stakeholder${selectedInGroup !== 1 ? 's' : ''}`
    : `Delete all ${GROUP_LABELS[group].toLowerCase()} stakeholders`;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden bg-[var(--sw-shell)]">
      <div className="flex h-10 items-center justify-between gap-3 border-b border-[var(--sw-rule-2)] bg-[var(--sw-shell)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickAdd(group)}
            className="p-1 text-[var(--sw-rose-dk)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-ink)]"
            title={`Add ${GROUP_LABELS[group]}`}
          >
            <Plus className="h-4 w-4" />
          </button>
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ background: accent }} />
          <span
            className="truncate text-[11px] font-semibold uppercase text-[var(--sw-ink)]"
            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.14em' }}
          >
            {GROUP_LABELS[group]} ({stakeholders.length})
          </span>
          {hasVisibilityToggle && categoryId && (
            <button
              type="button"
              onClick={() => onToggleVisibility(categoryId)}
              className={cn(
                'p-1 transition-colors hover:bg-[var(--sw-canvas)] hover:text-[var(--sw-ink)]',
                isVisible ? 'text-[var(--sw-muted)]' : 'text-[var(--sw-rule)]'
              )}
              title={isVisible
                ? 'Visible in Document Repository (click to hide)'
                : 'Hidden from Document Repository (click to show)'}
            >
              {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 border border-[var(--sw-rule)] bg-white px-2 text-[11px] font-semibold text-[var(--sw-ink)] transition-colors hover:border-[var(--sw-ink)] hover:bg-[var(--sw-rose-tint)] disabled:cursor-wait disabled:opacity-55'
          )}
          style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
          title={isGenerating ? 'Generating...' : `Generate ${GROUP_LABELS[group]}`}
        >
          <DiamondIcon
            className={cn('h-3.5 w-3.5 text-[var(--sw-rose-dk)]', isGenerating && 'animate-diamond-spin')}
            variant="empty"
          />
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <div className="min-h-0 overflow-x-auto">
        <table
          className="w-full min-w-[860px] table-fixed caption-bottom text-[11px]"
          style={{ fontFamily: 'var(--sw-font-mono)', lineHeight: 1.1 }}
        >
          <thead>
            <tr className="border-b border-[var(--sw-rule-2)] bg-[var(--sw-shell)]">
              <StakeholderHead className="w-24">
                <span className="inline-flex items-center gap-1.5">
                  <SelectionToggle
                    allSelected={allGroupSelected}
                    someSelected={someGroupSelected}
                    onClick={onToggleGroupSelection}
                    title={allGroupSelected ? 'Clear table selection' : 'Select all rows in this table'}
                  />
                  Group
                </span>
              </StakeholderHead>
              <StakeholderHead className="w-36">Subgroup</StakeholderHead>
              <StakeholderHead className="w-44">Firm</StakeholderHead>
              <StakeholderHead className="w-36">Name</StakeholderHead>
              <StakeholderHead className="w-32">Phone</StakeholderHead>
              <StakeholderHead className="w-44">Email</StakeholderHead>
              <StakeholderHead className="w-28">Status</StakeholderHead>
              <th className="w-8 px-1 text-right">
                <button
                  type="button"
                  onClick={handleTrashClick}
                  disabled={(stakeholders.length === 0 && !hasSelectedInGroup) || isDeleting}
                  className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)] disabled:cursor-not-allowed disabled:opacity-35"
                  title={trashTitle}
                >
                  <Trash className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {quickAddGroup === group && (
              <tr className="border-b border-[var(--sw-rule-2)] bg-[var(--sw-paper-2)]">
                <td className="px-3 py-1 text-[var(--sw-muted)]">{GROUP_LABELS[group]}</td>
                <td className="px-2 py-1" colSpan={5}>
                  <select
                    autoFocus
                    className="h-7 max-w-[240px] border border-[var(--sw-rule)] bg-white px-2 text-[11px] text-[var(--sw-ink)] outline-none transition-colors focus:border-[var(--sw-rose)]"
                    style={{ fontFamily: 'var(--sw-font-mono)' }}
                    onChange={(event) => event.target.value && onQuickAddSubmit(event.target.value)}
                    onBlur={onQuickAddCancel}
                    onKeyDown={(event) => event.key === 'Escape' && onQuickAddCancel()}
                  >
                    <option value="">Select subgroup...</option>
                    {getSubgroupsForGroup(group).map((subgroup) => (
                      <option key={subgroup} value={subgroup}>{subgroup}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1 text-[var(--sw-muted)]">--</td>
                <td className="px-1 py-1 text-right">
                  <button
                    type="button"
                    onClick={onQuickAddCancel}
                    className="p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )}

            {stakeholders.map((stakeholder) => (
              <StakeholderRow
                key={stakeholder.id}
                stakeholder={stakeholder}
                onUpdate={onUpdate}
                onUpdateTenderStatus={onUpdateTenderStatus}
                onUpdateSubmissionStatus={onUpdateSubmissionStatus}
                onDelete={onRequestDelete}
                isSelected={selectedIds.has(stakeholder.id)}
                onSelect={onSelect}
              />
            ))}

            {isGenerating && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={`skeleton-${i}`} className="h-9 border-b border-[var(--sw-rule-2)]">
                    <td className="px-3 py-1"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-2 py-1"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-2 py-1"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-2 py-1"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-2 py-1"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-2 py-1"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-2 py-1"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-1 py-1" />
                  </tr>
                ))}
              </>
            )}

            {stakeholders.length === 0 && !isGenerating && quickAddGroup !== group && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-xs text-[var(--sw-muted)]">
                  No {GROUP_LABELS[group].toLowerCase()} stakeholders yet. Use + or Generate to add rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface StakeholderHeadProps {
  children: React.ReactNode;
  className?: string;
}

function StakeholderHead({ children, className }: StakeholderHeadProps) {
  return (
    <th
      className={cn('px-3 py-2 text-left text-[10px] font-semibold uppercase text-[var(--sw-muted)]', className)}
      style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.24em' }}
    >
      {children}
    </th>
  );
}

interface SelectionToggleProps {
  allSelected: boolean;
  someSelected: boolean;
  onClick: () => void;
  title: string;
}

function SelectionToggle({ allSelected, someSelected, onClick, title }: SelectionToggleProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-3.5 w-3.5 items-center justify-center border transition-colors',
        someSelected
          ? 'border-[var(--sw-rose)] bg-[var(--sw-rose)] text-[var(--sw-ink)]'
          : 'border-[var(--sw-rule)] bg-white hover:border-[var(--sw-ink)]'
      )}
      title={title}
    >
      {allSelected ? <Check className="h-2.5 w-2.5" /> : someSelected ? <Minus className="h-2.5 w-2.5" /> : null}
    </button>
  );
}

interface GroupFilterButtonProps {
  label: string;
  count: number;
  selected: boolean;
  accent?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function GroupFilterButton({ label, count, selected, accent, onClick }: GroupFilterButtonProps) {
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
      {accent && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ background: accent }} />}
      <span>{label}</span>
      <span className={selected ? 'text-[rgba(232,228,218,0.72)]' : 'text-[var(--sw-muted)]'}>
        {count}
      </span>
    </button>
  );
}
