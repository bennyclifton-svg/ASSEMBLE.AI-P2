/**
 * MeetingContent Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays the content of an active meeting with meeting editor
 * and attachment section. Used within the MeetingsPanel.
 */

'use client';

import { MeetingEditor } from './MeetingEditor';
import { AttachmentSection } from './shared/AttachmentSection';
import { useMeetingTransmittal } from '@/lib/hooks/use-meetings';
import type { Meeting, UpdateMeetingRequest, MeetingAgendaType } from '@/types/notes-meetings-reports';
import { cn } from '@/lib/utils';

interface MeetingWithCount extends Meeting {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
}

interface MeetingContentProps {
    meeting: MeetingWithCount;
    projectId: string;
    onUpdate: (data: UpdateMeetingRequest) => Promise<void>;
    onCopy: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function MeetingContent({
    meeting,
    projectId,
    onUpdate,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: MeetingContentProps) {
    const { documents, isLoading: transmittalLoading } = useMeetingTransmittal(meeting.id);

    const handleTitleChange = async (title: string) => {
        await onUpdate({ title });
    };

    const handleAgendaTypeChange = async (agendaType: MeetingAgendaType) => {
        await onUpdate({ agendaType });
    };

    const handleMeetingDateChange = async (date: string | null) => {
        await onUpdate({ meetingDate: date });
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Meeting editor - borderless to match RFT */}
            <MeetingEditor
                meetingId={meeting.id}
                projectId={projectId}
                agendaType={meeting.agendaType}
                meetingDate={meeting.meetingDate}
                title={meeting.title}
                onTitleChange={handleTitleChange}
                onAgendaTypeChange={handleAgendaTypeChange}
                onMeetingDateChange={handleMeetingDateChange}
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

export default MeetingContent;
