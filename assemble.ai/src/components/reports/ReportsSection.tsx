/**
 * ReportsSection Component
 * Inline section for managing tender request reports within discipline/trade tabs
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ReportGenerator } from './ReportGenerator';
import { SectionViewer } from './SectionViewer';
import { useReportStream } from '@/lib/hooks/use-report-stream';
import {
    FileText,
    Plus,
    ChevronDown,
    ChevronRight,
    Trash2,
    Loader2,
    CheckCircle,
    Clock,
    AlertCircle,
    Eye,
} from 'lucide-react';

interface Report {
    id: string;
    title: string;
    status: 'draft' | 'toc_pending' | 'generating' | 'complete' | 'failed';
    createdAt: string;
    updatedAt: string;
}

import { GenerationMode } from '@/components/documents/DisciplineRepoTiles';

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
        toc_pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending' },
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
    generationMode = 'ai_assist',
}: ReportsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showGenerator, setShowGenerator] = useState(false);
    const [viewingReportId, setViewingReportId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    // Stream state for viewing reports
    const streamState = useReportStream(
        viewingReportId && data?.reports?.find(r => r.id === viewingReportId)?.status === 'generating'
            ? viewingReportId
            : null
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
        setShowGenerator(false);
        setViewingReportId(reportId);
        mutate();
    };

    const handleViewReport = (reportId: string) => {
        if (viewingReportId === reportId) {
            setViewingReportId(null);
        } else {
            setViewingReportId(reportId);
            setShowGenerator(false);
        }
    };

    const reports = data?.reports || [];

    return (
        <div className="bg-[#252526] rounded-lg border border-[#3e3e42]">
            {/* Section Header */}
            <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#2a2d2e]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#858585]" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-[#858585]" />
                    )}
                    <FileText className="w-4 h-4 text-[#858585]" />
                    <span className="font-semibold text-[#cccccc]">Create Report</span>
                    {reports.length > 0 && (
                        <span className="text-xs text-[#858585]">({reports.length})</span>
                    )}
                </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
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
                    ) : reports.length === 0 ? (
                        /* Skip empty state - show generator directly */
                        <div className="p-4">
                            <ReportGenerator
                                projectId={projectId}
                                discipline={contextName}
                                disciplineId={disciplineId}
                                tradeId={tradeId}
                                contextType={contextType}
                                generationMode={generationMode}
                                onComplete={handleGenerationComplete}
                                onCancel={() => setIsExpanded(false)}
                                inline
                            />
                        </div>
                    ) : (
                        <div className="divide-y divide-[#3e3e42]">
                            {reports.map(report => (
                                <div key={report.id}>
                                    <div className="flex items-center justify-between p-3 hover:bg-[#2a2d2e]">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <FileText className="w-4 h-4 text-[#858585] flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm text-[#cccccc] truncate">
                                                    {report.title}
                                                </p>
                                                <p className="text-xs text-[#858585]">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
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
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inline Report View */}
                                    {viewingReportId === report.id && (
                                        <div className="border-t border-[#3e3e42] bg-[#1e1e1e] p-4">
                                            <ReportGenerator
                                                projectId={projectId}
                                                initialReportId={report.id}
                                                discipline={contextName}
                                                disciplineId={disciplineId}
                                                tradeId={tradeId}
                                                contextType={contextType}
                                                generationMode={generationMode}
                                                onComplete={() => {
                                                    mutate();
                                                }}
                                                onCancel={() => setViewingReportId(null)}
                                                inline
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Generate New Button */}
                            {!showGenerator && (
                                <div className="p-3">
                                    <button
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[#0e639c] hover:text-[#1177bb] hover:bg-[#0e639c]/10 rounded"
                                        onClick={() => setShowGenerator(true)}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create New Report
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Inline Generator */}
                    {showGenerator && (
                        <div className="border-t border-[#3e3e42] bg-[#1e1e1e] p-4">
                            <ReportGenerator
                                projectId={projectId}
                                discipline={contextName}
                                disciplineId={disciplineId}
                                tradeId={tradeId}
                                contextType={contextType}
                                generationMode={generationMode}
                                onComplete={handleGenerationComplete}
                                onCancel={() => setShowGenerator(false)}
                                inline
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
