/**
 * Meeting Card Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A collapsible card for displaying and editing a meeting.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CardHeader } from './shared/CardHeader';
import { MeetingEditor } from './MeetingEditor';
import { AttachmentSection } from './shared/AttachmentSection';
import { ExportButton, type ExportFormat } from './shared/ExportButton';
import { EmailButton } from './shared/EmailButton';
import { useMeetingTransmittal, useMeetingExport, useMeetingEmail } from '@/lib/hooks/use-meetings';
import type { Meeting, UpdateMeetingRequest, MeetingAgendaType } from '@/types/notes-meetings-reports';
import { cn } from '@/lib/utils';

interface MeetingWithCount extends Meeting {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
}

interface MeetingCardProps {
    meeting: MeetingWithCount;
    projectId: string;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    onUpdate: (data: UpdateMeetingRequest) => Promise<void>;
    onCopy: () => Promise<void>;
    onDelete: () => Promise<void>;
    onDownload?: () => void;
    onEmail?: () => void;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function MeetingCard({
    meeting,
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
}: MeetingCardProps) {
    const [localExpanded, setLocalExpanded] = useState(isExpanded);
    const expanded = onToggleExpand ? isExpanded : localExpanded;

    const { documents, isLoading: transmittalLoading } = useMeetingTransmittal(
        expanded ? meeting.id : null
    );

    // Export and email hooks
    const { exportMeeting } = useMeetingExport(meeting.id);
    const { sendEmail } = useMeetingEmail(meeting.id);

    // Handle export with format selection
    const handleExport = async (format: ExportFormat) => {
        try {
            await exportMeeting(format);
        } catch (err) {
            console.error('Failed to export meeting:', err);
        }
    };

    // Handle email - opens mailto with generated content
    const handleEmail = async () => {
        try {
            return await sendEmail();
        } catch (err) {
            console.error('Failed to prepare email:', err);
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

    const handleAgendaTypeChange = async (agendaType: MeetingAgendaType) => {
        await onUpdate({ agendaType });
    };

    return (
        <Card
            variant="translucent"
            className={cn('overflow-hidden', className)}
        >
            <div className="flex items-center">
                <div className="flex-1">
                    <CardHeader
                        title={meeting.title}
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
                    />
                </div>
                <div className="flex items-center gap-1 pr-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <ExportButton
                        onExport={handleExport}
                        size="sm"
                        tooltip="Export meeting"
                    />
                    <EmailButton
                        onEmail={handleEmail}
                        size="sm"
                        tooltip="Email to attendees"
                    />
                </div>
            </div>

            {expanded && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <MeetingEditor
                        meetingId={meeting.id}
                        projectId={projectId}
                        agendaType={meeting.agendaType}
                        meetingDate={meeting.meetingDate}
                        onAgendaTypeChange={handleAgendaTypeChange}
                        onMeetingDateChange={(date) => onUpdate({ meetingDate: date })}
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

export default MeetingCard;
