'use client';

import { useState } from 'react';
import { useConsultantDisciplines } from '@/lib/hooks/use-consultant-disciplines';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TenderProgressBar } from './TenderProgressBar';

interface ConsultantListSectionProps {
  projectId: string;
}

export function ConsultantListSection({ projectId }: ConsultantListSectionProps) {
  const { disciplines, isLoading, toggleDiscipline, updateStatus } = useConsultantDisciplines(projectId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-[#252526] rounded-lg p-4 border border-[#3e3e42]">
        <h3 className="text-sm font-semibold text-[#cccccc] mb-3">Consultant List</h3>
        <div className="-mx-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#252526] rounded-lg p-4 border border-[#3e3e42]">
      <h3 className="text-sm font-semibold text-[#cccccc] mb-3">Consultant List</h3>
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
                isHovered ? 'bg-[#2a2d2e]' : 'bg-transparent',
                !isLast && 'border-b border-[#3e3e42]'
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
                  discipline.isEnabled ? "text-[#cccccc]" : "text-[#858585]"
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
