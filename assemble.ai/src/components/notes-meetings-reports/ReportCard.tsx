/**
 * Report Card Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A collapsible card for displaying and editing a report.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CardHeader } from './shared/CardHeader';
import { ReportEditor } from './ReportEditor';
import { AttachmentSection } from './shared/AttachmentSection';
import { ExportButton, type ExportFormat } from './shared/ExportButton';
import { useReportTransmittal, useReportExport } from '@/lib/hooks/use-reports';
import type { Report, UpdateReportRequest, ReportContentsType } from '@/types/notes-meetings-reports';
import { cn } from '@/lib/utils';

interface ReportWithCount extends Report {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
}

interface ReportCardProps {
    report: ReportWithCount;
    projectId: string;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    onUpdate: (data: UpdateReportRequest) => Promise<void>;
    onCopy: () => Promise<void>;
    onDelete: () => Promise<void>;
    onDownload?: () => void;
    onEmail?: () => void;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function ReportCard({
    report,
    projectId,
    isExpanded = false,
    onToggleExpand,
    onUpdate,
    onCopy,
    onDelete,
    onDownload,
    onEmail,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: ReportCardProps) {
    const [localExpanded, setLocalExpanded] = useState(isExpanded);
    const expanded = onToggleExpand ? isExpanded : localExpanded;

    const { documents, isLoading: transmittalLoading } = useReportTransmittal(
        expanded ? report.id : null
    );

    // Export hook
    const { exportReport } = useReportExport(report.id);

    // Handle export with format selection
    const handleExport = async (format: ExportFormat) => {
        try {
            await exportReport(format);
        } catch (err) {
            console.error('Failed to export report:', err);
        }
    };

    const handleToggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalExpanded(!localExpanded);
        }
    };

    const handleTitleChange = async (newTitle: string) => {
        await onUpdate({ title: newTitle });
    };

    const handleContentsTypeChange = async (contentsType: ReportContentsType) => {
        await onUpdate({ contentsType });
    };

    return (
        <Card
            variant="translucent"
            className={cn('overflow-hidden', className)}
        >
            <div className="flex items-center group bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors border-b border-[var(--color-border)]">
                <div className="flex-1">
                    <CardHeader
                        title={report.title}
                        isExpanded={expanded}
                        onToggleExpand={handleToggleExpand}
                        onTitleChange={handleTitleChange}
                        onCopy={onCopy}
                        onDelete={onDelete}
                        onDownload={onDownload}
                        onEmail={onEmail}
                        showStar={false}
                        showCopy={true}
                        showDelete={true}
                        showDownload={false}
                        showEmail={false}
                        className="border-b-0 hover:bg-transparent"
                    />
                </div>
                <div className="flex items-center gap-1 pr-4 py-3">
                    <ExportButton
                        onExport={handleExport}
                        size="sm"
                        tooltip="Export report"
                    />
                </div>
            </div>

            {expanded && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <ReportEditor
                        reportId={report.id}
                        projectId={projectId}
                        contentsType={report.contentsType}
                        reportDate={report.reportDate}
                        title={report.title}
                        onTitleChange={async (title) => { await onUpdate({ title }); }}
                        preparedFor={report.preparedFor}
                        preparedBy={report.preparedBy}
                        reportingPeriodStart={report.reportingPeriodStart}
                        reportingPeriodEnd={report.reportingPeriodEnd}
                        onContentsTypeChange={handleContentsTypeChange}
                        onReportDateChange={(date) => onUpdate({ reportDate: date })}
                        onPreparedForChange={(value) => onUpdate({ preparedFor: value })}
                        onPreparedByChange={(value) => onUpdate({ preparedBy: value })}
                        onReportingPeriodChange={(start, end) => onUpdate({ reportingPeriodStart: start, reportingPeriodEnd: end })}
                    />

                    <AttachmentSection
                        documents={documents}
                        isLoading={transmittalLoading}
                        onSave={onSaveTransmittal}
                        onLoad={onLoadTransmittal}
                    />
                </div>
            )}
        </Card>
    );
}

export default ReportCard;
