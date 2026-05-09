'use client';

import { FileText, Send, CheckCircle2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 'brief' | 'tender' | 'rec' | 'award';

interface StatusIndicatorProps {
  type: StatusType;
  isActive: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  brief: {
    icon: FileText,
    label: 'Brief',
    color: 'var(--sw-lav)', // identifier role — brief
  },
  tender: {
    icon: Send,
    label: 'Tender.',
    color: 'var(--sw-peach)', // currency role — tender
  },
  rec: {
    icon: CheckCircle2,
    label: 'Recommendation',
    color: 'var(--sw-cyan)', // type role — recommendation
  },
  award: {
    icon: Award,
    label: 'Award',
    color: 'var(--color-success)', // semantic success
  },
};

export function StatusIndicator({ type, isActive, onClick, disabled = false }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[type];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center p-1.5 rounded hover:bg-[var(--color-border)] transition-all',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'cursor-pointer'
      )}
      title={config.label}
      aria-label={`${config.label} - ${isActive ? 'Active' : 'Inactive'}`}
    >
      <Icon
        className={cn(
          'w-4 h-4 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-30'
        )}
        style={{
          color: config.color,
        }}
      />
    </button>
  );
}

interface StatusIndicatorsGroupProps {
  statuses: {
    brief: boolean;
    tender: boolean;
    rec: boolean;
    award: boolean;
  };
  onStatusToggle?: (type: StatusType) => void;
  disabled?: boolean;
}

export function StatusIndicatorsGroup({ statuses, onStatusToggle, disabled = false }: StatusIndicatorsGroupProps) {
  return (
    <div className="flex items-center gap-1">
      <StatusIndicator
        type="brief"
        isActive={statuses.brief}
        onClick={() => onStatusToggle?.('brief')}
        disabled={disabled}
      />
      <StatusIndicator
        type="tender"
        isActive={statuses.tender}
        onClick={() => onStatusToggle?.('tender')}
        disabled={disabled}
      />
      <StatusIndicator
        type="rec"
        isActive={statuses.rec}
        onClick={() => onStatusToggle?.('rec')}
        disabled={disabled}
      />
      <StatusIndicator
        type="award"
        isActive={statuses.award}
        onClick={() => onStatusToggle?.('award')}
        disabled={disabled}
      />
    </div>
  );
}
