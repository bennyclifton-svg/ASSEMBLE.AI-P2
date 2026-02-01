'use client';

import { useState, useRef } from 'react';
import { FirmCardCompact } from './FirmCardCompact';
import { FirmCardExpanded } from './FirmCardExpanded';
import { DropActionDialog } from './DropActionDialog';
import { FirmCardProps } from './types';

export function FirmCard({
  type,
  firm,
  category,
  onSave,
  onDelete,
  onShortlistToggle,
  onAwardToggle,
  onFileDrop,
}: FirmCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropDialog, setShowDropDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

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

    // Show dialog to ask replace or add new
    setPendingFile(file);
    setShowDropDialog(true);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    // Show dialog to ask replace or add new
    setPendingFile(file);
    setShowDropDialog(true);

    // Reset input
    e.target.value = '';
  };

  const handleReplace = async () => {
    if (pendingFile) {
      await onFileDrop(pendingFile, 'replace');
    }
    setShowDropDialog(false);
    setPendingFile(null);
  };

  const handleAddNew = async () => {
    if (pendingFile) {
      await onFileDrop(pendingFile, 'add');
    }
    setShowDropDialog(false);
    setPendingFile(null);
  };

  const handleDelete = () => {
    onDelete();
  };

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isExpanded ? (
        <FirmCardExpanded
          type={type}
          firm={firm}
          onSave={onSave}
          onDelete={handleDelete}
          onShortlistToggle={onShortlistToggle}
          onAwardToggle={onAwardToggle}
          onFileUpload={handleFileUpload}
          isDragOver={isDragOver}
          onToggleExpand={handleToggleExpand}
        />
      ) : (
        <FirmCardCompact
          firm={firm}
          onSave={onSave}
          onDelete={handleDelete}
          onShortlistToggle={onShortlistToggle}
          onFileUpload={handleFileUpload}
          isDragOver={isDragOver}
          onToggleExpand={handleToggleExpand}
        />
      )}

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drop action dialog */}
      <DropActionDialog
        open={showDropDialog}
        onOpenChange={setShowDropDialog}
        onReplace={handleReplace}
        onAddNew={handleAddNew}
        fileName={pendingFile?.name || ''}
      />
    </div>
  );
}
