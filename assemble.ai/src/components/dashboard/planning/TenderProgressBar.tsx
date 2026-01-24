'use client';

import { cn } from '@/lib/utils';

// Maps UI labels to database status types
// RFT (Request for Tender) → brief
// SUB (Submission) → tender
// TRR (Tender Recommendation Report) → rec
// LET (Letter/Award) → award
const STAGES = [
  { key: 'brief', label: 'RFT' },
  { key: 'tender', label: 'SUB' },
  { key: 'rec', label: 'TRR' },
  { key: 'award', label: 'LET' },
] as const;

type StatusType = 'brief' | 'tender' | 'rec' | 'award';

interface TenderProgressBarProps {
  statuses: {
    brief: boolean;
    tender: boolean;
    rec: boolean;
    award: boolean;
  };
  onStageClick: (stage: StatusType) => void;
  disabled?: boolean;
}

export function TenderProgressBar({ statuses, onStageClick, disabled = false }: TenderProgressBarProps) {
  // Get the index of a stage
  const getStageIndex = (key: StatusType): number => {
    return STAGES.findIndex(s => s.key === key);
  };

  // Handle click with sequential logic
  // Clicking stage N activates stages 1-N, or deactivates N-4 if already active
  const handleClick = (clickedKey: StatusType) => {
    if (disabled) return;

    const clickedIndex = getStageIndex(clickedKey);
    const isCurrentlyActive = statuses[clickedKey];

    if (isCurrentlyActive) {
      // Deactivate this stage and all subsequent stages
      for (let i = clickedIndex; i < STAGES.length; i++) {
        const stageKey = STAGES[i].key;
        if (statuses[stageKey]) {
          onStageClick(stageKey);
        }
      }
    } else {
      // Activate this stage and all prior stages
      for (let i = 0; i <= clickedIndex; i++) {
        const stageKey = STAGES[i].key;
        if (!statuses[stageKey]) {
          onStageClick(stageKey);
        }
      }
    }
  };

  return (
    <div className="flex items-center">
      {STAGES.map((stage, index) => {
        const isActive = statuses[stage.key];
        const isFirst = index === 0;
        const isLast = index === STAGES.length - 1;

        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => handleClick(stage.key)}
            disabled={disabled}
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-all duration-150',
              'border-y border-r first:border-l first:rounded-l last:rounded-r',
              isActive
                ? 'bg-[var(--color-accent-teal)]/20 text-[var(--color-accent-teal)] border-[var(--color-accent-teal)]/40'
                : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:border-[#555]',
              disabled && 'opacity-40 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
            title={`${stage.label} (${isActive ? 'Active' : 'Inactive'})`}
          >
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}
