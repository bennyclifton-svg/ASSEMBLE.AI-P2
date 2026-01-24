'use client';

import { useState } from 'react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { StakeholderRow } from './StakeholderRow';
import { AddStakeholderRow } from './AddStakeholderRow';
import { GenerateStakeholdersDialog } from './GenerateStakeholdersDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Users,
  Building2,
  Shield,
  HardHat,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import type { StakeholderGroup, StakeholderWithStatus } from '@/types/stakeholder';

interface StakeholderSectionProps {
  projectId: string;
}

const GROUP_CONFIG: Record<
  StakeholderGroup,
  { label: string; icon: React.ElementType; color: string }
> = {
  client: { label: 'Client Team', icon: Users, color: 'text-purple-500' },
  authority: { label: 'Authorities', icon: Shield, color: 'text-blue-500' },
  consultant: { label: 'Consultants', icon: Building2, color: 'text-green-500' },
  contractor: { label: 'Contractors', icon: HardHat, color: 'text-orange-500' },
};

const GROUP_ORDER: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];

export function StakeholderSection({ projectId }: StakeholderSectionProps) {
  const {
    stakeholders,
    counts,
    isLoading,
    createStakeholder,
    updateStakeholder,
    toggleEnabled,
    updateTenderStatus,
    updateSubmissionStatus,
    deleteStakeholder,
    generateStakeholders,
    previewGeneration,
  } = useStakeholders({ projectId });

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<StakeholderGroup>>(new Set());

  const toggleGroup = (group: StakeholderGroup) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  // Group stakeholders
  const stakeholdersByGroup = GROUP_ORDER.reduce((acc, group) => {
    acc[group] = stakeholders.filter((s) => s.stakeholderGroup === group);
    return acc;
  }, {} as Record<StakeholderGroup, StakeholderWithStatus[]>);

  if (isLoading) {
    return (
      <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Stakeholders
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">({counts.total})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGenerateDialogOpen(true)}
            className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary-hover)] hover:bg-[var(--color-accent-primary-tint)]"
          >
            <DiamondIcon className="w-4 h-4 mr-1" />
            Generate
          </Button>
        </div>
      </div>

      {/* Groups */}
      <div className="divide-y divide-[var(--color-border)]">
        {GROUP_ORDER.map((group) => {
          const config = GROUP_CONFIG[group];
          const groupStakeholders = stakeholdersByGroup[group];
          const isCollapsed = collapsedGroups.has(group);
          const Icon = config.icon;

          return (
            <div key={group}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-4 h-4', config.color)} />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {config.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    ({groupStakeholders.length})
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                )}
              </button>

              {/* Group Content */}
              {!isCollapsed && (
                <div>
                  {groupStakeholders.length > 0 &&
                    groupStakeholders.map((stakeholder) => (
                      <StakeholderRow
                        key={stakeholder.id}
                        stakeholder={stakeholder}
                        onToggleEnabled={toggleEnabled}
                        onUpdate={updateStakeholder}
                        onUpdateTenderStatus={updateTenderStatus}
                        onUpdateSubmissionStatus={updateSubmissionStatus}
                        onDelete={deleteStakeholder}
                      />
                    ))}
                  <AddStakeholderRow group={group} onAdd={createStakeholder} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {counts.total === 0 && (
        <div className="px-4 py-8 text-center">
          <Users className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-3" />
          <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
            No stakeholders yet
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Generate stakeholders based on your project profile or add them manually
          </p>
          <Button
            onClick={() => setGenerateDialogOpen(true)}
            className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-[var(--color-text-inverse)]"
          >
            <DiamondIcon className="w-4 h-4 mr-2" />
            Generate Stakeholders
          </Button>
        </div>
      )}

      {/* Generate Dialog */}
      <GenerateStakeholdersDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        existingCount={counts.total}
        onGenerate={generateStakeholders}
        onPreview={previewGeneration}
      />
    </div>
  );
}
