'use client';

/**
 * Export Button - Phase 11 (T144)
 *
 * Dropdown with "Export as PDF" and "Export as DOCX" options
 * - Loading state during generation
 * - Download trigger with proper filename
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';

interface ExportButtonProps {
  reportId: string;
  content: string;
}

export default function ExportButton({ reportId, content }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Export to specified format
   */
  const handleExport = async (format: 'pdf' | 'docx') => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      const response = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `report.${format}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </Button>

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-[#2d2d2d] border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('pdf')}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-[#3a3a3a] flex items-center gap-3"
            >
              <PdfIcon size={20} />
              Export as PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-[#3a3a3a] flex items-center gap-3"
            >
              <DocxIcon size={20} />
              Export as DOCX
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
