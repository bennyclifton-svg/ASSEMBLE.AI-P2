'use client';

import { useState } from 'react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { StakeholderRow } from './StakeholderRow';
import { AddStakeholderRow } from './AddStakeholderRow';
import { GenerateStakeholdersDialog } from './GenerateStakeholdersDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DiamondIcon } from '@/components/ui/diamond-icon';
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
    previewGeneration,
  } = useStakeholders({ projectId });

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateForGroup, setGenerateForGroup] = useState<StakeholderGroup | undefined>(undefined);

  // Group stakeholders
  const stakeholdersByGroup = GROUP_ORDER.reduce((acc, group) => {
    acc[group] = stakeholders.filter((s) => s.stakeholderGroup === group);
    return acc;
  }, {} as Record<StakeholderGroup, StakeholderWithStatus[]>);

  const handleGenerateForGroup = (group: StakeholderGroup) => {
    setGenerateForGroup(group);
    setGenerateDialogOpen(true);
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
        <div>
          {/* Unified Table - always shown with group sections */}
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-28">
                    Group
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-56">
                    SubGroup
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-36">
                    Firm
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-32">
                    Phone
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-44">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider w-28">
                    Status
                  </th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {GROUP_ORDER.map((group) => {
                  const groupStakeholders = stakeholdersByGroup[group];

                  return (
                    <GroupSection
                      key={group}
                      group={group}
                      stakeholders={groupStakeholders}
                      onUpdate={updateStakeholder}
                      onUpdateTenderStatus={updateTenderStatus}
                      onUpdateSubmissionStatus={updateSubmissionStatus}
                      onDelete={deleteStakeholder}
                      onGenerate={() => handleGenerateForGroup(group)}
                    />
                  );
                })}
              </tbody>
            </table>

            {/* Add Row */}
            <AddStakeholderRow onAdd={createStakeholder} />
          </div>
        </div>
      </div>

      {/* Generate Dialog */}
      <GenerateStakeholdersDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        existingCount={counts.total}
        onGenerate={generateStakeholders}
        onPreview={previewGeneration}
        filterGroup={generateForGroup}
      />
    </div>
  );
}

// Group section component with stakeholder rows and generate button
interface GroupSectionProps {
  group: StakeholderGroup;
  stakeholders: StakeholderWithStatus[];
  onUpdate: (id: string, data: any) => Promise<StakeholderWithStatus | null>;
  onUpdateTenderStatus: (id: string, statusType: any, isActive: boolean) => void;
  onUpdateSubmissionStatus: (id: string, status: any) => void;
  onDelete: (id: string) => void;
  onGenerate: () => void;
}

function GroupSection({
  group,
  stakeholders,
  onUpdate,
  onUpdateTenderStatus,
  onUpdateSubmissionStatus,
  onDelete,
  onGenerate,
}: GroupSectionProps) {
  return (
    <>
      {/* Group header with generate button */}
      <tr className="bg-[var(--color-bg-secondary)]/50 border-b border-[var(--color-border)]">
        <td colSpan={8} className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              className={cn(
                'p-1 rounded transition-colors',
                'text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] hover:bg-[var(--color-accent-primary-tint)]'
              )}
              title={`Generate ${GROUP_LABELS[group]}`}
            >
              <DiamondIcon className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {GROUP_LABELS[group]} ({stakeholders.length})
            </span>
          </div>
        </td>
      </tr>

      {/* Stakeholder rows */}
      {stakeholders.map((stakeholder) => (
        <StakeholderRow
          key={stakeholder.id}
          stakeholder={stakeholder}
          onUpdate={onUpdate}
          onUpdateTenderStatus={onUpdateTenderStatus}
          onUpdateSubmissionStatus={onUpdateSubmissionStatus}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
