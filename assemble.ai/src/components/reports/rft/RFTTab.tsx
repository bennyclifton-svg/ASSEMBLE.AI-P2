/**
 * RFTTab Component
 *
 * Handles RFT generation and editing:
 * - Short RFT and Long RFT buttons (top right)
 * - Content length selector for Long RFT
 * - Progress indicator during generation
 * - Report editor after generation
 * - Export functionality (PDF/Word)
 */

'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Database,
  Sparkles,
  Download,
  ChevronDown,
  RefreshCw,
  Loader2,
  FileText,
} from 'lucide-react';
import UnifiedReportEditor from '../UnifiedReportEditor';
import { SectionViewer } from '../SectionViewer';
import { useReportGeneration, type Report, type ReportSection, type ReportSummary as HookReportSummary } from '@/lib/hooks/use-report-generation';
import { useReportStream } from '@/lib/hooks/use-report-stream';
import { sectionsToHTML } from '@/lib/utils/report-formatting';
import type { GenerationMode, ContentLength } from '@/lib/db/rag-schema';
import type { LinkedTocSection } from '@/lib/constants/default-toc-sections';

// Local interface for list API response (summary only, no sections)
interface ReportListItem {
  id: string;
  title: string;
  status: 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';
  tableOfContents?: { sections: LinkedTocSection[]; version: number };
  completedSections?: number;
  totalSections?: number;
  createdAt: string;
  updatedAt: string;
}

interface RFTTabProps {
  projectId: string;
  disciplineId?: string;
  tradeId?: string;
  contextName: string;
  contextType: 'discipline' | 'trade';
  /** Current TOC sections from TocTab */
  tocSections: LinkedTocSection[];
  /** Called when report is created */
  onReportCreated?: (report: Report) => void;
  /** Called when report is updated */
  onReportUpdated?: (report: Report) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function RFTTab({
  projectId,
  disciplineId,
  tradeId,
  contextName,
  contextType,
  tocSections,
  onReportCreated,
  onReportUpdated,
}: RFTTabProps) {
  // State
  const [selectedContentLength, setSelectedContentLength] = useState<ContentLength>('concise');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch existing RFT for this discipline/trade (only 1 allowed)
  const queryParams = new URLSearchParams({
    projectId,
    ...(disciplineId && { disciplineId }),
    ...(tradeId && { tradeId }),
    reportType: 'tender_request',
  });

  // First query: get report list (summary only, no sections)
  const { data: listData, error: listError, isLoading: listLoading, mutate: mutateList } = useSWR<{ reports: ReportListItem[] }>(
    `/api/reports?${queryParams.toString()}`,
    fetcher
  );

  const reportSummary = listData?.reports?.[0];
  const reportId = reportSummary?.id || null;

  // Second query: get full report with sections (only when report exists)
  const { data: fullReport, error: fullError, isLoading: fullLoading, mutate: mutateFullReport } = useSWR<Report>(
    reportId ? `/api/reports/${reportId}` : null,
    fetcher,
    { refreshInterval: reportSummary?.status === 'generating' ? 2000 : 0 } // Poll during generation
  );

  // Combined mutate function
  const mutate = useCallback(() => {
    mutateList();
    if (reportId) mutateFullReport();
  }, [mutateList, mutateFullReport, reportId]);

  // Use full report when available, fall back to summary for status checks
  const report = fullReport || reportSummary;
  const isLoading = listLoading || (reportId && fullLoading && !fullReport);
  const error = listError || fullError;

  // Hooks for generation
  const { startGeneration, approveToc } = useReportGeneration(projectId);
  const stream = useReportStream(report?.status === 'generating' ? reportId : null);

  // Handle Short RFT generation (data_only mode)
  const handleShortRFT = async () => {
    setIsGenerating(true);
    try {
      // Get effective discipline/trade IDs for the approveToc call
      const effectiveDisciplineId = contextType === 'discipline' ? disciplineId : undefined;
      const effectiveTradeId = contextType === 'trade' ? tradeId : undefined;

      if (report) {
        // Update existing report TOC and regenerate
        // Pass disciplineId/tradeId in case report is missing them (legacy data)
        await approveToc(
          report.id,
          { sections: tocSections, version: (report.tableOfContents?.version || 0) + 1, source: 'fixed' },
          'data_only',
          undefined, // contentLength not used for Short RFT
          effectiveDisciplineId,
          effectiveTradeId
        );
      } else {
        // Create new report
        const newReport = await startGeneration({
          projectId,
          title: `Request For Tender ${contextName}`,
          reportType: 'tender_request',
          discipline: contextName,
          disciplineId: effectiveDisciplineId,
          tradeId: effectiveTradeId,
          documentSetIds: [],
          generationMode: 'data_only',
        });
        onReportCreated?.(newReport);
        // Immediately approve TOC with data_only mode
        await approveToc(
          newReport.id,
          { sections: tocSections, version: 1, source: 'fixed' },
          'data_only',
          undefined,
          effectiveDisciplineId,
          effectiveTradeId
        );
      }
      mutate();
      toast.success('Short RFT generation started');
    } catch (err) {
      console.error('Short RFT failed:', err);
      toast.error('Failed to generate Short RFT');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Long RFT generation (ai_assisted mode)
  const handleLongRFT = async () => {
    setIsGenerating(true);
    try {
      // Get effective discipline/trade IDs for the approveToc call
      const effectiveDisciplineId = contextType === 'discipline' ? disciplineId : undefined;
      const effectiveTradeId = contextType === 'trade' ? tradeId : undefined;

      if (report) {
        // Update existing report TOC and regenerate with AI
        // Pass disciplineId/tradeId in case report is missing them (legacy data)
        await approveToc(
          report.id,
          { sections: tocSections, version: (report.tableOfContents?.version || 0) + 1, source: 'fixed' },
          'ai_assisted',
          selectedContentLength,
          effectiveDisciplineId,
          effectiveTradeId
        );
      } else {
        // Create new report
        const newReport = await startGeneration({
          projectId,
          title: `Request For Tender ${contextName}`,
          reportType: 'tender_request',
          discipline: contextName,
          disciplineId: effectiveDisciplineId,
          tradeId: effectiveTradeId,
          documentSetIds: [],
          generationMode: 'ai_assisted',
        });
        onReportCreated?.(newReport);
        // Immediately approve TOC with ai_assisted mode
        await approveToc(
          newReport.id,
          { sections: tocSections, version: 1, source: 'fixed' },
          'ai_assisted',
          selectedContentLength,
          effectiveDisciplineId,
          effectiveTradeId
        );
      }
      mutate();
      toast.success('Long RFT generation started');
    } catch (err) {
      console.error('Long RFT failed:', err);
      toast.error('Failed to generate Long RFT');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle report refresh - clears and regenerates Short RFT
  const handleRefresh = async () => {
    if (!reportId) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to refresh');
      // Refresh data first
      await mutate();
      // Now trigger Short RFT regeneration
      await handleShortRFT();
      toast.success('Report refreshed with latest data');
    } catch (err) {
      toast.error('Failed to refresh report');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle export
  const handleExport = async (format: 'docx' | 'pdf') => {
    if (!reportId) return;
    setShowExportMenu(false);
    try {
      const res = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch ? filenameMatch[1] : `report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to export report');
    }
  };

  // Handle save (from editor)
  const handleSave = async (content: string) => {
    if (!reportId) return;
    await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editedContent: content,
        isEdited: true,
      }),
    });
    mutate();
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-[#858585]" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load report
      </div>
    );
  }

  // Calculate progress for generating state (use fullReport for sections, fallback to TOC count)
  const completedSections = fullReport?.sections?.filter((s: ReportSection) => s.status === 'complete').length ?? 0;
  const totalSections = report?.tableOfContents?.sections?.length ?? 0;
  const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header with buttons */}
      <div className="flex items-center justify-end gap-2">
        {/* Show Refresh and Export only when report is complete */}
        {report?.status === 'complete' && (
          <>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#cccccc] bg-[#3e3e42] rounded hover:bg-[#4e4e52] disabled:opacity-50"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="relative">
              <button
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#cccccc] bg-[#3e3e42] rounded hover:bg-[#4e4e52]"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download className="w-3 h-3" />
                Export
                <ChevronDown className="w-3 h-3" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg z-10">
                  <button
                    className="block w-full px-3 py-1.5 text-xs text-left text-[#cccccc] hover:bg-[#3e3e42]"
                    onClick={() => handleExport('docx')}
                  >
                    Export as DOCX
                  </button>
                  <button
                    className="block w-full px-3 py-1.5 text-xs text-left text-[#cccccc] hover:bg-[#3e3e42]"
                    onClick={() => handleExport('pdf')}
                  >
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Short RFT Button */}
        <button
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-white rounded hover:brightness-110 disabled:opacity-50"
          style={{ backgroundColor: '#7b4bb3' }}
          onClick={handleShortRFT}
          disabled={isGenerating || report?.status === 'generating'}
        >
          <Database className="w-3 h-3" />
          {isGenerating ? 'Starting...' : 'Short RFT'}
        </button>

        {/* Content Length Selector (for Long RFT) */}
        <div className="flex items-center gap-1 px-1 py-0.5 bg-[#2a2d2e] rounded border border-[#3e3e42]">
          <button
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              selectedContentLength === 'concise'
                ? 'bg-[#c9860d] text-white'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
            onClick={() => setSelectedContentLength('concise')}
            title="Concise (~500-800 words/section)"
          >
            Concise
          </button>
          <button
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              selectedContentLength === 'lengthy'
                ? 'bg-[#c9860d] text-white'
                : 'text-[#858585] hover:text-[#cccccc]'
            }`}
            onClick={() => setSelectedContentLength('lengthy')}
            title="Lengthy (~1500-2500 words/section)"
          >
            Lengthy
          </button>
        </div>

        {/* Long RFT Button */}
        <button
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-white rounded hover:brightness-110 disabled:opacity-50"
          style={{ backgroundColor: '#c9860d' }}
          onClick={handleLongRFT}
          disabled={isGenerating || report?.status === 'generating'}
        >
          <Sparkles className="w-3 h-3" />
          {isGenerating ? 'Starting...' : 'Long RFT'}
        </button>
      </div>

      {/* Content Area */}
      {!report ? (
        // Empty state
        <div className="flex flex-col items-center justify-center h-48 text-center text-[#858585]">
          <FileText className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">Click Short RFT or Long RFT to generate your tender document</p>
          <p className="text-xs mt-1 opacity-70">
            Short RFT uses your data directly. Long RFT uses AI to enhance content.
          </p>
        </div>
      ) : report.status === 'generating' ? (
        // Generating state
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#cccccc]">Generating Report</span>
            <span className="text-xs text-[#858585]">
              {completedSections}/{totalSections} sections ({progress}%)
            </span>
          </div>

          <div className="w-full bg-[#3e3e42] rounded-full h-2">
            <div
              className="bg-[#0e639c] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {fullReport && <SectionViewer report={fullReport} streamState={stream} />}
        </div>
      ) : report.status === 'complete' ? (
        // Complete state - show editor
        <div className="min-h-[400px]">
          {fullReport?.sections ? (
            <UnifiedReportEditor
              reportId={report.id}
              reportTitle={report.title}
              initialContent={fullReport.editedContent || sectionsToHTML(fullReport.sections, fullReport.tableOfContents)}
              isEdited={fullReport.isEdited || false}
              onSave={handleSave}
              onRefresh={handleRefresh}
            />
          ) : (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-[#858585]" />
            </div>
          )}
        </div>
      ) : report.status === 'failed' ? (
        // Failed state
        <div className="p-4 text-center text-red-500">
          <p>Report generation failed.</p>
          <p className="text-xs mt-1">Click Short RFT or Long RFT to try again.</p>
        </div>
      ) : (
        // Draft or toc_pending - show waiting message
        <div className="flex flex-col items-center justify-center h-48 text-center text-[#858585]">
          <Loader2 className="w-8 h-8 mb-3 animate-spin" />
          <p className="text-sm">Preparing report...</p>
        </div>
      )}
    </div>
  );
}
