'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, Upload, Trash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FirmData, FirmType } from './types';

interface FirmCardExpandedProps {
  type: FirmType;
  firm: FirmData;
  onToggleExpand: () => void;
  onSave: (data: Partial<FirmData>) => Promise<void>;
  onDelete: () => void;
  onShortlistToggle: (shortlisted: boolean) => Promise<void>;
  onAwardToggle: (awarded: boolean) => Promise<void>;
  onFileUpload: () => void;
  isDragOver: boolean;
  isNew?: boolean;
}

interface InlineFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  type?: 'text' | 'email' | 'tel';
}

function InlineField({ label, value, onSave, placeholder, required, multiline, type = 'text' }: InlineFieldProps) {
  const [editValue, setEditValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setEditValue(value);
    }
  }, [value, isFocused]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleBlur = async () => {
    setIsFocused(false);
    if (editValue === value) return;
    if (required && !editValue.trim()) {
      setEditValue(value);
      return;
    }

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onSave(editValue);
      } catch {
        setEditValue(value);
      } finally {
        setIsSaving(false);
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      (e.target as HTMLElement).blur();
    }
  };

  const baseStyles = `
    w-full px-2 py-1 rounded text-[var(--color-text-primary)] text-sm
    bg-transparent border border-transparent
    transition-colors duration-150
    focus:outline-none focus:bg-[var(--color-bg-tertiary)] focus:border-[var(--color-accent-teal)] focus:text-[var(--color-text-primary)]
    hover:border-[var(--color-border)]
    disabled:opacity-50
    resize-none
    selection:bg-[var(--color-accent-teal-tint)] selection:text-[var(--color-text-primary)]
  `;

  return (
    <div className="space-y-0.5">
      <label className="text-[11px] text-[var(--color-text-muted)]">
        {label} {required && <span className="text-[var(--color-accent-coral)]">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={baseStyles + ' min-h-[60px]'}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSaving}
          className={baseStyles + ' h-7'}
        />
      )}
    </div>
  );
}

export function FirmCardExpanded({
  type,
  firm,
  onToggleExpand,
  onSave,
  onDelete,
  onShortlistToggle,
  onAwardToggle,
  onFileUpload,
  isDragOver,
  isNew = false,
}: FirmCardExpandedProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editName, setEditName] = useState(firm.companyName);
  const [isEditingName, setIsEditingName] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(firm.companyName);
  }, [firm.companyName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      if (!isNew) {
        nameInputRef.current.select();
      }
    }
  }, [isEditingName, isNew]);

  const handleNameSave = async () => {
    if (editName === firm.companyName) {
      setIsEditingName(false);
      return;
    }

    if (!editName.trim()) {
      setEditName(firm.companyName);
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ companyName: editName });
    } catch {
      setEditName(firm.companyName);
    } finally {
      setIsSaving(false);
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(firm.companyName);
      setIsEditingName(false);
    }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShortlistToggle(!firm.shortlisted);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileUpload();
  };

  const handleAwardToggle = async (checked: boolean) => {
    setIsAwarding(true);
    try {
      await onAwardToggle(checked);
    } finally {
      setIsAwarding(false);
    }
  };

  const handleFieldSave = async (field: keyof FirmData, value: string) => {
    await onSave({ [field]: value });
  };

  return (
    <div
      className={`
        rounded-lg bg-[var(--color-bg-secondary)] border transition-colors duration-150
        ${isDragOver ? 'border-[var(--color-accent-teal)] border-dashed border-2' : 'border-[var(--color-border)]'}
        ${isHovered && !isDragOver ? 'border-[var(--color-accent-teal)]' : ''}
        ${firm.awarded ? 'border-l-[3px] border-l-[var(--color-accent-green)]' : ''}
        w-[220px] flex-shrink-0
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex flex-col px-3 py-2 border-b border-[var(--color-border)]">
        {/* Row 1: Company name - full width */}
        <div className="w-full h-7 flex items-center">
          <input
            ref={nameInputRef}
            type="text"
            value={isEditingName ? editName : (firm.companyName || '')}
            onChange={(e) => setEditName(e.target.value)}
            onFocus={() => {
              setEditName(firm.companyName);
              setIsEditingName(true);
            }}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            disabled={isSaving}
            placeholder="Enter company name"
            className={`
              w-full h-7 px-2 py-1 rounded text-[var(--color-text-primary)] text-sm
              bg-transparent border border-transparent
              transition-colors duration-150
              focus:outline-none focus:bg-[var(--color-bg-tertiary)] focus:border-[var(--color-accent-teal)] focus:text-[var(--color-text-primary)]
              hover:border-[var(--color-border)]
              disabled:opacity-50
              selection:bg-[var(--color-accent-teal-tint)] selection:text-[var(--color-text-primary)]
            `}
          />
        </div>

        {/* Row 2: Action icons - distributed equally (same as compact) */}
        <div className="flex items-center justify-between mt-1">
          {/* Star toggle */}
          <button
            onClick={handleStarClick}
            className={`
              p-0.5 rounded transition-colors
              ${firm.shortlisted ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}
            `}
            title={firm.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            <Star className={`w-3.5 h-3.5 ${firm.shortlisted ? 'fill-current' : ''}`} />
          </button>

          {/* Folder upload */}
          <button
            onClick={handleUploadClick}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Upload file to extract data"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={onDelete}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)] transition-colors"
            title="Delete firm"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>

          {/* Collapse triangle (rotated 90 degrees to point down) */}
          <button
            onClick={onToggleExpand}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Collapse"
          >
            <svg
              className="w-3.5 h-3.5 rotate-90"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <polygon points="2,0 12,6 2,12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-3 py-2 space-y-2">
        <InlineField
          label="Contact Person"
          value={firm.contactPerson}
          onSave={(v) => handleFieldSave('contactPerson', v)}
          placeholder="e.g., John Smith"
        />
        <InlineField
          label="Email"
          value={firm.email}
          onSave={(v) => handleFieldSave('email', v)}
          placeholder="email@example.com"
          required
          type="email"
        />
        {type === 'consultant' && (
          <InlineField
            label="Mobile"
            value={firm.mobile || ''}
            onSave={(v) => handleFieldSave('mobile', v)}
            placeholder="0412 345 678"
            type="tel"
          />
        )}
        <InlineField
          label="Address"
          value={firm.address}
          onSave={(v) => handleFieldSave('address', v)}
          placeholder="123 Main St, Sydney NSW 2000"
        />
        <InlineField
          label="ABN"
          value={firm.abn}
          onSave={(v) => handleFieldSave('abn', v)}
          placeholder="12 345 678 901"
        />
        <InlineField
          label="Notes"
          value={firm.notes}
          onSave={(v) => handleFieldSave('notes', v)}
          placeholder="Additional notes..."
          multiline
        />
      </div>

      {/* Footer */}
      <div className="flex items-center px-3 py-2 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-1">
          <Label className="text-[var(--color-text-muted)] text-xs">Award</Label>
          <Switch
            checked={firm.awarded}
            onCheckedChange={handleAwardToggle}
            disabled={!firm.id || isAwarding}
            className="scale-75"
          />
          {firm.awarded && (
            <span className="text-[10px] text-[var(--color-accent-green)] ml-1">Awarded</span>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-accent-teal)]/20 rounded-lg pointer-events-none">
          <span className="text-[var(--color-text-primary)] text-sm font-medium">Drop to extract</span>
        </div>
      )}
    </div>
  );
}
