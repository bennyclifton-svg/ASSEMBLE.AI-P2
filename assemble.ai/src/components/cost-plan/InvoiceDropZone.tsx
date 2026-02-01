'use client';

/**
 * Invoice Drop Zone Component
 * Feature 006 - Cost Planning Module (Task T143)
 *
 * Drag-and-drop zone for uploading PDF invoices with AI extraction.
 */

import { useState, useRef, useCallback, type ReactNode, type DragEvent } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { toast } from '@/lib/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface CostLineMatchDetails {
  costLineId: string;
  activity: string;
  section: string;
  matchConfidence: number;
  matchType: 'stakeholder_single' | 'ai_description' | 'fuzzy_fallback';
  matchReason: string;
  alternatives?: Array<{
    costLineId: string;
    activity: string;
    confidence: number;
  }>;
}

interface ExtractionDetails {
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
  parserUsed: string;
  companyMatched: boolean;
  companyMatchDetails?: {
    matchedName: string;
    matchScore: number;
    matchType: 'exact' | 'partial' | 'fuzzy';
    type: 'consultant' | 'contractor';
    discipline?: string;
    trade?: string;
  } | null;
  costLineMatched?: boolean;
  costLineAutoAssigned?: boolean;
  costLineMatchDetails?: CostLineMatchDetails | null;
}

interface UploadResult {
  success: boolean;
  invoice?: {
    id: string;
    invoiceNumber: string;
    companyId?: string;
    amountCents: number;
    gstCents: number;
    invoiceDate: string;
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

interface InvoiceDropZoneProps {
  projectId: string;
  children: ReactNode;
  onUploadComplete?: (result: UploadResult) => void;
}

type UploadStatus = 'idle' | 'dragging' | 'uploading' | 'extracting' | 'success' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceDropZone({ projectId, children, onUploadComplete }: InvoiceDropZoneProps) {
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
        toast({ title: 'Only PDF files are supported for invoice extraction', variant: 'destructive' });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File size must be less than 10MB', variant: 'destructive' });
        return;
      }

      setStatus('uploading');
      setUploadProgress('Uploading invoice...');

      try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        setStatus('extracting');
        setUploadProgress('Extracting invoice data with AI...');

        // Upload and extract
        const response = await fetch(`/api/projects/${projectId}/invoices/upload`, {
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
        const invoice = result.invoice;
        const extraction = result.extraction;

        let toastMessage = `Invoice ${invoice?.invoiceNumber} created`;
        if (extraction?.costLineAutoAssigned && extraction.costLineMatchDetails) {
          toastMessage += ` → ${extraction.costLineMatchDetails.activity}`;
        } else if (extraction?.companyMatched && extraction.companyMatchDetails) {
          toastMessage += ` (matched to ${extraction.companyMatchDetails.matchedName})`;
        }

        let toastDescription = extraction?.confidence.overall
          ? `Extraction confidence: ${Math.round(extraction.confidence.overall * 100)}%`
          : undefined;
        if (extraction?.costLineAutoAssigned && extraction.costLineMatchDetails) {
          toastDescription = `Auto-assigned to cost line (${Math.round(extraction.costLineMatchDetails.matchConfidence * 100)}% match)`;
        }

        toast({
          title: toastMessage,
          description: toastDescription,
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
        const errorMessage = error instanceof Error ? error.message : 'Failed to process invoice';
        setUploadProgress(errorMessage);
        toast({ title: 'Invoice extraction failed', description: errorMessage, variant: 'destructive' });

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

      {/* Children (the actual InvoicesPanel content) */}
      {children}

      {/* Overlay for drag/upload states */}
      {status !== 'idle' && (
        <div
          className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
            status === 'dragging'
              ? 'bg-[var(--color-accent-green)]/20 border-2 border-dashed border-[var(--color-accent-green)]'
              : 'bg-black/70'
          }`}
          onClick={status === 'dragging' ? undefined : handleClick}
        >
          <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-xl max-w-md">
            {/* Dragging state */}
            {status === 'dragging' && (
              <>
                <div className="w-16 h-16 rounded-full bg-[var(--color-accent-green)]/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[var(--color-accent-green)]" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-[var(--color-text-primary)]">Drop Invoice PDF</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">AI will extract invoice details automatically</p>
                </div>
              </>
            )}

            {/* Uploading/Extracting state */}
            {(status === 'uploading' || status === 'extracting') && (
              <>
                <div className="w-16 h-16 rounded-full bg-[var(--color-accent-green)]/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--color-accent-green)] animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-[var(--color-text-primary)] flex items-center gap-2 justify-center">
                    <DiamondIcon className="w-5 h-5 text-[var(--color-accent-green)]" />
                    {status === 'uploading' ? 'Uploading...' : 'Extracting with AI...'}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">{uploadProgress}</p>
                </div>
              </>
            )}

            {/* Success state */}
            {status === 'success' && lastResult?.invoice && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-green-400">Invoice Created</p>
                  <div className="mt-3 p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-[var(--primitive-copper)]" />
                      <span className="font-mono text-[var(--primitive-copper)]">{lastResult.invoice.invoiceNumber}</span>
                    </div>
                    <div className="text-sm text-[var(--color-text-primary)]">
                      Amount: {formatCurrency(lastResult.invoice.amountCents)}
                    </div>
                    {lastResult.extraction?.companyMatchDetails && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
                        Matched: {lastResult.extraction.companyMatchDetails.matchedName}
                        {lastResult.extraction.companyMatchDetails.discipline && (
                          <span> ({lastResult.extraction.companyMatchDetails.discipline})</span>
                        )}
                        {lastResult.extraction.companyMatchDetails.trade && (
                          <span> ({lastResult.extraction.companyMatchDetails.trade})</span>
                        )}
                      </div>
                    )}
                    {/* Cost Line Match Info */}
                    {lastResult.extraction?.costLineMatchDetails && (
                      <div className="text-xs mt-2 pt-2 border-t border-[var(--color-border)]">
                        {lastResult.extraction.costLineAutoAssigned ? (
                          <div className="text-green-400">
                            <span className="font-medium">Auto-assigned: </span>
                            {lastResult.extraction.costLineMatchDetails.activity}
                            <span className="ml-1 text-[var(--color-text-muted)]">
                              ({Math.round(lastResult.extraction.costLineMatchDetails.matchConfidence * 100)}% confidence)
                            </span>
                          </div>
                        ) : lastResult.extraction.costLineMatched ? (
                          <div className="text-yellow-400">
                            <span className="font-medium">Suggested: </span>
                            {lastResult.extraction.costLineMatchDetails.activity}
                            <span className="ml-1 text-[var(--color-text-muted)]">
                              ({Math.round(lastResult.extraction.costLineMatchDetails.matchConfidence * 100)}% - review needed)
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {lastResult.extraction?.confidence.overall && !lastResult.extraction?.costLineMatchDetails && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
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
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">{uploadProgress}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">Click to try again</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceDropZone;
