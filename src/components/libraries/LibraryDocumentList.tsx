'use client';

import React, { useState, useCallback } from 'react';
import { FileText, Trash2, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LibraryDocument {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  addedAt: number;
  syncStatus: 'pending' | 'processing' | 'synced' | 'failed';
}

interface LibraryDocumentListProps {
  documents: LibraryDocument[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (ids: string[]) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export function LibraryDocumentList({
  documents,
  selectedIds,
  onSelectionChange,
  onDelete,
  isLoading,
  isDeleting,
}: LibraryDocumentListProps) {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#4ec9b0]/20 text-[#4ec9b0]">
            Synced
          </span>
        );
      case 'processing':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#dcdcaa]/20 text-[#dcdcaa] flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#f48771]/20 text-[#f48771]">
            Failed
          </span>
        );
      default:
        return (
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#808080]/20 text-[#808080]">
            Pending
          </span>
        );
    }
  };

  const handleRowClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      const doc = documents[index];
      const newSelectedIds = new Set(selectedIds);

      if (event.shiftKey && lastSelectedIndex !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          newSelectedIds.add(documents[i].id);
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Toggle selection
        if (newSelectedIds.has(doc.id)) {
          newSelectedIds.delete(doc.id);
        } else {
          newSelectedIds.add(doc.id);
        }
      } else {
        // Single selection
        newSelectedIds.clear();
        newSelectedIds.add(doc.id);
      }

      setLastSelectedIndex(index);
      onSelectionChange(newSelectedIds);
    },
    [documents, selectedIds, lastSelectedIndex, onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === documents.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(documents.map((d) => d.id)));
    }
  }, [documents, selectedIds, onSelectionChange]);

  const handleDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      onDelete(Array.from(selectedIds));
    }
  }, [selectedIds, onDelete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 text-[#808080] animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <FileText className="w-8 h-8 mb-2" />
        <p className="text-sm">No documents in this library</p>
        <p className="text-xs mt-1">Drag and drop files to upload</p>
      </div>
    );
  }

  const allSelected = selectedIds.size === documents.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-[#3e3e42]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className={`
              w-5 h-5 rounded border flex items-center justify-center transition-colors
              ${
                allSelected
                  ? 'bg-[#0e639c] border-[#0e639c]'
                  : 'border-[#3e3e42] hover:border-[#0e639c]'
              }
            `}
          >
            {allSelected && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className="text-xs text-[#808080]">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : `${documents.length} documents`}
          </span>
        </div>

        {selectedIds.size > 0 && (
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="ghost"
            size="sm"
            className="text-[#f48771] hover:bg-[#f48771]/10"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="ml-1">Delete</span>
          </Button>
        )}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-auto">
        {documents.map((doc, index) => {
          const isSelected = selectedIds.has(doc.id);

          return (
            <div
              key={doc.id}
              onClick={(e) => handleRowClick(index, e)}
              className={`
                flex items-center gap-3 p-3 border-b border-[#3e3e42] cursor-pointer transition-colors
                ${isSelected ? 'bg-[#0e639c]/20' : 'hover:bg-[#2a2d2e]'}
              `}
            >
              {/* Selection indicator */}
              <div
                className={`
                  w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                  ${
                    isSelected
                      ? 'bg-[#0e639c] border-[#0e639c]'
                      : 'border-[#3e3e42]'
                  }
                `}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* File icon */}
              <FileText className="w-5 h-5 text-[#808080] flex-shrink-0" />

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#cccccc] truncate">{doc.fileName}</div>
                <div className="flex items-center gap-2 text-xs text-[#6e6e6e] mt-0.5">
                  <span>{formatFileSize(doc.sizeBytes)}</span>
                  <span>•</span>
                  <span>{formatDate(doc.addedAt)}</span>
                </div>
              </div>

              {/* Sync status */}
              {getSyncStatusBadge(doc.syncStatus)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
