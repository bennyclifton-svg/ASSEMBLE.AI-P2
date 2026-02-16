'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, Upload, Trash, ChevronDown } from 'lucide-react';
import { FirmData } from './types';

interface FirmCardCompactProps {
  firm: FirmData;
  onSave: (data: Partial<FirmData>) => Promise<void>;
  onDelete: () => void;
  onShortlistToggle: (shortlisted: boolean) => Promise<void>;
  onFileUpload: () => void;
  isDragOver: boolean;
  onToggleExpand: () => void;
}

export function FirmCardCompact({
  firm,
  onSave,
  onDelete,
  onShortlistToggle,
  onFileUpload,
  isDragOver,
  onToggleExpand,
}: FirmCardCompactProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(firm.companyName);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(firm.companyName);
  }, [firm.companyName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={`
        flex flex-col px-3 py-2
        bg-[var(--color-card-firm)] border border-[var(--color-card-firm-border)] transition-colors duration-150 shadow-md
        ${isDragOver ? 'ring-2 ring-[var(--color-accent-teal)] ring-inset' : ''}
        ${isHovered && !isDragOver ? 'bg-[var(--color-card-firm-hover)]' : ''}
        ${firm.awarded ? 'border-l-[3px] border-l-[var(--color-accent-green)]' : ''}
        w-[220px] flex-shrink-0 group
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Row 1: Company name - full width */}
      <div className="w-full h-7 flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={isEditingName ? editName : (firm.companyName || '')}
          onChange={(e) => setEditName(e.target.value)}
          onFocus={() => {
            setEditName(firm.companyName);
            setIsEditingName(true);
          }}
          onBlur={handleNameSave}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          disabled={isSaving}
          placeholder="Enter Firm Name"
          className={`
            w-full h-7 px-1 py-1 text-[var(--color-text-primary)] text-sm font-medium
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
            onClick={handleDeleteClick}
            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent-coral)] transition-colors"
            title="Delete firm"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>

          {/* Expand chevron */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Expand card"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-accent-teal)]/20 rounded-lg pointer-events-none">
          <span className="text-[var(--color-text-primary)] text-xs font-medium">Drop to extract</span>
        </div>
      )}
    </div>
  );
}
