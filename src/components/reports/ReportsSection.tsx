/**
 * ReportsSection Component
 * Inline section for managing tender request reports within discipline/trade tabs
 */

'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { ReportGenerator, type ReportGeneratorHandle } from './ReportGenerator';
import {
    FileText,
    Plus,
    ChevronDown,
    Trash,
    Loader2,
    CheckCircle,
    Clock,
    AlertCircle,
    Eye,
    RefreshCw,
    Sparkles,
    Download,
    Database,
} from 'lucide-react';
import { toast } from 'sonner';

interface Report {
    id: string;
    title: string;
    status: 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';
    createdAt: string;
    updatedAt: string;
}

import { type GenerationMode } from '@/lib/db/rag-schema';

interface ReportsSectionProps {
    projectId: string;
    disciplineId?: string;
    disciplineName?: string;
    tradeId?: string;
    tradeName?: string;
    generationMode?: GenerationMode;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function StatusBadge({ status }: { status: Report['status'] }) {
    const config = {
        draft: { icon: FileText, color: 'text-[#858585]', bg: 'bg-[#3e3e42]', label: 'Draft' },
        toc_pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'In Progress' },
        generating: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Generating', spin: true },
        complete: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Complete' },
        failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
    };

    const { icon: Icon, color, bg, label, spin } = config[status] || config.draft;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color} ${bg}`}>
            <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
            {label}
        </span>
    );
}

export function ReportsSection({
    projectId,
    disciplineId,
    disciplineName,
    tradeId,
    tradeName,
    generationMode = 'ai_assisted',
}: ReportsSectionProps) {
    const [viewingReportId, setViewingReportId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');
    const [refreshingReportId, setRefreshingReportId] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
    const [creatingReportType, setCreatingReportType] = useState<'rft' | 'trr' | null>(null);
    const [newReportTitle, setNewReportTitle] = useState('');
    const [startingGeneration, setStartingGeneration] = useState(false);
    const [selectedGenerationMode, setSelectedGenerationMode] = useState<GenerationMode>(generationMode);

    // Ref to the currently viewing ReportGenerator
    const generatorRef = useRef<ReportGeneratorHandle>(null);

    // Determine context type and name
    const contextType = disciplineId ? 'discipline' : 'trade';
    const contextName = disciplineName || tradeName || 'Unknown';

    // Fetch reports for this discipline/trade
    const queryParams = new URLSearchParams({
        projectId,
        ...(disciplineId && { disciplineId }),
        ...(tradeId && { tradeId }),
    });

    const { data, error, isLoading, mutate } = useSWR<{ reports: Report[] }>(
        `/api/reports?${queryParams.toString()}`,
        fetcher
    );

    const handleDelete = async (reportId: string) => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        setDeletingId(reportId);
        try {
            const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete');
            }
            mutate();
            if (viewingReportId === reportId) {
                setViewingReportId(null);
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete report');
        } finally {
            setDeletingId(null);
        }
    };

    const handleGenerationComplete = (reportId: string) => {
        setViewingReportId(reportId);
        mutate();
    };

    const handleTitleEdit = (reportId: string, currentTitle: string) => {
        setEditingTitleId(reportId);
        setEditingTitleValue(currentTitle);
    };

    const handleTitleSave = async (reportId: string) => {
        if (!editingTitleValue.trim()) {
            setEditingTitleId(null);
            return;
        }
        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editingTitleValue.trim() }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update title');
            }
            mutate();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update title');
        } finally {
            setEditingTitleId(null);
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent, reportId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTitleSave(reportId);
        } else if (e.key === 'Escape') {
            setEditingTitleId(null);
        }
    };

    const handleReportRefresh = async (reportId: string) => {
        setRefreshingReportId(reportId);
        try {
            const res = await fetch(`/api/reports/${reportId}/refresh`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to refresh');
            mutate();
            toast.success('Report refreshed with latest data');
        } catch (err) {
            toast.error('Failed to refresh report');
        } finally {
            setRefreshingReportId(null);
        }
    };

    const handleExport = async (reportId: string, format: 'docx' | 'pdf') => {
        setShowExportMenu(null);
        try {
            const res = await fetch(`/api/reports/${reportId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format }),
            });
            if (!res.ok) {
                const err = await res.json();
                console.error('Export error details:', err);
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

    const handleGenerateLong = (reportId: string) => {
        // TODO: Implement generate long RFT modal
        toast.info('Generate Long RFT coming soon');
    };

    const handleStartCreating = (type: 'rft' | 'trr') => {
        const defaultTitle = type === 'rft'
            ? 'Request For Tender Access'
            : 'Tender Recommendation Report Access';
        setCreatingReportType(type);
        setNewReportTitle(defaultTitle);
    };

    const handleCreateReport = async () => {
        if (!newReportTitle.trim() || !creatingReportType) {
            toast.error('Please enter a report title');
            return;
        }

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title: newReportTitle.trim(),
                    reportType: creatingReportType === 'rft' ? 'tender_request' : 'tender_recommendation',
                    disciplineId,
                    tradeId,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create report');
            }
            const newReport = await res.json();
            // Clear creation state first
            setCreatingReportType(null);
            setNewReportTitle('');
            // Refresh the list
            await mutate();
            // Show TOC editor for the new report
            setViewingReportId(newReport.id);
            toast.success('Report created successfully');
        } catch (err) {
            console.error('Failed to create report:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to create report');
        }
    };

    const handleCreateKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreateReport();
        } else if (e.key === 'Escape') {
            setCreatingReportType(null);
            setNewReportTitle('');
        }
    };

    const handleViewReport = (reportId: string) => {
        if (viewingReportId === reportId) {
            setViewingReportId(null);
        } else {
            setViewingReportId(reportId);
        }
    };

    const handleStartWithMode = async (mode: GenerationMode) => {
        setSelectedGenerationMode(mode);
        if (generatorRef.current) {
            setStartingGeneration(true);
            try {
                // Pass mode explicitly to avoid async state race condition
                await generatorRef.current.startTocGeneration(mode);
                mutate();
            } catch (err) {
                console.error('Failed to start generation:', err);
                toast.error('Failed to start generation');
            } finally {
                setStartingGeneration(false);
            }
        }
    };

    const reports = data?.reports || [];

    return (
        <div className="bg-[#252526] rounded-lg border border-[#3e3e42]">
            {/* Section Header */}
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#cccccc]">Create Report</span>
                    {reports.length > 0 && (
                        <span className="text-xs text-[#858585]">({reports.length})</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#4fc3f7] hover:text-[#81d4fa] hover:bg-[#4fc3f7]/10 rounded font-medium"
                        onClick={() => handleStartCreating('rft')}
                    >
                        <Plus className="w-3 h-3" />
                        RFT
                    </button>
                    <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#4fc3f7] hover:text-[#81d4fa] hover:bg-[#4fc3f7]/10 rounded font-medium"
                        onClick={() => handleStartCreating('trr')}
                    >
                        <Plus className="w-3 h-3" />
                        TRR
                    </button>
                </div>
            </div>

            {/* Section Content */}
            <div className="border-t border-[#3e3e42]">
                {/* Reports List */}
                {isLoading ? (
                        <div className="p-4 text-center text-[#858585]">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            Loading reports...
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-500">
                            Failed to load reports
                        </div>
                    ) : reports.length === 0 && !creatingReportType ? (
                        <div className="p-4 text-center text-[#858585] text-sm">
                            No reports yet. Click + RFT or + TRR to create one.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#3e3e42]">
                            {reports.map(report => (
                                <div key={report.id}>
                                    <div className="flex items-center justify-between p-3 hover:bg-[#2a2d2e]">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <FileText className="w-4 h-4 text-[#858585] flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                {editingTitleId === report.id ? (
                                                    <input
                                                        type="text"
                                                        className="w-full text-sm text-[#cccccc] bg-transparent border-none outline-none p-0 m-0 focus:ring-0"
                                                        style={{ caretColor: '#0e639c' }}
                                                        value={editingTitleValue}
                                                        onChange={e => setEditingTitleValue(e.target.value)}
                                                        onKeyDown={e => handleTitleKeyDown(e, report.id)}
                                                        onBlur={() => handleTitleSave(report.id)}
                                                        ref={(input) => {
                                                            if (input) {
                                                                input.focus();
                                                                // Select all text so user can start typing or click to position
                                                                input.select();
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <p
                                                        className="text-sm text-[#cccccc] truncate cursor-text hover:text-white"
                                                        onClick={() => handleTitleEdit(report.id, report.title)}
                                                        title="Click to edit"
                                                    >
                                                        {report.title}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Action buttons - shown for complete reports when viewing */}
                                            {report.status === 'complete' && viewingReportId === report.id && (
                                                <>
                                                    <button
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#cccccc] bg-[#3e3e42] rounded hover:bg-[#4e4e52] disabled:opacity-50"
                                                        onClick={() => handleReportRefresh(report.id)}
                                                        disabled={refreshingReportId === report.id}
                                                        title="Refresh"
                                                    >
                                                        <RefreshCw className={`w-3 h-3 ${refreshingReportId === report.id ? 'animate-spin' : ''}`} />
                                                        Refresh
                                                    </button>

                                                    <button
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-gradient-to-r from-purple-600 to-orange-600 rounded hover:from-purple-700 hover:to-orange-700"
                                                        onClick={() => handleGenerateLong(report.id)}
                                                        title="Long RFT"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                        Long RFT
                                                    </button>

                                                    <div className="relative">
                                                        <button
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[#cccccc] bg-[#3e3e42] rounded hover:bg-[#4e4e52]"
                                                            onClick={() => setShowExportMenu(showExportMenu === report.id ? null : report.id)}
                                                            title="Export"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            Export
                                                            <ChevronDown className="w-3 h-3" />
                                                        </button>
                                                        {showExportMenu === report.id && (
                                                            <div className="absolute right-0 top-full mt-1 bg-[#252526] border border-[#3e3e42] rounded shadow-lg z-10">
                                                                <button
                                                                    className="block w-full px-3 py-1.5 text-xs text-left text-[#cccccc] hover:bg-[#3e3e42]"
                                                                    onClick={() => handleExport(report.id, 'docx')}
                                                                >
                                                                    Export as DOCX
                                                                </button>
                                                                <button
                                                                    className="block w-full px-3 py-1.5 text-xs text-left text-[#cccccc] hover:bg-[#3e3e42]"
                                                                    onClick={() => handleExport(report.id, 'pdf')}
                                                                >
                                                                    Export as PDF
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {/* Short RFT / Long RFT buttons for toc_pending reports when viewing */}
                                            {report.status === 'toc_pending' && viewingReportId === report.id && (
                                                <>
                                                    <button
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white rounded hover:brightness-110 disabled:opacity-50"
                                                        style={{ backgroundColor: '#7b4bb3' }}
                                                        onClick={() => handleStartWithMode('data_only')}
                                                        disabled={startingGeneration}
                                                        title="Generate Short RFT (Data Only)"
                                                    >
                                                        <Database className="w-3 h-3" />
                                                        {startingGeneration && selectedGenerationMode === 'data_only' ? 'Starting...' : 'Short RFT'}
                                                    </button>
                                                    <button
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white rounded hover:brightness-110 disabled:opacity-50"
                                                        style={{ backgroundColor: '#c9860d' }}
                                                        onClick={() => handleStartWithMode('ai_assisted')}
                                                        disabled={startingGeneration}
                                                        title="Generate Long RFT (AI Assisted)"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                        {startingGeneration && selectedGenerationMode === 'ai_assisted' ? 'Starting...' : 'Long RFT'}
                                                    </button>
                                                </>
                                            )}

                                            {/* Right side: Status, Eye, Bin */}
                                            <StatusBadge status={report.status} />

                                            <button
                                                className={`p-1.5 rounded hover:bg-[#3e3e42] ${viewingReportId === report.id ? 'bg-[#0e639c] text-white' : 'text-[#858585]'}`}
                                                onClick={() => handleViewReport(report.id)}
                                                title={viewingReportId === report.id ? 'Hide' : 'View'}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            <button
                                                className="p-1.5 text-[#858585] rounded hover:bg-[#3e3e42] hover:text-red-500 disabled:opacity-50"
                                                onClick={() => handleDelete(report.id)}
                                                disabled={deletingId === report.id}
                                                title="Delete"
                                            >
                                                {deletingId === report.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Inline Report Creation */}
                            {creatingReportType && (
                                <div className="flex items-center justify-between p-3 bg-[#1e1e1e]">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 text-[#858585] flex-shrink-0" />
                                        <input
                                            type="text"
                                            className="flex-1 text-sm text-[#cccccc] bg-[#3c3c3c] border border-[#0e639c] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0e639c]"
                                            value={newReportTitle}
                                            onChange={e => setNewReportTitle(e.target.value)}
                                            onKeyDown={handleCreateKeyDown}
                                            autoFocus
                                            placeholder="Enter report title..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <StatusBadge status="toc_pending" />
                                        <button
                                            className="p-1.5 text-[#858585] rounded hover:bg-[#3e3e42]"
                                            onClick={() => handleCreateReport()}
                                            title="View"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="p-1.5 text-[#858585] rounded hover:bg-[#3e3e42] hover:text-red-500"
                                            onClick={() => {
                                                setCreatingReportType(null);
                                                setNewReportTitle('');
                                            }}
                                            title="Cancel"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Inline Report View - positioned at bottom of all reports */}
                            {viewingReportId && (
                                <div className="border-t border-[#3e3e42] bg-[#1e1e1e] p-4">
                                    <ReportGenerator
                                        key={viewingReportId}
                                        ref={generatorRef}
                                        projectId={projectId}
                                        initialReportId={viewingReportId}
                                        discipline={contextName}
                                        disciplineId={disciplineId}
                                        tradeId={tradeId}
                                        contextType={contextType}
                                        generationMode={selectedGenerationMode}
                                        onComplete={() => {
                                            mutate();
                                        }}
                                        onCancel={() => setViewingReportId(null)}
                                        inline
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
        </div>
    );
}
