'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, Upload, Trash, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FirmData, FirmType } from './types';

interface FirmCardExpandedProps {
  type: FirmType;
  firm: FirmData;
  onSave: (data: Partial<FirmData>) => Promise<void>;
  onDelete: () => void;
  onShortlistToggle: (shortlisted: boolean) => Promise<void>;
  onAwardToggle: (awarded: boolean) => Promise<void>;
  onFileUpload: () => void;
  isDragOver: boolean;
  isNew?: boolean;
  onToggleExpand: () => void;
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
    w-full px-1 py-0.5 text-[var(--color-text-primary)] text-xs
    bg-transparent border-none outline-none
    transition-colors duration-150
    disabled:opacity-50
    resize-none
    selection:bg-[var(--color-accent-primary-tint)] selection:text-[var(--color-text-primary)]
  `;

  return (
    <div className="space-y-0">
      <label className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
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
          className={baseStyles + ' min-h-[40px]'}
          rows={2}
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
          className={baseStyles + ' h-5'}
        />
      )}
    </div>
  );
}

export function FirmCardExpanded({
  type,
  firm,
  onSave,
  onDelete,
  onShortlistToggle,
  onAwardToggle,
  onFileUpload,
  isDragOver,
  isNew = false,
  onToggleExpand,
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
    }
  }, [isEditingName]);

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
        bg-[var(--color-card-firm)] border border-[var(--color-card-firm-border)] transition-colors duration-150 shadow-md
        ${isDragOver ? 'ring-2 ring-[var(--color-accent-teal)] ring-inset' : ''}
        ${isHovered && !isDragOver ? 'bg-[var(--color-card-firm-hover)]' : ''}
        ${firm.awarded ? 'border-l-[3px] border-l-[var(--color-accent-green)]' : ''}
        w-[220px] flex-shrink-0
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex flex-col px-3 py-1.5 border-b border-[var(--color-border)]">
        {/* Row 1: Company name - full width */}
        <div className="w-full h-6 flex items-center">
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
              w-full h-6 px-1 py-0.5 text-[var(--color-text-primary)] text-sm font-medium
              bg-transparent border-none outline-none
              transition-colors duration-150
              disabled:opacity-50
              selection:bg-[var(--color-accent-primary-tint)] selection:text-[var(--color-text-primary)]
            `}
          />
        </div>

        {/* Row 2: Action icons */}
        <div className="flex items-center justify-between mt-1">
          {/* Star toggle with label */}
          <button
            onClick={handleStarClick}
            className={`
              flex items-center gap-1 p-0.5 rounded transition-colors
              ${firm.shortlisted ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}
            `}
            title={firm.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            <Star className={`w-3.5 h-3.5 ${firm.shortlisted ? 'fill-current' : ''}`} />
            <span className="text-[10px]">Shortlisted</span>
          </button>

          <div className="flex items-center gap-1">
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

            {/* Collapse chevron */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Collapse card"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="px-3 py-1.5 space-y-1">
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
      <div className="flex items-center px-3 py-1.5 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-1">
          <Label className="text-[var(--color-text-secondary)] text-[10px]">Award</Label>
          <Switch
            checked={firm.awarded}
            onCheckedChange={handleAwardToggle}
            disabled={!firm.id || isAwarding}
            className="scale-[0.6]"
          />
          {firm.awarded && (
            <span className="text-[10px] text-[var(--color-accent-green)]">Awarded</span>
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
