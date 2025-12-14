'use client';

/**
 * Import Dialog
 * Feature 006 - Cost Planning Module (Task T105)
 *
 * Dialog for importing cost plan data from Excel/CSV files.
 * Supports file upload, preview, and column mapping.
 */

import { useState, useCallback, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  FileText,
  Trash,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportedRow {
  rowNumber: number;
  data: Record<string, string | number | null>;
  errors?: string[];
  warnings?: string[];
}

export interface ImportPreview {
  fileName: string;
  fileSize: number;
  headers: string[];
  rows: ImportedRow[];
  totalRows: number;
  previewRows: number;
}

interface ImportDialogProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onFileSelect: (file: File) => Promise<ImportPreview | null>;
  onImport: (columnMapping: Record<string, string>) => Promise<void>;
  onOpenColumnMapping?: () => void;
  /** Existing templates for quick mapping */
  savedTemplates?: Array<{ id: string; name: string }>;
  onSelectTemplate?: (templateId: string) => void;
}

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'complete';

// ============================================================================
// SUPPORTED FILE TYPES
// ============================================================================

const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ACCEPTED_TYPES = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';

// ============================================================================
// FORMAT FILE SIZE
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ImportDialog({
  isOpen,
  projectId,
  onClose,
  onFileSelect,
  onImport,
  onOpenColumnMapping,
  savedTemplates = [],
  onSelectTemplate,
}: ImportDialogProps) {
  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate extension
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type. Please use ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIsProcessing(true);

    try {
      const previewData = await onFileSelect(file);
      if (previewData) {
        setPreview(previewData);
        setStep('preview');
      } else {
        setError('Failed to parse file. Please check the format.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [onFileSelect]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Reset state
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setStep('upload');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  // Proceed to column mapping
  const handleProceedToMapping = useCallback(() => {
    if (onOpenColumnMapping) {
      onOpenColumnMapping();
    }
    setStep('mapping');
  }, [onOpenColumnMapping]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Cost Plan Data
            </h2>
            <p className="text-sm text-[#858585]">
              Import from Excel or CSV file
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-[#858585] hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#1e1e1e] shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className={step === 'upload' ? 'text-white' : 'text-[#4ade80]'}>
              1. Select File
            </span>
            <ChevronRight className="w-4 h-4 text-[#6e6e6e]" />
            <span className={
              step === 'preview' ? 'text-white' :
              step === 'mapping' || step === 'importing' || step === 'complete' ? 'text-[#4ade80]' :
              'text-[#6e6e6e]'
            }>
              2. Preview
            </span>
            <ChevronRight className="w-4 h-4 text-[#6e6e6e]" />
            <span className={
              step === 'mapping' ? 'text-white' :
              step === 'importing' || step === 'complete' ? 'text-[#4ade80]' :
              'text-[#6e6e6e]'
            }>
              3. Map Columns
            </span>
            <ChevronRight className="w-4 h-4 text-[#6e6e6e]" />
            <span className={
              step === 'importing' || step === 'complete' ? 'text-white' :
              'text-[#6e6e6e]'
            }>
              4. Import
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0 p-4">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragging
                    ? 'border-[#007acc] bg-[#007acc]/10'
                    : 'border-[#3e3e42] hover:border-[#6e6e6e] hover:bg-[#2a2d2e]'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleInputChange}
                  className="hidden"
                />

                {isProcessing ? (
                  <div className="py-4">
                    <div className="animate-spin w-8 h-8 border-2 border-[#007acc] border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-[#858585]">Processing file...</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-12 h-12 text-[#4e4e4e] mx-auto mb-3" />
                    <p className="text-[#cccccc] mb-2">
                      Drag & drop your file here, or click to browse
                    </p>
                    <p className="text-sm text-[#6e6e6e]">
                      Supported formats: Excel (.xlsx, .xls) and CSV (.csv)
                    </p>
                  </>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#f87171]/10 border border-[#f87171]/30 rounded text-[#f87171]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Saved Templates */}
              {savedTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm text-[#858585] mb-2">Recent Import Templates</h3>
                  <div className="space-y-1">
                    {savedTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => onSelectTemplate?.(template.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[#cccccc] hover:bg-[#37373d] rounded transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#858585]" />
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-[#1e1e1e] rounded">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-[#4ade80]" />
                  <div>
                    <p className="text-[#cccccc] font-medium">{preview.fileName}</p>
                    <p className="text-sm text-[#858585]">
                      {formatFileSize(preview.fileSize)} &bull; {preview.totalRows} rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 text-[#858585] hover:text-[#f87171] hover:bg-[#f87171]/10 rounded transition-colors"
                  title="Remove file"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              {/* Column Headers */}
              <div>
                <h3 className="text-sm text-[#858585] mb-2">
                  Detected Columns ({preview.headers.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {preview.headers.map((header, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-[#37373d] text-[#cccccc] text-xs rounded"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h3 className="text-sm text-[#858585] mb-2">
                  Preview (first {preview.previewRows} rows)
                </h3>
                <div className="border border-[#3e3e42] rounded overflow-auto max-h-[200px]">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1e1e1e] sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left text-[#858585] font-medium border-b border-[#3e3e42]">
                          #
                        </th>
                        {preview.headers.map((header, i) => (
                          <th
                            key={i}
                            className="px-2 py-1 text-left text-[#858585] font-medium border-b border-[#3e3e42] whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-[#2a2d2e]">
                          <td className="px-2 py-1 text-[#6e6e6e] border-b border-[#3e3e42]">
                            {row.rowNumber}
                          </td>
                          {preview.headers.map((header, i) => (
                            <td
                              key={i}
                              className="px-2 py-1 text-[#cccccc] border-b border-[#3e3e42] whitespace-nowrap max-w-[150px] truncate"
                            >
                              {row.data[header]?.toString() || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation Messages */}
              {preview.rows.some((r) => r.errors?.length || r.warnings?.length) && (
                <div className="space-y-2">
                  {preview.rows.filter((r) => r.errors?.length).length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-[#f87171]/10 border border-[#f87171]/30 rounded text-[#f87171]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-sm">
                        {preview.rows.filter((r) => r.errors?.length).length} rows have errors
                      </span>
                    </div>
                  )}
                  {preview.rows.filter((r) => r.warnings?.length).length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded text-[#fbbf24]">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-sm">
                        {preview.rows.filter((r) => r.warnings?.length).length} rows have warnings
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mapping Step - Redirect to ColumnMappingDialog */}
          {step === 'mapping' && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-[#4ade80] mx-auto mb-3" />
              <p className="text-[#cccccc] mb-2">File loaded successfully</p>
              <p className="text-sm text-[#858585]">
                Configure column mappings in the next step
              </p>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-3 border-[#007acc] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[#cccccc]">Importing data...</p>
              <p className="text-sm text-[#858585] mt-2">
                This may take a moment for large files
              </p>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-[#4ade80] mx-auto mb-3" />
              <p className="text-[#cccccc] text-lg">Import Complete!</p>
              <p className="text-sm text-[#858585] mt-2">
                Your cost plan data has been imported successfully
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#3e3e42] flex items-center justify-between shrink-0">
          <div className="text-sm text-[#858585]">
            {selectedFile && step === 'preview' && (
              <span>Ready to map columns</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'upload' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[#cccccc] hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            {step === 'preview' && (
              <>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-[#cccccc] hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleProceedToMapping}
                  className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors flex items-center gap-2"
                >
                  Continue to Mapping
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {step === 'complete' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportDialog;
