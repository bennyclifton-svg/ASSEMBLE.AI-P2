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
        flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer
        border transition-colors duration-150
        ${isDragOver || isHovered ? 'border-[var(--sw-rose-dk)] bg-[var(--sw-rose-dk)]' : 'border-[var(--sw-rose)] bg-[var(--sw-rose)]'}
        w-[200px] flex-shrink-0 self-stretch min-h-[56px]
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
          ${isDragOver || isHovered ? 'text-white' : 'text-[var(--sw-ink)]'}
        `}
      />
      <span
        className={`
          text-[10px] font-medium transition-colors
          ${isDragOver || isHovered ? 'text-white' : 'text-[var(--sw-ink)]'}
        `}
        style={{
          fontFamily: 'var(--sw-font-mono)',
          letterSpacing: '0.08em',
          textTransform: 'lowercase',
        }}
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
