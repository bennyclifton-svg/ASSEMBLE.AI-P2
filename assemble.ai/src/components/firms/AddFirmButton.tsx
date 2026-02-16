'use client';

import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { AddFirmButtonProps } from './types';

export function AddFirmButton({ onAdd, onFileDrop }: Omit<AddFirmButtonProps, 'isExpanded'>) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Element | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];

    if (!validTypes.includes(file.type)) {
      return; // Gallery will show toast for invalid file type
    }

    await onFileDrop(file);
  };

  const handleClick = () => {
    onAdd();
  };

  return (
    <div
      className={`
        flex items-center justify-center px-3 py-2 cursor-pointer
        border-2 border-dashed transition-all duration-150 shadow-md
        ${isDragOver || isHovered ? 'border-[var(--color-accent-teal)] bg-[var(--color-card-firm-hover)]' : 'border-[var(--color-border-strong)] bg-[var(--color-card-firm)]'}
        w-[220px] flex-shrink-0 self-stretch min-h-[66px]
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title="Add new firm or drop file to extract"
    >
      <Plus
        className={`
          w-5 h-5 transition-colors
          ${isDragOver || isHovered ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-text-muted)]'}
        `}
      />
      <span
        className={`
          text-sm font-medium transition-colors
          ${isDragOver || isHovered ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-text-muted)]'}
        `}
      >
        New Firm
      </span>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await onFileDrop(file);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
