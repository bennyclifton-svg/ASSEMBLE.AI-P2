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
        flex flex-col px-3 py-1.5
        bg-transparent border border-[var(--sw-rule)] transition-colors duration-150
        ${isDragOver ? 'ring-2 ring-[var(--sw-cyan)] ring-inset' : ''}
        ${isHovered && !isDragOver ? 'bg-[var(--sw-paper)]' : ''}
        ${firm.awarded ? 'border-l-[3px] border-l-[var(--sw-rose)]' : ''}
        w-[200px] flex-shrink-0 group
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Row 1: Company name - full width */}
      <div className="w-full h-6 flex items-center">
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
            w-full h-6 px-1 py-0.5 text-[var(--sw-ink)] text-xs font-medium
            bg-transparent border-none outline-none
            transition-colors duration-150
            disabled:opacity-50
            selection:bg-[var(--sw-rose-tint)] selection:text-[var(--sw-ink)]
          `}
          style={{ fontFamily: 'var(--sw-font-sans)' }}
        />
      </div>

      {/* Row 2: Action icons */}
      <div className="flex items-center justify-between mt-0.5">
        {/* Star toggle with label */}
        <button
          onClick={handleStarClick}
            className={`
            flex items-center gap-1 p-0.5 transition-colors
            ${firm.shortlisted ? 'text-[var(--sw-cyan)]' : 'text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'}
          `}
          title={firm.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
        >
          <Star className={`w-3.5 h-3.5 ${firm.shortlisted ? 'fill-current' : ''}`} />
          <span className="text-[10px]" style={{ fontFamily: 'var(--sw-font-mono)', textTransform: 'lowercase' }}>Shortlisted</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Folder upload */}
          <button
            onClick={handleUploadClick}
            className="p-0.5 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            title="Upload file to extract data"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            className="p-0.5 text-[var(--sw-muted)] hover:text-[var(--sw-rose-dk)] transition-colors"
            title="Delete firm"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>

          {/* Expand chevron */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1 text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors"
            title="Expand card"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-accent-teal)]/20 pointer-events-none">
          <span className="text-[var(--sw-ink)] text-xs font-medium">Drop to extract</span>
        </div>
      )}
    </div>
  );
}
