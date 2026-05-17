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
        ${isDragOver || isHovered ? 'border-[var(--sw-cta-hover)] bg-[var(--sw-cta-hover)]' : 'border-[var(--sw-cta)] bg-[var(--sw-cta)]'}
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
          w-5 h-5 transition-colors text-[var(--sw-cta-fg)]
        `}
      />
      <span
        className={`
          transition-colors text-[var(--sw-cta-fg)]
        `}
        style={{
          fontFamily: 'var(--sw-font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
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
