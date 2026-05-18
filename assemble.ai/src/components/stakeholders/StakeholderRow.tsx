'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  StakeholderGroup,
  StakeholderWithStatus,
  SubmissionStatus,
  SubmissionStatusRecord,
  TenderStatus,
  TenderStatusType,
  UpdateStakeholderRequest,
} from '@/types/stakeholder';

interface StakeholderRowProps {
  stakeholder: StakeholderWithStatus;
  onUpdate?: (id: string, data: UpdateStakeholderRequest) => Promise<StakeholderWithStatus | null>;
  onToggleEnabled?: (id: string, enabled: boolean) => Promise<boolean> | void;
  onUpdateTenderStatus?: (id: string, statusType: TenderStatusType, isActive: boolean) => Promise<boolean> | void;
  onUpdateSubmissionStatus?: (id: string, status: SubmissionStatus) => Promise<boolean> | void;
  onDelete?: (id: string) => Promise<boolean> | void;
  isSelected?: boolean;
  onSelect?: (id: string, event: MouseEvent<HTMLTableRowElement>) => void;
}

const TENDER_STATUS_ORDER: TenderStatusType[] = ['brief', 'tender', 'rec', 'award'];

const TENDER_STATUS_LABELS: Record<TenderStatusType, string> = {
  brief: 'T',
  tender: 'S',
  rec: 'R',
  award: 'A',
};

const TENDER_STATUS_TOOLTIPS: Record<TenderStatusType, string> = {
  brief: 'Tender Released',
  tender: 'Tender Submitted',
  rec: 'Tender Recommended',
  award: 'Tender Awarded',
};

const SUBMISSION_STATUS_STYLES: Record<SubmissionStatus, CSSProperties> = {
  pending: {
    background: 'white',
    borderColor: 'var(--sw-rule)',
    color: 'var(--sw-muted)',
  },
  submitted: {
    background: 'color-mix(in srgb, var(--sw-cyan) 24%, white)',
    borderColor: 'color-mix(in srgb, var(--sw-cyan) 60%, white)',
    color: 'var(--sw-ink)',
  },
  approved: {
    background: 'color-mix(in srgb, #5C7A4A 22%, white)',
    borderColor: 'color-mix(in srgb, #5C7A4A 55%, white)',
    color: 'var(--sw-ink)',
  },
  rejected: {
    background: 'var(--sw-rose-tint)',
    borderColor: 'var(--sw-rose)',
    color: 'var(--sw-rose-dk)',
  },
  withdrawn: {
    background: 'var(--sw-paper)',
    borderColor: 'var(--sw-rule)',
    color: 'var(--sw-muted)',
  },
};

const GROUP_LABELS: Record<StakeholderGroup, string> = {
  client: 'Client',
  authority: 'Authority',
  consultant: 'Consultant',
  contractor: 'Contractor',
};

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function InlineEdit({ value, onSave, placeholder, className, disabled }: InlineEditProps) {
  const [editValue, setEditValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused && !isSaving) {
      setEditValue(value);
    }
  }, [value, isFocused, isSaving]);

  const handleSave = async () => {
    if (editValue === value || disabled) return;

    setIsSaving(true);
    try {
      await onSave(editValue);
    } catch {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      inputRef.current?.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditValue(value);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(event) => setEditValue(event.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        void handleSave();
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled || isSaving}
      className={cn(
        'h-6 w-full bg-transparent px-1 py-0.5 text-[11px] outline-none transition-colors focus-visible:outline-none',
        'placeholder:text-[var(--sw-muted)]',
        'hover:bg-[var(--sw-canvas)] focus:bg-white',
        isFocused ? 'border border-[var(--sw-rose)]' : 'border border-transparent',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={{ fontFamily: 'var(--sw-font-mono)' }}
    />
  );
}

export function StakeholderRow({
  stakeholder,
  onUpdate,
  onUpdateTenderStatus,
  onUpdateSubmissionStatus,
  onDelete,
  isSelected,
  onSelect,
}: StakeholderRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isConsultantOrContractor =
    stakeholder.stakeholderGroup === 'consultant' ||
    stakeholder.stakeholderGroup === 'contractor';
  const isAuthority = stakeholder.stakeholderGroup === 'authority';
  const isClient = stakeholder.stakeholderGroup === 'client';

  const tenderStatuses = isConsultantOrContractor
    ? (stakeholder as StakeholderWithStatus & { tenderStatuses: TenderStatus[] }).tenderStatuses || []
    : [];

  const submissionStatus = isAuthority
    ? (stakeholder as StakeholderWithStatus & { submissionStatus?: SubmissionStatusRecord }).submissionStatus
    : undefined;

  const handleSaveSubgroup = async (newValue: string) => {
    if (onUpdate && newValue.trim()) {
      await onUpdate(stakeholder.id, { name: newValue.trim(), disciplineOrTrade: newValue.trim() });
    }
  };

  const handleSaveFirm = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { organization: newValue.trim() || undefined });
    }
  };

  const handleSaveContactName = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { contactName: newValue.trim() || undefined });
    }
  };

  const handleSavePhone = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { contactPhone: newValue.trim() || undefined });
    }
  };

  const handleSaveEmail = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { contactEmail: newValue.trim() || undefined });
    }
  };

  return (
    <tr
      className={cn(
        'h-8 cursor-pointer select-none border-b border-[var(--sw-rule-2)] bg-[var(--sw-shell)] transition-colors hover:bg-[var(--sw-rose-tint)]',
        isSelected && 'bg-[var(--sw-rose-tint)] hover:bg-[var(--sw-rose-tint)]'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(event) => event.shiftKey && event.preventDefault()}
      onClick={(event) => onSelect?.(stakeholder.id, event)}
      aria-selected={isSelected}
    >
      <td className="px-3 py-1 text-[11px] text-[var(--sw-muted)]">
        {GROUP_LABELS[stakeholder.stakeholderGroup]}
      </td>

      <td className="px-2 py-1">
        <InlineEdit
          value={stakeholder.name}
          onSave={handleSaveSubgroup}
          placeholder="Subgroup"
          disabled={!onUpdate}
          className="font-semibold text-[var(--sw-ink)]"
        />
      </td>

      <td className="px-2 py-1">
        <InlineEdit
          value={stakeholder.organization || ''}
          onSave={handleSaveFirm}
          placeholder="Firm"
          disabled={!onUpdate}
          className="text-[var(--sw-ink)]"
        />
      </td>

      <td className="px-2 py-1">
        <InlineEdit
          value={stakeholder.contactName || ''}
          onSave={handleSaveContactName}
          placeholder="Name"
          disabled={!onUpdate}
          className="text-[var(--sw-muted)]"
        />
      </td>

      <td className="px-2 py-1">
        <InlineEdit
          value={stakeholder.contactPhone || ''}
          onSave={handleSavePhone}
          placeholder="Phone"
          disabled={!onUpdate}
          className="text-[var(--sw-muted)]"
        />
      </td>

      <td className="px-2 py-1">
        <InlineEdit
          value={stakeholder.contactEmail || ''}
          onSave={handleSaveEmail}
          placeholder="Email"
          disabled={!onUpdate}
          className="text-[var(--sw-muted)]"
        />
      </td>

      <td className="pl-2 pr-3 py-1">
        {isConsultantOrContractor && tenderStatuses.length > 0 && (
          <div className="flex items-center gap-0.5">
            {TENDER_STATUS_ORDER.map((type) => {
              const status = tenderStatuses.find((s) => s.statusType === type);
              const isActive = Boolean(status?.isActive || status?.isComplete);

              return (
                <button
                  key={type}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUpdateTenderStatus?.(stakeholder.id, type, !isActive);
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    'h-5 w-5 cursor-pointer border text-[10px] font-semibold transition-colors hover:opacity-80',
                    isActive
                      ? 'border-[var(--sw-ink)] bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                      : 'border-[var(--sw-rule)] bg-white text-[var(--sw-muted)]'
                  )}
                  style={{ fontFamily: 'var(--sw-font-mono)' }}
                  title={TENDER_STATUS_TOOLTIPS[type]}
                >
                  {TENDER_STATUS_LABELS[type]}
                </button>
              );
            })}
          </div>
        )}

        {isAuthority && (
          <select
            value={submissionStatus?.status || 'pending'}
            onChange={(event) =>
              onUpdateSubmissionStatus?.(stakeholder.id, event.target.value as SubmissionStatus)
            }
            onClick={(event) => event.stopPropagation()}
            className="h-6 cursor-pointer border px-2 text-[11px] outline-none"
            style={{
              ...SUBMISSION_STATUS_STYLES[submissionStatus?.status || 'pending'],
              fontFamily: 'var(--sw-font-mono)',
            }}
          >
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        )}

        {isClient && <span className="text-[var(--sw-muted)]">--</span>}
      </td>

      <td className="w-10 px-1 py-1 text-right">
        {onDelete && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onDelete(stakeholder.id);
            }}
            className={cn(
              'p-1 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]',
              !isHovered && !isSelected && 'invisible'
            )}
            title="Delete stakeholder"
          >
            <Trash className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
