'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { KNOWLEDGE_LIBRARY_TYPES } from '@/lib/constants/libraries';

interface Library {
  id: string | null;
  type: string;
  name: string;
  color: string;
  documentCount: number;
}

interface LibraryUploadTilesProps {
  libraries: Library[];
  selectedType: string | null;
  onSelectType: (type: string) => void;
  onFilesDropped: (files: File[], libraryType: string) => void;
  isLoading?: boolean;
}

export function LibraryUploadTiles({
  libraries,
  selectedType,
  onSelectType,
  onFilesDropped,
  isLoading,
}: LibraryUploadTilesProps) {
  const [dragOverType, setDragOverType] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverType(type);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverType(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverType(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(files, type);
      }
    },
    [onFilesDropped]
  );

  const handleClick = useCallback(
    (type: string) => {
      onSelectType(type);
    },
    [onSelectType]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-16 bg-[#2a2d2e] rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Use static library types, merge with actual counts
  const libraryTiles = KNOWLEDGE_LIBRARY_TYPES.map((type) => {
    const lib = libraries.find((l) => l.type === type.id);
    return {
      type: type.id,
      name: type.name,
      color: type.color,
      documentCount: lib?.documentCount || 0,
    };
  });

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
      {libraryTiles.map((library) => {
        const isSelected = selectedType === library.type;
        const isDragOver = dragOverType === library.type;

        return (
          <button
            key={library.type}
            onClick={() => handleClick(library.type)}
            onDragOver={(e) => handleDragOver(e, library.type)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, library.type)}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded border transition-all
              min-h-[64px] text-center
              ${
                isSelected
                  ? 'border-[#0e639c] bg-[#0e639c]/20'
                  : isDragOver
                  ? 'border-[#0e639c] bg-[#1e1e1e] scale-105'
                  : 'border-[#3e3e42] bg-[#252526] hover:bg-[#2a2d2e]'
              }
            `}
          >
            {/* Color indicator */}
            <div
              className="absolute top-0 left-0 right-0 h-1 rounded-t"
              style={{ backgroundColor: library.color }}
            />

            {isDragOver ? (
              <Upload className="w-5 h-5 text-[#0e639c] mb-1" />
            ) : (
              <span className="text-sm font-medium text-[#cccccc] truncate w-full">
                {library.name}
              </span>
            )}

            {!isDragOver && (
              <span className="text-xs text-[#808080] mt-1">
                {library.documentCount} {library.documentCount === 1 ? 'doc' : 'docs'}
              </span>
            )}

            {isDragOver && (
              <span className="text-xs text-[#0e639c]">Drop to upload</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
