'use client';

import { useState } from 'react';
import { useContractorTrades } from '@/lib/hooks/use-contractor-trades';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TenderProgressBar } from './TenderProgressBar';

interface ContractorListSectionProps {
  projectId: string;
}

export function ContractorListSection({ projectId }: ContractorListSectionProps) {
  const { trades, isLoading, toggleTrade, updateStatus } = useContractorTrades(projectId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 border border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Contractor List</h3>
        <div className="-mx-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 border border-[var(--color-border)]">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Contractor List</h3>
      <div className="-mx-4 max-h-[400px] overflow-y-auto">
        {trades.map((trade, index) => {
          const isLast = index === trades.length - 1;
          const isHovered = hoveredId === trade.id;

          // Build statuses object for TenderProgressBar
          const statuses = {
            brief: trade.statuses.find(s => s.statusType === 'brief')?.isActive ?? false,
            tender: trade.statuses.find(s => s.statusType === 'tender')?.isActive ?? false,
            rec: trade.statuses.find(s => s.statusType === 'rec')?.isActive ?? false,
            award: trade.statuses.find(s => s.statusType === 'award')?.isActive ?? false,
          };

          return (
            <div
              key={trade.id}
              className={cn(
                'flex items-center justify-between px-4 py-1.5 transition-all duration-150',
                isHovered ? 'bg-[var(--color-bg-tertiary)]' : 'bg-transparent',
                !isLast && 'border-b border-[var(--color-border)]'
              )}
              onMouseEnter={() => setHoveredId(trade.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Switch
                  checked={trade.isEnabled}
                  onCheckedChange={(checked: boolean) => toggleTrade(trade.id, checked)}
                  className="scale-75"
                />
                <span className={cn(
                  "text-sm leading-tight truncate",
                  trade.isEnabled ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                )}>
                  {trade.tradeName}
                </span>
              </div>

              <TenderProgressBar
                statuses={statuses}
                onStageClick={(stage) => {
                  if (trade.isEnabled) {
                    updateStatus(trade.id, stage, !statuses[stage]);
                  }
                }}
                disabled={!trade.isEnabled}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
