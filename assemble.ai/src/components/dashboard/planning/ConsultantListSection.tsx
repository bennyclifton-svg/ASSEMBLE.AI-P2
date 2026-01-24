'use client';

import { useState, useEffect } from 'react';
import { useConsultantDisciplines } from '@/lib/hooks/use-consultant-disciplines';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TenderProgressBar } from './TenderProgressBar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectTypeId } from '@/lib/types/project-initiator';

interface ConsultantListSectionProps {
  projectId: string;
}

export function ConsultantListSection({ projectId }: ConsultantListSectionProps) {
  const { disciplines, isLoading, toggleDiscipline, updateStatus } = useConsultantDisciplines(projectId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
  const [projectType, setProjectType] = useState<ProjectTypeId | null>(null);

  // Fetch project type on mount
  useEffect(() => {
    const fetchProjectType = async () => {
      try {
        const response = await fetch(`/api/planning/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProjectType(data.details?.projectType || null);
        }
      } catch (error) {
        console.error('Failed to fetch project type:', error);
      }
    };
    fetchProjectType();
  }, [projectId]);

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const response = await fetch('/api/consultants/disciplines/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'clear_all', projectId })
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      // Trigger refetch by reloading the page or updating state
      window.location.reload();
      toast.success(`Cleared ${result.data.affectedCount} disciplines`);
    } catch {
      toast.error('Failed to clear disciplines');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleApplyDefaults = async () => {
    if (!projectType) return;
    setIsApplyingDefaults(true);
    try {
      const response = await fetch('/api/consultants/disciplines/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'apply_defaults',
          projectId,
          projectType
        })
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      window.location.reload();
      toast.success(`Enabled ${result.data.affectedCount} disciplines`);
    } catch {
      toast.error('Failed to apply defaults');
    } finally {
      setIsApplyingDefaults(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 border border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Consultant List</h3>
        <div className="-mx-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 border border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Consultant List</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            disabled={isClearingAll}
            className="px-3 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-text-primary)] flex items-center gap-1"
          >
            {isClearingAll && <Loader2 className="w-3 h-3 animate-spin" />}
            Clear All
          </button>
          <button
            onClick={handleApplyDefaults}
            disabled={!projectType || isApplyingDefaults}
            title={!projectType ? "Set a project type first" : ""}
            className="px-3 py-1 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-text-primary)] flex items-center gap-1"
          >
            {isApplyingDefaults && <Loader2 className="w-3 h-3 animate-spin" />}
            Apply Defaults
          </button>
        </div>
      </div>
      <div className="-mx-4 max-h-[400px] overflow-y-auto">
        {disciplines.map((discipline, index) => {
          const isLast = index === disciplines.length - 1;
          const isHovered = hoveredId === discipline.id;

          // Build statuses object for TenderProgressBar
          const statuses = {
            brief: discipline.statuses.find(s => s.statusType === 'brief')?.isActive ?? false,
            tender: discipline.statuses.find(s => s.statusType === 'tender')?.isActive ?? false,
            rec: discipline.statuses.find(s => s.statusType === 'rec')?.isActive ?? false,
            award: discipline.statuses.find(s => s.statusType === 'award')?.isActive ?? false,
          };

          return (
            <div
              key={discipline.id}
              className={cn(
                'flex items-center justify-between px-4 py-1.5 transition-all duration-150',
                isHovered ? 'bg-[var(--color-bg-tertiary)]' : 'bg-transparent',
                !isLast && 'border-b border-[var(--color-border)]'
              )}
              onMouseEnter={() => setHoveredId(discipline.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Switch
                  checked={discipline.isEnabled}
                  onCheckedChange={(checked: boolean) => toggleDiscipline(discipline.id, checked)}
                  className="scale-75"
                />
                <span className={cn(
                  "text-sm leading-tight truncate",
                  discipline.isEnabled ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}>
                  {discipline.disciplineName}
                </span>
              </div>

              <TenderProgressBar
                statuses={statuses}
                onStageClick={(stage) => {
                  if (discipline.isEnabled) {
                    updateStatus(discipline.id, stage, !statuses[stage]);
                  }
                }}
                disabled={!discipline.isEnabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
