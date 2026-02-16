/**
 * ReportContent Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays the content of an active report with report editor
 * and attachment section. Used within the ReportsPanel.
 */

'use client';

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
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: ReportContentProps) {
    const { documents, isLoading: transmittalLoading } = useReportTransmittal(report.id);

    const handleTitleChange = async (title: string) => {
        await onUpdate({ title });
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

    return (
        <div className={cn('space-y-4', className)}>
            {/* Report editor - borderless to match RFT */}
            <ReportEditor
                reportId={report.id}
                projectId={projectId}
                contentsType={report.contentsType}
                reportDate={report.reportDate}
                title={report.title}
                onTitleChange={handleTitleChange}
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
