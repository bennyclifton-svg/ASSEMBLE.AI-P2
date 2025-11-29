import React from 'react';
import { useConsultantDisciplines } from '@/lib/hooks/use-consultant-disciplines';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FileText, Send, ThumbsUp, Award } from 'lucide-react';

interface ConsultantListSectionProps {
  projectId: string;
}

export function ConsultantListSection({ projectId }: ConsultantListSectionProps) {
  const { disciplines, isLoading, toggleDiscipline, updateStatus } = useConsultantDisciplines(projectId);

  if (isLoading) {
    return (
      <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
        <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Consultant List</h3>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const statusTypes = [
    { type: 'brief', label: 'Brief', icon: FileText, color: 'text-blue-500' },
    { type: 'tender', label: 'Tender', icon: Send, color: 'text-orange-500' },
    { type: 'rec', label: 'Rec', icon: ThumbsUp, color: 'text-purple-500' },
    { type: 'award', label: 'Award', icon: Award, color: 'text-green-500' },
  ] as const;

  return (
    <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
      <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Consultant List</h3>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {disciplines.map((discipline) => (
          <div key={discipline.id} className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] rounded border border-[#3e3e42]">
            <div className="flex items-center gap-4">
              <Switch
                checked={discipline.isEnabled}
                onCheckedChange={(checked: boolean) => toggleDiscipline(discipline.id, checked)}
              />
              <span className={cn("text-[#cccccc]", !discipline.isEnabled && "text-[#858585]")}>
                {discipline.disciplineName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {statusTypes.map(({ type, label, icon: Icon, color }) => {
                const status = discipline.statuses.find(s => s.statusType === type);
                const isActive = status?.isActive ?? false;

                return (
                  <button
                    key={type}
                    onClick={() => discipline.isEnabled && updateStatus(discipline.id, type, !isActive)}
                    disabled={!discipline.isEnabled}
                    className={cn(
                      "p-2 rounded-full transition-all duration-200",
                      isActive ? "bg-accent shadow-sm" : "opacity-30 hover:opacity-50",
                      !discipline.isEnabled && "opacity-10 cursor-not-allowed"
                    )}
                    title={`${label} (${isActive ? 'Active' : 'Inactive'})`}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? color : "text-foreground")} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
