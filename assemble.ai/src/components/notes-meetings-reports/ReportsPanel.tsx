/**
 * Reports Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container for listing and managing periodic reports.
 * Phase 9: Added loading skeletons, enhanced empty state, delete confirmation.
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportCard } from './ReportCard';
import { DeleteConfirmDialog } from './shared/DeleteConfirmDialog';
import { useReports, useReportMutations } from '@/lib/hooks/use-reports';
import { Plus, Loader2, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpdateReportRequest } from '@/types/notes-meetings-reports';

interface ReportsPanelProps {
    projectId: string;
    onSaveTransmittal?: (reportId: string) => void;
    onLoadTransmittal?: (reportId: string) => void;
    className?: string;
}

export function ReportsPanel({
    projectId,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: ReportsPanelProps) {
    const { reports, isLoading, error, refetch } = useReports({ projectId });
    const { createReport, updateReport, deleteReport, copyReport } = useReportMutations(projectId);

    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reportId: string; reportTitle: string }>({
        open: false,
        reportId: '',
        reportTitle: '',
    });

    // Handle create new report
    const handleCreateReport = useCallback(async () => {
        try {
            setIsCreating(true);
            const newReport = await createReport({ projectId });
            // Auto-expand the new report
            setExpandedReportId(newReport.id);
        } catch (err) {
            console.error('Failed to create report:', err);
        } finally {
            setIsCreating(false);
        }
    }, [createReport, projectId]);

    // Handle update report
    const handleUpdateReport = useCallback(async (reportId: string, data: UpdateReportRequest) => {
        try {
            await updateReport(reportId, data);
        } catch (err) {
            console.error('Failed to update report:', err);
        }
    }, [updateReport]);

    // Handle copy report
    const handleCopyReport = useCallback(async (reportId: string) => {
        try {
            const copiedReport = await copyReport(reportId);
            // Auto-expand the copied report
            setExpandedReportId(copiedReport.id);
        } catch (err) {
            console.error('Failed to copy report:', err);
        }
    }, [copyReport]);

    // Handle delete click - opens confirmation dialog
    const handleDeleteClick = useCallback((reportId: string, reportTitle: string) => {
        setDeleteDialog({ open: true, reportId, reportTitle });
    }, []);

    // Handle confirm delete
    const handleConfirmDelete = useCallback(async () => {
        try {
            const { reportId } = deleteDialog;
            // Close if expanded
            if (expandedReportId === reportId) {
                setExpandedReportId(null);
            }
            await deleteReport(reportId);
        } catch (err) {
            console.error('Failed to delete report:', err);
        }
    }, [deleteReport, expandedReportId, deleteDialog]);

    // Toggle report expansion
    const handleToggleExpand = useCallback((reportId: string) => {
        setExpandedReportId(current => current === reportId ? null : reportId);
    }, []);

    // Error state
    if (error) {
        return (
            <div className={cn('flex flex-col h-full', className)}>
                <PanelHeader reportsCount={0} isCreating={isCreating} onCreateReport={handleCreateReport} />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="rounded-full bg-red-500/10 p-4 mb-4">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                        Failed to load reports
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-4 text-center max-w-xs">
                        {error.message || 'There was an error loading your reports. Please try again.'}
                    </p>
                    <Button variant="outline" onClick={refetch}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <PanelHeader
                reportsCount={isLoading ? 0 : reports.length}
                isCreating={isCreating}
                onCreateReport={handleCreateReport}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <ReportsPanelSkeleton />
                ) : reports.length === 0 ? (
                    <EmptyState onCreateReport={handleCreateReport} isCreating={isCreating} />
                ) : (
                    <div className="space-y-3">
                        {reports.map((report) => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                projectId={projectId}
                                isExpanded={expandedReportId === report.id}
                                onToggleExpand={() => handleToggleExpand(report.id)}
                                onUpdate={(data) => handleUpdateReport(report.id, data)}
                                onCopy={() => handleCopyReport(report.id)}
                                onDelete={async () => handleDeleteClick(report.id, report.title)}
                                onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(report.id) : undefined}
                                onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(report.id) : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
                onConfirm={handleConfirmDelete}
                itemName={deleteDialog.reportTitle}
                itemType="report"
            />
        </div>
    );
}

// Panel Header Component
interface PanelHeaderProps {
    reportsCount: number;
    isCreating: boolean;
    onCreateReport: () => void;
}

function PanelHeader({ reportsCount, isCreating, onCreateReport }: PanelHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--color-text-muted)]" />
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Reports
                </h2>
                {reportsCount > 0 && (
                    <span className="text-sm text-[var(--color-text-muted)]">
                        ({reportsCount})
                    </span>
                )}
            </div>

            <Button
                variant="copper"
                size="sm"
                onClick={onCreateReport}
                disabled={isCreating}
                title="Create new report"
            >
                {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4 mr-1" />
                )}
                New Report
            </Button>
        </div>
    );
}

// Loading Skeleton Component
function ReportsPanelSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden"
                >
                    {/* Header skeleton */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                        <div className="flex items-center gap-2 flex-1">
                            <Skeleton className="h-5 w-5" />
                            <Skeleton className="h-5 w-44" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Empty State Component
interface EmptyStateProps {
    onCreateReport: () => void;
    isCreating: boolean;
}

function EmptyState({ onCreateReport, isCreating }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-[var(--color-bg-tertiary)] p-4 mb-4">
                <FileText className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                No reports yet
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-xs">
                Create your first periodic report to document project progress, financial summaries, and key updates.
            </p>
            <Button
                variant="copper"
                onClick={onCreateReport}
                disabled={isCreating}
            >
                {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4 mr-2" />
                )}
                Create Report
            </Button>
        </div>
    );
}

export default ReportsPanel;
