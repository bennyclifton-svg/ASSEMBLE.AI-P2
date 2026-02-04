/**
 * MeetingContent Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays the content of an active meeting with title editing, meeting editor,
 * email, and attachment section. Used within the MeetingsPanel.
 */

'use client';

import React, { useState } from 'react';
import { Copy, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MeetingEditor } from './MeetingEditor';
import { AttachmentSection } from './shared/AttachmentSection';
import { useMeetingTransmittal, useMeetingEmail } from '@/lib/hooks/use-meetings';
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
    onCopy,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: MeetingContentProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(meeting.title);
    const [isCopying, setIsCopying] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const { documents, isLoading: transmittalLoading } = useMeetingTransmittal(meeting.id);
    const { sendEmail } = useMeetingEmail(meeting.id);

    // Reset local title when meeting changes
    React.useEffect(() => {
        setLocalTitle(meeting.title);
    }, [meeting.id, meeting.title]);

    const handleTitleClick = () => {
        setIsEditingTitle(true);
    };

    const handleTitleBlur = async () => {
        setIsEditingTitle(false);
        if (localTitle !== meeting.title) {
            await onUpdate({ title: localTitle });
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditingTitle(false);
            if (localTitle !== meeting.title) {
                onUpdate({ title: localTitle });
            }
        } else if (e.key === 'Escape') {
            setLocalTitle(meeting.title);
            setIsEditingTitle(false);
        }
    };

    const handleAgendaTypeChange = async (agendaType: MeetingAgendaType) => {
        await onUpdate({ agendaType });
    };

    const handleMeetingDateChange = async (date: string | null) => {
        await onUpdate({ meetingDate: date });
    };

    const handleCopy = async () => {
        setIsCopying(true);
        try {
            await onCopy();
        } finally {
            setIsCopying(false);
        }
    };

    const handleEmail = async () => {
        setIsSendingEmail(true);
        try {
            await sendEmail();
        } catch (err) {
            console.error('Failed to prepare email:', err);
        } finally {
            setIsSendingEmail(false);
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
                            {meeting.title}
                        </h2>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEmail}
                        disabled={isSendingEmail}
                        className="h-8 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                        title="Email to attendees"
                    >
                        {isSendingEmail ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Mail className="w-4 h-4" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        disabled={isCopying}
                        className="h-8 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                        title="Copy meeting"
                    >
                        {isCopying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Meeting editor - borderless to match RFT */}
            <MeetingEditor
                meetingId={meeting.id}
                projectId={projectId}
                agendaType={meeting.agendaType}
                meetingDate={meeting.meetingDate}
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
