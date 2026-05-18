/**
 * Reports Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container for the Reports sub-module with segmented ribbon header and numbered tabs.
 * Matches RFT/TRR/Addendum styling with Aurora theme.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, AlertCircle, Copy, Loader2, Sparkles, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { NumberedTabs } from '@/components/shared/NumberedTabs';
import { ExportButtonGroup } from '@/components/shared/ExportButtonGroup';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { ProcurementSectionShell } from '@/components/procurement';
import { ReportContent } from './ReportContent';
import { REPORT_RECORD_ACCENT } from './RecordSectionHeading';
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
    displayMode?: 'accordion' | 'detail';
    className?: string;
}

export function ReportsPanel({
    projectId,
    groupId,
    groupTitle,
    onDeleteGroup,
    onSaveTransmittal,
    onLoadTransmittal,
    displayMode = 'accordion',
    className,
}: ReportsPanelProps) {
    const { reports, isLoading, error, refetch } = useReports({ projectId, groupId });
    const { createReport, createWeeklyReportDraft, updateReport, deleteReport, copyReport } = useReportMutations(projectId, groupId);

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
    const [isCreatingWeeklyDraft, setIsCreatingWeeklyDraft] = useState(false);
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
    }, [createReport, groupId, projectId, setActiveReportId, setExpanded]);

    const handleCreateWeeklyDraft = useCallback(async () => {
        setIsCreatingWeeklyDraft(true);
        try {
            const created = await createWeeklyReportDraft();
            setActiveReportId(created.id);
            setExpanded(true);
        } finally {
            setIsCreatingWeeklyDraft(false);
        }
    }, [createWeeklyReportDraft, setActiveReportId, setExpanded]);

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
                <div className="flex flex-1 flex-col items-center justify-center bg-[var(--sw-shell)] p-8">
                    <div className="mb-4 border border-[var(--sw-rule)] bg-white p-4">
                        <AlertCircle className="h-8 w-8 text-[var(--sw-rose-dk)]" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-[var(--sw-ink)]">
                        Failed to load reports
                    </h3>
                    <p className="mb-4 max-w-xs text-center text-sm text-[var(--sw-muted)]">
                        {error.message || 'There was an error loading your reports. Please try again.'}
                    </p>
                    <Button
                        variant="outline"
                        onClick={refetch}
                        className="rounded-none border-[var(--sw-rule)] bg-transparent text-[var(--sw-ink)] hover:bg-white"
                    >
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
                accentColor={REPORT_RECORD_ACCENT}
            />
            <div className="mx-2 h-5 w-px bg-[var(--sw-rule-2)]" />
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateWeeklyDraft}
                disabled={isCreatingWeeklyDraft}
                className="h-7 rounded-none border border-[var(--sw-rule)] bg-transparent px-2 text-[11px] font-semibold text-[var(--sw-ink)] transition-colors hover:bg-[var(--sw-shell)]"
                title="Create weekly report draft"
            >
                {isCreatingWeeklyDraft ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                Weekly draft
            </Button>
            <div className="mx-2 h-5 w-px bg-[var(--sw-rule-2)]" />
            <ExportButtonGroup
                onExportPdf={() => handleExport('pdf')}
                onExportDocx={() => handleExport('docx')}
                disabled={!activeReport}
            />
            <div className="ml-auto flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRibbonCopy}
                    disabled={!activeReport || isCopying}
                    className="h-7 w-7 rounded-none border border-[var(--sw-rule)] bg-transparent p-0 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-shell)] hover:text-[var(--sw-ink)]"
                    title="Copy report"
                >
                    {isCopying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </Button>
                {onDeleteGroup && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteGroupDialog(true)}
                        className="h-7 w-7 rounded-none border border-[var(--sw-rule)] bg-transparent p-0 text-[var(--sw-muted)] transition-colors hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]"
                        title="Delete report group"
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </>
    );

    const sectionTitle = activeReport?.title || groupTitle || "Reports";
    const sectionExpanded = displayMode === 'detail' || isExpanded;
    const detailDate = activeReport?.reportDate || activeReport?.createdAt || null;
    const detailDateLabel = detailDate
        ? new Date(detailDate.includes('T') ? detailDate : `${detailDate}T00:00:00`).toLocaleDateString('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        : 'no date';
    const panelContent = (
        <>
            {isLoading ? (
                <ReportsPanelSkeleton />
            ) : reports.length === 0 ? (
                <EmptyState />
            ) : activeReport ? (
                <ReportContent
                    report={activeReport}
                    projectId={projectId}
                    onUpdate={(data) => handleUpdateReport(activeReport.id, data)}
                    onCopy={() => handleCopyReport(activeReport.id)}
                    onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(activeReport.id) : undefined}
                    onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(activeReport.id) : undefined}
                    accentColor={REPORT_RECORD_ACCENT}
                />
            ) : (
                <div className="p-8 text-center text-[var(--sw-muted)]">
                    <p>Select a report or create a new one.</p>
                </div>
            )}
        </>
    );

    return (
        <div className={cn(className)}>
            {displayMode === 'detail' ? (
                <ProcurementSectionShell
                    label="report record"
                    meta={`report / ${detailDateLabel}`}
                    accentColor={REPORT_RECORD_ACCENT}
                    isExpanded={sectionExpanded}
                    onToggleExpanded={handleExpandToggle}
                    isMenuExpanded={isMenuExpanded}
                    onToggleMenu={() => setMenuExpanded(!isMenuExpanded)}
                    displayMode="detail"
                    menuContent={menuContent}
                >
                    {panelContent}
                </ProcurementSectionShell>
            ) : (
                <>
            {/* Header - Segmented ribbon with numbered tabs */}
            <SectionHeader
                title={sectionTitle}
                icon={ClipboardList}
                accentColor={REPORT_RECORD_ACCENT}
                isExpanded={isExpanded}
                onToggleExpand={handleExpandToggle}
                isMenuExpanded={isMenuExpanded}
                onToggleMenu={() => setMenuExpanded(!isMenuExpanded)}
                menuContent={menuContent}
            />

            {/* Content Area - only shown when expanded */}
            {isExpanded && (
                <div className="mx-2 border border-[var(--sw-rule)] bg-[var(--sw-shell)] p-4">
                    {panelContent}
                </div>
            )}
                </>
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
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 border border-[var(--sw-rule)] bg-[var(--sw-shell)] p-4">
                <ClipboardList className="h-8 w-8 text-[var(--sw-muted)]" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-[var(--sw-ink)]">
                No reports yet
            </h3>
            <p className="mb-4 max-w-xs text-sm text-[var(--sw-muted)]">
                Create your first periodic report to document project progress, financial summaries, and key updates.
            </p>
            <p className="text-sm text-[var(--sw-muted)]">
                Click the <span className="font-medium">+</span> button above to create a report.
            </p>
        </div>
    );
}

export default ReportsPanel;
