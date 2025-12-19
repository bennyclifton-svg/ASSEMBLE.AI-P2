'use client';

import { useState, useRef, useEffect } from 'react';
import { Star, Upload, Trash } from 'lucide-react';
import { FirmData } from './types';

interface FirmCardCompactProps {
  firm: FirmData;
  onToggleExpand: () => void;
  onSave: (data: Partial<FirmData>) => Promise<void>;
  onDelete: () => void;
  onShortlistToggle: (shortlisted: boolean) => Promise<void>;
  onFileUpload: () => void;
  isDragOver: boolean;
}

export function FirmCardCompact({
  firm,
  onToggleExpand,
  onSave,
  onDelete,
  onShortlistToggle,
  onFileUpload,
  isDragOver,
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
      inputRef.current.select();
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
        flex flex-col px-3 py-2 rounded-lg cursor-pointer
        bg-[#1e1e1e] border transition-colors duration-150
        ${isDragOver ? 'border-[#0e639c] border-dashed border-2' : 'border-[#3e3e42]'}
        ${isHovered && !isDragOver ? 'border-[#0e639c]' : ''}
        ${firm.awarded ? 'border-l-[3px] border-l-[#22c55e]' : ''}
        w-[220px] flex-shrink-0 group
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onToggleExpand}
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
          placeholder="Enter company name"
          className={`
            w-full h-7 px-2 py-1 rounded text-[#cccccc] text-sm
            bg-transparent border border-transparent
            transition-colors duration-150
            focus:outline-none focus:bg-[#3c3c3c] focus:border-[#0e639c] focus:text-[#cccccc]
            hover:border-[#3e3e42]
            disabled:opacity-50
            selection:bg-[#264f78] selection:text-[#cccccc]
          `}
        />
      </div>

      {/* Row 2: Action icons - distributed equally */}
      <div className="flex items-center justify-between mt-1">
        {/* Star toggle */}
        <button
          onClick={handleStarClick}
          className={`
            p-0.5 rounded transition-colors
            ${firm.shortlisted ? 'text-[#D4A574]' : 'text-[#858585] hover:text-[#cccccc]'}
          `}
          title={firm.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
        >
          <Star className={`w-3.5 h-3.5 ${firm.shortlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Folder upload */}
        <button
          onClick={handleUploadClick}
          className="p-0.5 rounded text-[#858585] hover:text-[#cccccc] transition-colors"
          title="Upload file to extract data"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="p-0.5 rounded text-[#858585] hover:text-red-400 transition-colors"
          title="Delete firm"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>

        {/* Expand triangle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 rounded text-[#858585] hover:text-[#cccccc] transition-colors"
          title="Expand"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <polygon points="2,0 12,6 2,12" />
          </svg>
        </button>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0e639c]/20 rounded-lg pointer-events-none">
          <span className="text-[#cccccc] text-xs font-medium">Drop to extract</span>
        </div>
      )}
    </div>
  );
}
