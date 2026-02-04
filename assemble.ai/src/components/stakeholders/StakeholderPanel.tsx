'use client';

import { useState } from 'react';
import { Plus, X, Trash } from 'lucide-react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { StakeholderRow } from './StakeholderRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { getSubgroupsForGroup } from '@/types/stakeholder';
import type { StakeholderGroup, StakeholderWithStatus } from '@/types/stakeholder';

interface StakeholderPanelProps {
  projectId: string;
}

const GROUP_ORDER: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];

const GROUP_LABELS: Record<StakeholderGroup, string> = {
  client: 'Client',
  authority: 'Authority',
  consultant: 'Consultant',
  contractor: 'Contractor',
};

export function StakeholderPanel({ projectId }: StakeholderPanelProps) {
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

  // Loading state for generation
  const [isGenerating, setIsGenerating] = useState<StakeholderGroup | null>(null);

  // Quick add state
  const [quickAddGroup, setQuickAddGroup] = useState<StakeholderGroup | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Group delete state
  const [groupToDelete, setGroupToDelete] = useState<StakeholderGroup | null>(null);

  // Group stakeholders
  const stakeholdersByGroup = GROUP_ORDER.reduce((acc, group) => {
    acc[group] = stakeholders.filter((s) => s.stakeholderGroup === group);
    return acc;
  }, {} as Record<StakeholderGroup, StakeholderWithStatus[]>);

  const handleGenerateForGroup = async (group: StakeholderGroup) => {
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
  };

  // Quick add handlers
  const handleQuickAddSubmit = async (subgroup: string) => {
    if (!quickAddGroup || !subgroup) return;
    await createStakeholder({
      stakeholderGroup: quickAddGroup,
      name: subgroup,
      isEnabled: quickAddGroup === 'consultant' || quickAddGroup === 'contractor',
    });
    setQuickAddGroup(null);
  };

  // Selection handler (click/ctrl+click/shift+click)
  const handleSelect = (id: string, event: React.MouseEvent) => {
    const newSelected = new Set(selectedIds);
    const isSelected = newSelected.has(id);
    const allStakeholders = GROUP_ORDER.flatMap((g) => stakeholdersByGroup[g]);

    if (event.shiftKey && lastSelectedId) {
      const start = allStakeholders.findIndex((s) => s.id === lastSelectedId);
      const end = allStakeholders.findIndex((s) => s.id === id);
      if (start !== -1 && end !== -1) {
        const [low, high] = start < end ? [start, end] : [end, start];
        allStakeholders.slice(low, high + 1).forEach((s) => newSelected.add(s.id));
      }
      setLastSelectedId(id);
    } else if (event.ctrlKey || event.metaKey) {
      isSelected ? newSelected.delete(id) : newSelected.add(id);
      setLastSelectedId(id);
    } else {
      if (selectedIds.size === 1 && selectedIds.has(id)) {
        newSelected.clear();
        setLastSelectedId(null);
      } else {
        newSelected.clear();
        newSelected.add(id);
        setLastSelectedId(id);
      }
    }
    setSelectedIds(newSelected);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    for (const id of idsToDelete) {
      await deleteStakeholder(id);
    }
    setSelectedIds(new Set());
    setLastSelectedId(null);
    setShowDeleteConfirm(false);
  };

  // Group delete handler
  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    const groupStakeholders = stakeholdersByGroup[groupToDelete];
    for (const stakeholder of groupStakeholders) {
      await deleteStakeholder(stakeholder.id);
    }
    setGroupToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarGutter: 'stable both-edges' }}>
        <div className="space-y-4">
          {/* Group Cards - styled like Objectives cards */}
          {GROUP_ORDER.map((group) => {
            const groupStakeholders = stakeholdersByGroup[group];

            return (
              <GroupCard
                key={group}
                group={group}
                stakeholders={groupStakeholders}
                onUpdate={updateStakeholder}
                onUpdateTenderStatus={updateTenderStatus}
                onUpdateSubmissionStatus={updateSubmissionStatus}
                onDelete={deleteStakeholder}
                onDeleteGroup={setGroupToDelete}
                onDeleteSelected={() => setShowDeleteConfirm(true)}
                onGenerate={() => handleGenerateForGroup(group)}
                isGenerating={isGenerating === group}
                quickAddGroup={quickAddGroup}
                onQuickAdd={setQuickAddGroup}
                onQuickAddSubmit={handleQuickAddSubmit}
                onQuickAddCancel={() => setQuickAddGroup(null)}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            );
          })}

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Selected Stakeholders"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-primary)]">
            Are you sure you want to delete {selectedIds.size} selected stakeholder
            {selectedIds.size !== 1 ? 's' : ''}?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Delete Confirmation Modal */}
      <Modal
        isOpen={groupToDelete !== null}
        onClose={() => setGroupToDelete(null)}
        title={`Delete All ${groupToDelete ? GROUP_LABELS[groupToDelete] : ''} Stakeholders`}
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-primary)]">
            Are you sure you want to delete all {groupToDelete ? stakeholdersByGroup[groupToDelete].length : 0}{' '}
            {groupToDelete ? GROUP_LABELS[groupToDelete].toLowerCase() : ''} stakeholder
            {groupToDelete && stakeholdersByGroup[groupToDelete].length !== 1 ? 's' : ''}?
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGroupToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Group card component styled like Objectives cards
interface GroupCardProps {
  group: StakeholderGroup;
  stakeholders: StakeholderWithStatus[];
  onUpdate: (id: string, data: any) => Promise<StakeholderWithStatus | null>;
  onUpdateTenderStatus: (id: string, statusType: any, isActive: boolean) => void;
  onUpdateSubmissionStatus: (id: string, status: any) => void;
  onDelete: (id: string) => Promise<boolean>;
  onDeleteGroup: (group: StakeholderGroup) => void;
  onDeleteSelected: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  quickAddGroup: StakeholderGroup | null;
  onQuickAdd: (group: StakeholderGroup) => void;
  onQuickAddSubmit: (subgroup: string) => void;
  onQuickAddCancel: () => void;
  selectedIds: Set<string>;
  onSelect: (id: string, event: React.MouseEvent) => void;
}

function GroupCard({
  group,
  stakeholders,
  onUpdate,
  onUpdateTenderStatus,
  onUpdateSubmissionStatus,
  onDelete,
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
}: GroupCardProps) {
  // Count how many selected items are in this group
  const selectedInGroup = stakeholders.filter(s => selectedIds.has(s.id)).length;
  const hasSelectedInGroup = selectedInGroup > 0;

  // Handler for trash button - delete selected if any, otherwise delete all in group
  const handleTrashClick = () => {
    if (hasSelectedInGroup) {
      onDeleteSelected();
    } else {
      onDeleteGroup(group);
    }
  };

  // Dynamic title based on whether items are selected
  const trashTitle = hasSelectedInGroup
    ? `Delete ${selectedInGroup} selected stakeholder${selectedInGroup !== 1 ? 's' : ''}`
    : `Delete all ${GROUP_LABELS[group]} stakeholders`;

  return (
    <div className="border border-[var(--color-border)] rounded overflow-hidden flex flex-col">
      {/* Header with copper tint background - matches Objectives section */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-accent-copper-tint)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuickAdd(group)}
            className={cn(
              'p-1 rounded transition-colors',
              'text-[var(--color-accent-copper)] hover:text-[var(--color-accent-copper)] hover:bg-[var(--color-accent-copper)]/10'
            )}
            title={`Add ${GROUP_LABELS[group]}`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-[var(--color-accent-copper)] font-medium text-sm uppercase tracking-wide">
            {GROUP_LABELS[group]} ({stakeholders.length})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium transition-all',
              isGenerating
                ? 'text-[var(--color-accent-copper)] cursor-wait'
                : 'text-[var(--color-accent-copper)] hover:opacity-80'
            )}
            title={isGenerating ? 'Generating...' : `Generate ${GROUP_LABELS[group]}`}
          >
            <DiamondIcon
              className={cn('w-4 h-4', isGenerating && 'animate-spin [animation-duration:2.5s]')}
              variant="empty"
            />
            <span className={isGenerating ? 'animate-text-aurora' : ''}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </span>
          </button>
          <button
            onClick={handleTrashClick}
            className={cn(
              'p-1 rounded transition-colors',
              stakeholders.length > 0 || hasSelectedInGroup
                ? 'text-[var(--color-accent-copper)] hover:text-[var(--color-accent-coral)] hover:bg-[var(--color-accent-coral)]/10'
                : 'text-[var(--color-accent-copper)]/30 cursor-not-allowed'
            )}
            title={trashTitle}
            disabled={stakeholders.length === 0 && !hasSelectedInGroup}
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 bg-[var(--color-bg-secondary)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-28">
                Group
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-48">
                SubGroup
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-32">
                Firm
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-28">
                Phone
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-40">
                Email
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {/* Quick Add Row */}
            {quickAddGroup === group && (
              <tr className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
                <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
                  {GROUP_LABELS[group]}
                </td>
                <td className="px-3 py-2" colSpan={5}>
                  <select
                    autoFocus
                    className={cn(
                      'px-2 py-1 text-sm rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)]',
                      'focus:outline-none focus:border-[var(--color-accent-copper)]'
                    )}
                    onChange={(e) => e.target.value && onQuickAddSubmit(e.target.value)}
                    onBlur={onQuickAddCancel}
                    onKeyDown={(e) => e.key === 'Escape' && onQuickAddCancel()}
                  >
                    <option value="">Select SubGroup...</option>
                    {getSubgroupsForGroup(group).map((sg) => (
                      <option key={sg} value={sg}>{sg}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">—</td>
                <td className="px-3 py-2 w-10">
                  <button
                    onClick={onQuickAddCancel}
                    className="p-1 text-[var(--color-text-muted)] hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}

            {/* Stakeholder rows */}
            {stakeholders.map((stakeholder) => (
              <StakeholderRow
                key={stakeholder.id}
                stakeholder={stakeholder}
                onUpdate={onUpdate}
                onUpdateTenderStatus={onUpdateTenderStatus}
                onUpdateSubmissionStatus={onUpdateSubmissionStatus}
                onDelete={onDelete}
                isSelected={selectedIds.has(stakeholder.id)}
                onSelect={onSelect}
              />
            ))}

            {/* Loading skeleton rows when generating for this group */}
            {isGenerating && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-3 py-2">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-3 py-2 w-10" />
                  </tr>
                ))}
              </>
            )}

            {/* Empty state */}
            {stakeholders.length === 0 && !isGenerating && quickAddGroup !== group && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                  No {GROUP_LABELS[group].toLowerCase()} stakeholders yet. Click + or Generate to add.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
