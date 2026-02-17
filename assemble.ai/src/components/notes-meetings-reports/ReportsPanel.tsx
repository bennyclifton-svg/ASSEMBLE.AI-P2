/**
 * Reports Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container for the Reports sub-module with segmented ribbon header and numbered tabs.
 * Matches RFT/TRR/Addendum styling with Aurora theme.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, AlertCircle, Copy, Loader2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { NumberedTabs } from '@/components/shared/NumberedTabs';
import { ExportButtonGroup } from '@/components/shared/ExportButtonGroup';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { ReportContent } from './ReportContent';
import { useReports, useReportMutations, useReportExport } from '@/lib/hooks/use-reports';
import { useReportsSectionUI } from '@/lib/contexts/procurement-ui-context';
import { cn } from '@/lib/utils';
import type { Report, UpdateReportRequest } from '@/types/notes-meetings-reports';

interface ReportWithCount extends Report {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
    reportNumber?: number;
}

interface ReportsPanelProps {
    projectId: string;
    groupId?: string;
    groupTitle?: string;
    onRenameGroup?: (newTitle: string) => void;
    onDeleteGroup?: () => void;
    onSaveTransmittal?: (reportId: string) => void;
    onLoadTransmittal?: (reportId: string) => void;
    className?: string;
}

export function ReportsPanel({
    projectId,
    groupId,
    groupTitle,
    onRenameGroup,
    onDeleteGroup,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: ReportsPanelProps) {
    const { reports, isLoading, error, refetch } = useReports({ projectId, groupId });
    const { createReport, updateReport, deleteReport, copyReport } = useReportMutations(projectId, groupId);

    // Use UI context for expanded/active state persistence
    const {
        isExpanded,
        isMenuExpanded,
        activeReportId,
        setExpanded,
        setMenuExpanded,
        setActiveReportId,
    } = useReportsSectionUI(groupId || projectId);

    // Find the active report
    const activeReport = reports.find(r => r.id === activeReportId) || reports[0] || null;

    // Export hook for active report
    const { exportReport } = useReportExport(activeReport?.id || null);
    const [isCopying, setIsCopying] = useState(false);
    const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);

    // Auto-select first report when loaded
    useEffect(() => {
        if (reports.length > 0 && !activeReportId) {
            setActiveReportId(reports[0].id);
        }
    }, [reports, activeReportId, setActiveReportId]);

    const [isCreating, setIsCreating] = useState(false);

    const handleCreateReport = useCallback(async () => {
        setIsCreating(true);
        try {
            const newReport = await createReport({ projectId, groupId });
            setActiveReportId(newReport.id);
            setExpanded(true);
        } finally {
            setIsCreating(false);
        }
    }, [createReport, projectId, setActiveReportId, setExpanded]);

    // Auto-create first report when expanding with none
    const handleExpandToggle = useCallback(async () => {
        if (!isExpanded && reports.length === 0 && !isLoading && !isCreating) {
            await handleCreateReport();
        } else {
            setExpanded(!isExpanded);
        }
    }, [isExpanded, reports.length, isLoading, isCreating, handleCreateReport, setExpanded]);

    const handleDeleteReport = useCallback(async (reportId: string) => {
        await deleteReport(reportId);
        // Select the first remaining report or null
        const remaining = reports.filter(r => r.id !== reportId);
        setActiveReportId(remaining[0]?.id || null);
    }, [deleteReport, reports, setActiveReportId]);

    const handleSelectReport = useCallback((reportId: string) => {
        setActiveReportId(reportId);
        if (!isExpanded) {
            setExpanded(true);
        }
    }, [setActiveReportId, isExpanded, setExpanded]);

    const handleUpdateReport = useCallback(async (
        reportId: string,
        data: UpdateReportRequest
    ) => {
        await updateReport(reportId, data);
    }, [updateReport]);

    const handleCopyReport = useCallback(async (reportId: string) => {
        const copied = await copyReport(reportId);
        setActiveReportId(copied.id);
    }, [copyReport, setActiveReportId]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!activeReport) return;
        await exportReport(format);
    }, [activeReport, exportReport]);

    const handleRibbonCopy = useCallback(async () => {
        if (!activeReport) return;
        setIsCopying(true);
        try {
            await handleCopyReport(activeReport.id);
        } finally {
            setIsCopying(false);
        }
    }, [activeReport, handleCopyReport]);

    // Error state
    if (error) {
        return (
            <div className={cn('flex flex-col', className)}>
                <SectionHeader
                    title={groupTitle || "Reports"}
                    icon={ClipboardList}
                    isExpanded={isExpanded}
                    onToggleExpand={handleExpandToggle}
                    isMenuExpanded={isMenuExpanded}
                    onToggleMenu={() => setMenuExpanded(!isMenuExpanded)}
                />
                <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }}>
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

    // Add reportNumber to each report for the tabs
    const reportsWithNumbers: ReportWithCount[] = reports.map((report, index) => ({
        ...report,
        reportNumber: index + 1,
    }));

    // Menu content with tabs and export buttons
    const menuContent = (
        <>
            <NumberedTabs
                items={reportsWithNumbers}
                activeItemId={activeReport?.id || null}
                onSelectItem={handleSelectReport}
                onCreateItem={handleCreateReport}
                onDeleteItem={handleDeleteReport}
                getItemNumber={(report, index) => report.reportNumber || index + 1}
                hasIndicator={(report) => report.transmittalCount > 0}
                isLoading={isLoading}
                entityName="Report"
                deleteMessage="This will permanently delete this report and all its sections, recipients, and attachments. This action cannot be undone."
            />
            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRibbonCopy}
                    disabled={!activeReport || isCopying}
                    className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                    title="Copy report"
                >
                    {isCopying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </Button>
            </div>
            {onDeleteGroup && (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteGroupDialog(true)}
                        className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-[var(--color-border)] transition-colors"
                        title="Delete report group"
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            )}
            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
            <ExportButtonGroup
                onExportPdf={() => handleExport('pdf')}
                onExportDocx={() => handleExport('docx')}
                disabled={!activeReport}
            />
        </>
    );

    return (
        <div className={cn('mt-6', className)}>
            {/* Header - Segmented ribbon with numbered tabs */}
            <SectionHeader
                title="Reports"
                icon={ClipboardList}
                isExpanded={isExpanded}
                onToggleExpand={handleExpandToggle}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setMenuExpanded(!isMenuExpanded)}
                menuContent={menuContent}
            />

            {/* Content Area - only shown when expanded */}
            {isExpanded && (
                <div className="mx-2 p-4 rounded-md shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 50%, transparent)' }}>
                    {isLoading ? (
                        <ReportsPanelSkeleton />
                    ) : reports.length === 0 ? (
                        <EmptyState onCreateReport={handleCreateReport} />
                    ) : activeReport ? (
                        <ReportContent
                            report={activeReport}
                            projectId={projectId}
                            onUpdate={(data) => handleUpdateReport(activeReport.id, data)}
                            onCopy={() => handleCopyReport(activeReport.id)}
                            onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(activeReport.id) : undefined}
                            onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(activeReport.id) : undefined}
                        />
                    ) : (
                        <div className="p-8 text-center text-[var(--color-text-muted)]">
                            <p>Select a report or create a new one.</p>
                        </div>
                    )}
                </div>
            )}

            <AuroraConfirmDialog
                open={showDeleteGroupDialog}
                onOpenChange={setShowDeleteGroupDialog}
                onConfirm={() => onDeleteGroup?.()}
                title={`Delete "${groupTitle || 'Reports'}" group`}
                description="This will permanently delete this report group and all reports within it, including their sections, recipients, and attachments."
                confirmLabel="Delete Group"
                variant="destructive"
            />
        </div>
    );
}

// Loading Skeleton Component
function ReportsPanelSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-64 w-full" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
    );
}

// Empty State Component
interface EmptyStateProps {
    onCreateReport: () => void;
}

function EmptyState({ onCreateReport }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-[var(--color-bg-tertiary)] p-4 mb-4">
                <ClipboardList className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                No reports yet
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-xs">
                Create your first periodic report to document project progress, financial summaries, and key updates.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
                Click the <span className="font-medium">+</span> button above to create a report.
            </p>
        </div>
    );
}

export default ReportsPanel;
