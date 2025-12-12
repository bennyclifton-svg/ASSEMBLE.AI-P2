'use client';

import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { AddFirmButtonProps } from './types';

export function AddFirmButton({ onAdd, onFileDrop }: AddFirmButtonProps) {
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

  // Match firm tile height: py-2 (8px) + h-7 (28px) + mt-1 (4px) + icons (~18px) + py-2 (8px) = ~66px
  // Using h-[53px] for inner content (28 + 4 + 18 = 50px, plus some flex)
  // Border style matches Document upload tile (CategoryTile with isUploadTile)
  const getBorderColor = () => {
    if (isDragOver || isHovered) return 'border-[#0e639c]';
    return 'border-[#555555]';
  };

  const getBackgroundStyle = () => {
    if (isDragOver) return 'bg-[#0e639c]/10';
    if (isHovered) return 'bg-[#0e639c]/5';
    return 'bg-[#252526]';
  };

  return (
    <div
      className={`
        flex items-center justify-center px-3 py-2 rounded-lg cursor-pointer
        border-2 border-dashed transition-all duration-150
        ${getBorderColor()} ${getBackgroundStyle()}
        w-[220px] h-[66px] flex-shrink-0
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
          w-6 h-6 transition-colors
          ${isDragOver || isHovered ? 'text-[#0e639c]' : 'text-[#858585]'}
        `}
      />

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
