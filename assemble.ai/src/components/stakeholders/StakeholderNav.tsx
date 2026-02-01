'use client';

import { useStakeholders } from '@/lib/hooks/use-stakeholders';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Users,
  Building2,
  Shield,
  HardHat,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { StakeholderGroup } from '@/types/stakeholder';

interface StakeholderNavProps {
  projectId: string;
  onNavigate?: () => void;
  isActive?: boolean;
}

const GROUP_CONFIG: Record<
  StakeholderGroup,
  { label: string; icon: React.ElementType; color: string }
> = {
  client: { label: 'Client', icon: Users, color: 'text-[var(--color-text-muted)]' },
  authority: { label: 'Authority', icon: Shield, color: 'text-[var(--color-text-muted)]' },
  consultant: { label: 'Consultant', icon: Building2, color: 'text-[var(--color-text-muted)]' },
  contractor: { label: 'Contractor', icon: HardHat, color: 'text-[var(--color-text-muted)]' },
};

const GROUP_ORDER: StakeholderGroup[] = ['client', 'authority', 'consultant', 'contractor'];

export function StakeholderNav({ projectId, onNavigate, isActive = false }: StakeholderNavProps) {
  const { counts, isLoading } = useStakeholders({ projectId });

  if (isLoading) {
    return (
      <div className="nav-panel-section py-3 pl-2 pr-3">
        <Skeleton className="h-5 w-24 mb-2" />
        <div className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`nav-panel-section ${isActive ? 'nav-panel-active' : ''}`}>
      {/* Header */}
      <div
        className="nav-panel-header pl-2 pr-3 py-2 border-b border-[var(--color-border)]"
        onClick={onNavigate}
      >
        <div className="flex items-center gap-1.5">
          <h3 className="nav-panel-title text-sm font-semibold text-[var(--color-text-primary)] transition-colors">
            Stakeholders
          </h3>
          <span className="text-xs text-[var(--color-text-muted)]">({counts.total})</span>
        </div>
        {isActive ? (
          <Minimize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
        ) : (
          <Maximize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-text-muted)] transition-colors" />
        )}
      </div>

      {/* Compact Group List */}
      <div className="p-1.5">
        {GROUP_ORDER.map((group) => {
          const config = GROUP_CONFIG[group];
          const count = counts[group];
          const Icon = config.icon;

          return (
            <div
              key={group}
              className={cn(
                'flex items-center justify-between pl-1 pr-2 py-1.5 rounded-md',
                'hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer'
              )}
              onClick={onNavigate}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', config.color)} />
                <span className="text-sm text-[var(--color-text-primary)]">
                  {config.label}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  count > 0
                    ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-muted)]'
                )}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
