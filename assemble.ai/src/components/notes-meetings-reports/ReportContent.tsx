/**
 * ReportContent Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays the content of an active report with title editing, report editor,
 * and attachment section. Used within the ReportsPanel.
 */

'use client';

import React, { useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReportEditor } from './ReportEditor';
import { AttachmentSection } from './shared/AttachmentSection';
import { useReportTransmittal } from '@/lib/hooks/use-reports';
import type { Report, UpdateReportRequest, ReportContentsType } from '@/types/notes-meetings-reports';
import { cn } from '@/lib/utils';

interface ReportWithCount extends Report {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
}

interface ReportContentProps {
    report: ReportWithCount;
    projectId: string;
    onUpdate: (data: UpdateReportRequest) => Promise<void>;
    onCopy: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function ReportContent({
    report,
    projectId,
    onUpdate,
    onCopy,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: ReportContentProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(report.title);
    const [isCopying, setIsCopying] = useState(false);

    const { documents, isLoading: transmittalLoading } = useReportTransmittal(report.id);

    // Reset local title when report changes
    React.useEffect(() => {
        setLocalTitle(report.title);
    }, [report.id, report.title]);

    const handleTitleClick = () => {
        setIsEditingTitle(true);
    };

    const handleTitleBlur = async () => {
        setIsEditingTitle(false);
        if (localTitle !== report.title) {
            await onUpdate({ title: localTitle });
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditingTitle(false);
            if (localTitle !== report.title) {
                onUpdate({ title: localTitle });
            }
        } else if (e.key === 'Escape') {
            setLocalTitle(report.title);
            setIsEditingTitle(false);
        }
    };

    const handleContentsTypeChange = async (contentsType: ReportContentsType) => {
        await onUpdate({ contentsType });
    };

    const handleReportDateChange = async (date: string | null) => {
        await onUpdate({ reportDate: date });
    };

    const handlePreparedForChange = async (value: string | null) => {
        await onUpdate({ preparedFor: value });
    };

    const handlePreparedByChange = async (value: string | null) => {
        await onUpdate({ preparedBy: value });
    };

    const handleReportingPeriodChange = async (start: string | null, end: string | null) => {
        await onUpdate({ reportingPeriodStart: start, reportingPeriodEnd: end });
    };

    const handleCopy = async () => {
        setIsCopying(true);
        try {
            await onCopy();
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header with title and actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Title - click to edit */}
                    {isEditingTitle ? (
                        <Input
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={handleTitleKeyDown}
                            autoFocus
                            className="h-8 text-lg font-semibold bg-transparent border-[var(--color-border)] focus:border-[var(--color-accent-copper)]"
                        />
                    ) : (
                        <h2
                            onClick={handleTitleClick}
                            className="text-lg font-semibold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-copper)] truncate"
                            title="Click to edit title"
                        >
                            {report.title}
                        </h2>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        disabled={isCopying}
                        className="h-8 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                        title="Copy report"
                    >
                        {isCopying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Report editor - borderless to match RFT */}
            <ReportEditor
                reportId={report.id}
                projectId={projectId}
                contentsType={report.contentsType}
                reportDate={report.reportDate}
                preparedFor={report.preparedFor}
                preparedBy={report.preparedBy}
                reportingPeriodStart={report.reportingPeriodStart}
                reportingPeriodEnd={report.reportingPeriodEnd}
                onContentsTypeChange={handleContentsTypeChange}
                onReportDateChange={handleReportDateChange}
                onPreparedForChange={handlePreparedForChange}
                onPreparedByChange={handlePreparedByChange}
                onReportingPeriodChange={handleReportingPeriodChange}
            />

            {/* Attachment section - matches RFT TransmittalSchedule style */}
            <AttachmentSection
                documents={documents}
                isLoading={transmittalLoading}
                onSave={onSaveTransmittal}
                onLoad={onLoadTransmittal}
            />
        </div>
    );
}

export default ReportContent;
