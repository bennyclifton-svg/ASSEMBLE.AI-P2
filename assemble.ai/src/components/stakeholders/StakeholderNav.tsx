'use client';

import { Users } from 'lucide-react';
import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { Skeleton } from '@/components/ui/skeleton';

interface StakeholderNavProps {
  projectId: string;
  onNavigate?: () => void;
  isActive?: boolean;
}

export function StakeholderNav({ projectId, onNavigate, isActive = false }: StakeholderNavProps) {
  const { counts, isLoading } = useStakeholders({ projectId });

  if (isLoading) {
    return (
      <div className="nav-panel-section py-3">
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  return (
    <div className={`nav-panel-section ${isActive ? 'nav-panel-active' : ''}`}>
      <div
        className="nav-panel-header py-2"
        onClick={onNavigate}
      >
        <div className="flex items-center gap-1.5">
          <Users className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
            Stakeholders
          </h3>
        </div>
      </div>
    </div>
  );
}
