'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import type {
  StakeholderWithStatus,
  TenderStatus,
  TenderStatusType,
  SubmissionStatusRecord,
  SubmissionStatus,
  UpdateStakeholderRequest,
  StakeholderGroup,
} from '@/types/stakeholder';

interface StakeholderRowProps {
  stakeholder: StakeholderWithStatus;
  onUpdate?: (id: string, data: UpdateStakeholderRequest) => Promise<StakeholderWithStatus | null>;
  onUpdateTenderStatus?: (id: string, statusType: TenderStatusType, isActive: boolean) => void;
  onUpdateSubmissionStatus?: (id: string, status: SubmissionStatus) => void;
  onDelete?: (id: string) => void;
}

// Tender status labels
const TENDER_STATUS_LABELS: Record<TenderStatusType, string> = {
  brief: 'B',
  tender: 'T',
  rec: 'R',
  award: 'A',
};

// Submission status colors
const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: 'bg-gray-200 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
};

// Group display names
const GROUP_LABELS: Record<StakeholderGroup, string> = {
  client: 'Client',
  authority: 'Authority',
  consultant: 'Consultant',
  contractor: 'Contractor',
};

// Inline editable field component
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
    } catch (error) {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled || isSaving}
      className={cn(
        'w-full bg-transparent outline-none focus-visible:outline-none text-sm',
        'placeholder:text-[var(--color-text-muted)]',
        'hover:bg-[var(--color-bg-secondary)] focus:bg-[var(--color-bg-secondary)]',
        'px-1 py-0.5 transition-colors',
        isFocused
          ? 'border border-[var(--color-accent-primary)]'
          : 'border border-transparent',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    />
  );
}

export function StakeholderRow({
  stakeholder,
  onUpdate,
  onUpdateTenderStatus,
  onUpdateSubmissionStatus,
  onDelete,
}: StakeholderRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isConsultantOrContractor =
    stakeholder.stakeholderGroup === 'consultant' ||
    stakeholder.stakeholderGroup === 'contractor';

  const isAuthority = stakeholder.stakeholderGroup === 'authority';
  const isClient = stakeholder.stakeholderGroup === 'client';

  // Get tender statuses if available
  const tenderStatuses = isConsultantOrContractor
    ? (stakeholder as StakeholderWithStatus & { tenderStatuses: TenderStatus[] }).tenderStatuses || []
    : [];

  // Get submission status if available
  const submissionStatus = isAuthority
    ? (stakeholder as StakeholderWithStatus & { submissionStatus?: SubmissionStatusRecord })
        .submissionStatus
    : undefined;

  // Handler for saving subgroup (the discipline/role name stored in 'name' field)
  const handleSaveSubgroup = async (newValue: string) => {
    if (onUpdate && newValue.trim()) {
      await onUpdate(stakeholder.id, { name: newValue.trim() });
    }
  };

  // Handler for saving firm (organization)
  const handleSaveFirm = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { organization: newValue.trim() || undefined });
    }
  };

  // Handler for saving contact name (actual person's name)
  const handleSaveContactName = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { contactName: newValue.trim() || undefined });
    }
  };

  // Handler for saving phone
  const handleSavePhone = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { contactPhone: newValue.trim() || undefined });
    }
  };

  // Handler for saving email
  const handleSaveEmail = async (newValue: string) => {
    if (onUpdate) {
      await onUpdate(stakeholder.id, { contactEmail: newValue.trim() || undefined });
    }
  };

  return (
    <tr
      className={cn(
        'transition-all duration-150 border-b border-[var(--color-border)]',
        isHovered ? 'bg-[var(--color-bg-tertiary)]' : 'bg-transparent'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Group */}
      <td className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
        {GROUP_LABELS[stakeholder.stakeholderGroup]}
      </td>

      {/* SubGroup - the discipline/role name */}
      <td className="px-3 py-2">
        <InlineEdit
          value={stakeholder.name}
          onSave={handleSaveSubgroup}
          placeholder="SubGroup"
          disabled={!onUpdate}
          className="text-[var(--color-text-primary)]"
        />
      </td>

      {/* Firm */}
      <td className="px-3 py-2">
        <InlineEdit
          value={stakeholder.organization || ''}
          onSave={handleSaveFirm}
          placeholder="Firm"
          disabled={!onUpdate}
          className="text-[var(--color-text-primary)]"
        />
      </td>

      {/* Name - actual person's name (contactName) */}
      <td className="px-3 py-2">
        <InlineEdit
          value={stakeholder.contactName || ''}
          onSave={handleSaveContactName}
          placeholder="Name"
          disabled={!onUpdate}
          className="text-[var(--color-text-muted)]"
        />
      </td>

      {/* Phone */}
      <td className="px-3 py-2">
        <InlineEdit
          value={stakeholder.contactPhone || ''}
          onSave={handleSavePhone}
          placeholder="Phone"
          disabled={!onUpdate}
          className="text-[var(--color-text-muted)]"
        />
      </td>

      {/* Email */}
      <td className="px-3 py-2">
        <InlineEdit
          value={stakeholder.contactEmail || ''}
          onSave={handleSaveEmail}
          placeholder="Email"
          disabled={!onUpdate}
          className="text-[var(--color-text-muted)]"
        />
      </td>

      {/* Status */}
      <td className="px-3 py-2">
        {/* Tender Progress Bar (Consultant/Contractor) */}
        {isConsultantOrContractor && tenderStatuses.length > 0 && (
          <div className="flex items-center gap-0.5">
            {(['brief', 'tender', 'rec', 'award'] as TenderStatusType[]).map((type) => {
              const status = tenderStatuses.find((s) => s.statusType === type);
              const isActive = status?.isActive || false;
              const isComplete = status?.isComplete || false;

              return (
                <button
                  key={type}
                  onClick={() => {
                    if (onUpdateTenderStatus) {
                      onUpdateTenderStatus(stakeholder.id, type, !isActive);
                    }
                  }}
                  className={cn(
                    'w-5 h-5 text-xs font-medium rounded transition-colors',
                    isComplete
                      ? 'bg-[var(--color-accent-green)] text-white'
                      : isActive
                      ? 'bg-[var(--color-accent-blue)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]',
                    'hover:opacity-80 cursor-pointer'
                  )}
                  title={`${type.charAt(0).toUpperCase() + type.slice(1)}: ${
                    isComplete ? 'Complete' : isActive ? 'Active' : 'Pending'
                  }`}
                >
                  {TENDER_STATUS_LABELS[type]}
                </button>
              );
            })}
          </div>
        )}

        {/* Submission Status Badge (Authority) */}
        {isAuthority && (
          <select
            value={submissionStatus?.status || 'pending'}
            onChange={(e) =>
              onUpdateSubmissionStatus?.(stakeholder.id, e.target.value as SubmissionStatus)
            }
            className={cn(
              'text-xs px-2 py-1 rounded border-none cursor-pointer',
              SUBMISSION_STATUS_COLORS[submissionStatus?.status || 'pending']
            )}
          >
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        )}

        {/* Empty for Client */}
        {isClient && <span className="text-[var(--color-text-muted)]">—</span>}
      </td>

      {/* Actions */}
      <td className="px-3 py-2 w-10">
        {onDelete && (
          <button
            onClick={() => onDelete(stakeholder.id)}
            className={cn(
              'p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
            title="Delete stakeholder"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
}
