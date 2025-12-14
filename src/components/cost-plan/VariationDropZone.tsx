'use client';

/**
 * Variation Drop Zone Component
 * Feature 006 - Cost Planning Module
 *
 * Drag-and-drop zone for uploading PDF variations with AI extraction.
 */

import { useState, useRef, useCallback, type ReactNode, type DragEvent } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from '@/lib/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface ExtractionDetails {
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
  parserUsed: string;
  costLineMatched: boolean;
  costLineMatchDetails?: {
    costLineId: string;
    costCode: string | null;
    activity: string;
    matchScore: number;
    matchType: 'exact' | 'partial' | 'fuzzy';
    disciplineName?: string;
    tradeName?: string;
  } | null;
}

interface UploadResult {
  success: boolean;
  variation?: {
    id: string;
    variationNumber: string;
    description: string;
    category: string;
    amountForecastCents: number;
    status: string;
  };
  extraction?: ExtractionDetails;
  document?: {
    documentId: string;
    versionId: string;
    fileAssetId: string;
    category: string;
    subcategory: string | null;
  };
  error?: string;
  details?: string;
}

interface VariationDropZoneProps {
  projectId: string;
  children: ReactNode;
  onUploadComplete?: (result: UploadResult) => void;
}

type UploadStatus = 'idle' | 'dragging' | 'uploading' | 'extracting' | 'success' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export function VariationDropZone({ projectId, children, onUploadComplete }: VariationDropZoneProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast({ title: 'Only PDF files are supported for variation extraction', variant: 'destructive' });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File size must be less than 10MB', variant: 'destructive' });
        return;
      }

      setStatus('uploading');
      setUploadProgress('Uploading variation document...');

      try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        setStatus('extracting');
        setUploadProgress('Extracting variation data with AI...');

        // Upload and extract
        const response = await fetch(`/api/projects/${projectId}/variations/upload`, {
          method: 'POST',
          body: formData,
        });

        const result: UploadResult = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || result.details || 'Upload failed');
        }

        setStatus('success');
        setLastResult(result);

        // Show success toast with extraction details
        const variation = result.variation;
        const extraction = result.extraction;

        let toastMessage = `Variation ${variation?.variationNumber} created`;
        if (extraction?.costLineMatched && extraction.costLineMatchDetails) {
          toastMessage += ` (matched to ${extraction.costLineMatchDetails.activity})`;
        }
        toast({
          title: toastMessage,
          description: extraction?.confidence.overall
            ? `Extraction confidence: ${Math.round(extraction.confidence.overall * 100)}%`
            : undefined,
        });

        // Notify parent
        onUploadComplete?.(result);

        // Reset after delay
        setTimeout(() => {
          setStatus('idle');
          setLastResult(null);
        }, 3000);
      } catch (error) {
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'Failed to process variation';
        setUploadProgress(errorMessage);
        toast({ title: 'Variation extraction failed', description: errorMessage, variant: 'destructive' });

        // Reset after delay
        setTimeout(() => {
          setStatus('idle');
          setUploadProgress('');
        }, 3000);
      }
    },
    [projectId, onUploadComplete]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setStatus('dragging');
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setStatus((prev) => (prev === 'dragging' ? 'idle' : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;

      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        toast({ title: 'Please drop a PDF file', variant: 'destructive' });
        setStatus('idle');
        return;
      }

      if (pdfFiles.length > 1) {
        toast({ title: 'Only one file at a time', description: 'Processing first PDF only' });
      }

      handleFileUpload(pdfFiles[0]);
    },
    [handleFileUpload]
  );

  // Click to upload
  const handleClick = useCallback(() => {
    if (status === 'idle' || status === 'error') {
      fileInputRef.current?.click();
    }
  }, [status]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileUpload]
  );

  // Format currency for display
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Children (the actual VariationsPanel content) */}
      {children}

      {/* Overlay for drag/upload states */}
      {status !== 'idle' && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
            status === 'dragging'
              ? 'bg-[#D4A574]/20 border-2 border-dashed border-[#D4A574]'
              : 'bg-black/70'
          }`}
          onClick={status === 'dragging' ? undefined : handleClick}
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-[#252526] border border-[#3e3e42] shadow-xl max-w-md">
            {/* Dragging state */}
            {status === 'dragging' && (
              <>
                <div className="w-16 h-16 rounded-full bg-[#D4A574]/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[#D4A574]" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-[#cccccc]">Drop Variation PDF</p>
                  <p className="text-sm text-[#858585] mt-1">AI will extract variation details automatically</p>
                </div>
              </>
            )}

            {/* Uploading/Extracting state */}
            {(status === 'uploading' || status === 'extracting') && (
              <>
                <div className="w-16 h-16 rounded-full bg-[#D4A574]/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#D4A574] animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-[#cccccc] flex items-center gap-2 justify-center">
                    <Sparkles className="w-5 h-5 text-[#D4A574]" />
                    {status === 'uploading' ? 'Uploading...' : 'Extracting with AI...'}
                  </p>
                  <p className="text-sm text-[#858585] mt-1">{uploadProgress}</p>
                </div>
              </>
            )}

            {/* Success state */}
            {status === 'success' && lastResult?.variation && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-green-400">Variation Created</p>
                  <div className="mt-3 p-3 bg-[#1e1e1e] rounded border border-[#3e3e42] text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-[#D4A574]" />
                      <span className="font-mono text-[#D4A574]">{lastResult.variation.variationNumber}</span>
                    </div>
                    <div className="text-sm text-[#cccccc] truncate max-w-[280px]" title={lastResult.variation.description}>
                      {lastResult.variation.description}
                    </div>
                    <div className="text-sm text-[#cccccc] mt-1">
                      Forecast: {formatCurrency(lastResult.variation.amountForecastCents)}
                    </div>
                    {lastResult.extraction?.costLineMatchDetails && (
                      <div className="text-xs text-[#858585] mt-1">
                        Matched: {lastResult.extraction.costLineMatchDetails.activity}
                      </div>
                    )}
                    {lastResult.extraction?.confidence.overall && (
                      <div className="text-xs text-[#6e6e6e] mt-1">
                        Confidence: {Math.round(lastResult.extraction.confidence.overall * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Error state */}
            {status === 'error' && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-red-400">Extraction Failed</p>
                  <p className="text-sm text-[#858585] mt-1">{uploadProgress}</p>
                  <p className="text-xs text-[#6e6e6e] mt-2">Click to try again</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VariationDropZone;
