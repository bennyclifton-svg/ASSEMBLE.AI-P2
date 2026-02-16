/**
 * Meetings Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container for the Meetings sub-module with segmented ribbon header and numbered tabs.
 * Matches RFT/TRR/Addendum styling with Aurora theme.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Calendar, AlertCircle, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { NumberedTabs } from '@/components/shared/NumberedTabs';
import { ExportButtonGroup } from '@/components/shared/ExportButtonGroup';
import { MeetingContent } from './MeetingContent';
import { useMeetings, useMeetingMutations, useMeetingExport } from '@/lib/hooks/use-meetings';
import { useMeetingsSectionUI } from '@/lib/contexts/procurement-ui-context';
import { cn } from '@/lib/utils';
import type { Meeting, UpdateMeetingRequest } from '@/types/notes-meetings-reports';

interface MeetingWithCount extends Meeting {
    sectionCount: number;
    attendeeCount: number;
    transmittalCount: number;
    meetingNumber?: number;
}

interface MeetingsPanelProps {
    projectId: string;
    groupId?: string;
    groupTitle?: string;
    onRenameGroup?: (newTitle: string) => void;
    onDeleteGroup?: () => void;
    onSaveTransmittal?: (meetingId: string) => void;
    onLoadTransmittal?: (meetingId: string) => void;
    className?: string;
}

export function MeetingsPanel({
    projectId,
    groupId,
    groupTitle,
    onRenameGroup,
    onDeleteGroup,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: MeetingsPanelProps) {
    const { meetings, isLoading, error, refetch } = useMeetings({ projectId, groupId });
    const { createMeeting, updateMeeting, deleteMeeting, copyMeeting } = useMeetingMutations(projectId, groupId);

    // Use UI context for expanded/active state persistence
    const {
        isExpanded,
        isMenuExpanded,
        activeMeetingId,
        setExpanded,
        setMenuExpanded,
        setActiveMeetingId,
    } = useMeetingsSectionUI(groupId || projectId);

    // Find the active meeting
    const activeMeeting = meetings.find(m => m.id === activeMeetingId) || meetings[0] || null;

    // Export and email hooks for active meeting
    const { exportMeeting } = useMeetingExport(activeMeeting?.id || null);
    const [isCopying, setIsCopying] = useState(false);

    // Auto-select first meeting when loaded
    useEffect(() => {
        if (meetings.length > 0 && !activeMeetingId) {
            setActiveMeetingId(meetings[0].id);
        }
    }, [meetings, activeMeetingId, setActiveMeetingId]);

    const [isCreating, setIsCreating] = useState(false);

    const handleCreateMeeting = useCallback(async () => {
        setIsCreating(true);
        try {
            const newMeeting = await createMeeting({ projectId, groupId, title: groupTitle });
            setActiveMeetingId(newMeeting.id);
            setExpanded(true);
        } finally {
            setIsCreating(false);
        }
    }, [createMeeting, projectId, groupTitle, setActiveMeetingId, setExpanded]);

    // Auto-create first meeting when expanding with none
    const handleExpandToggle = useCallback(async () => {
        if (!isExpanded && meetings.length === 0 && !isLoading && !isCreating) {
            await handleCreateMeeting();
        } else {
            setExpanded(!isExpanded);
        }
    }, [isExpanded, meetings.length, isLoading, isCreating, handleCreateMeeting, setExpanded]);

    const handleDeleteMeeting = useCallback(async (meetingId: string) => {
        await deleteMeeting(meetingId);
        // Select the first remaining meeting or null
        const remaining = meetings.filter(m => m.id !== meetingId);
        setActiveMeetingId(remaining[0]?.id || null);
    }, [deleteMeeting, meetings, setActiveMeetingId]);

    const handleSelectMeeting = useCallback((meetingId: string) => {
        setActiveMeetingId(meetingId);
        if (!isExpanded) {
            setExpanded(true);
        }
    }, [setActiveMeetingId, isExpanded, setExpanded]);

    const handleUpdateMeeting = useCallback(async (
        meetingId: string,
        data: UpdateMeetingRequest
    ) => {
        await updateMeeting(meetingId, data);
    }, [updateMeeting]);

    const handleCopyMeeting = useCallback(async (meetingId: string) => {
        const copied = await copyMeeting(meetingId);
        setActiveMeetingId(copied.id);
    }, [copyMeeting, setActiveMeetingId]);

    const handleExport = useCallback(async (format: 'pdf' | 'docx') => {
        if (!activeMeeting) return;
        await exportMeeting(format);
    }, [activeMeeting, exportMeeting]);

    const handleRibbonCopy = useCallback(async () => {
        if (!activeMeeting) return;
        setIsCopying(true);
        try {
            await handleCopyMeeting(activeMeeting.id);
        } finally {
            setIsCopying(false);
        }
    }, [activeMeeting, handleCopyMeeting]);

    // Error state
    if (error) {
        return (
            <div className={cn('flex flex-col', className)}>
                <SectionHeader
                    title={groupTitle || "Meetings"}
                    icon={Calendar}
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
                        Failed to load meetings
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-4 text-center max-w-xs">
                        {error.message || 'There was an error loading your meetings. Please try again.'}
                    </p>
                    <Button variant="outline" onClick={refetch}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // Add meetingNumber to each meeting for the tabs
    const meetingsWithNumbers: MeetingWithCount[] = meetings.map((meeting, index) => ({
        ...meeting,
        meetingNumber: index + 1,
    }));

    // Menu content with tabs and export buttons
    const menuContent = (
        <>
            <NumberedTabs
                items={meetingsWithNumbers}
                activeItemId={activeMeeting?.id || null}
                onSelectItem={handleSelectMeeting}
                onCreateItem={handleCreateMeeting}
                onDeleteItem={handleDeleteMeeting}
                getItemNumber={(meeting, index) => meeting.meetingNumber || index + 1}
                hasIndicator={(meeting) => meeting.transmittalCount > 0}
                isLoading={isLoading}
                entityName="Meeting"
                deleteMessage="This will permanently delete this meeting and all its sections, attendees, and attachments. This action cannot be undone."
            />
            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRibbonCopy}
                    disabled={!activeMeeting || isCopying}
                    className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"
                    title="Copy meeting"
                >
                    {isCopying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                </Button>
            </div>
            <div className="mx-2 h-5 w-px bg-[var(--color-border)]" />
            <ExportButtonGroup
                onExportPdf={() => handleExport('pdf')}
                onExportDocx={() => handleExport('docx')}
                disabled={!activeMeeting}
            />
        </>
    );

    return (
        <div className={cn('mt-6', className)}>
            {/* Header - Segmented ribbon with numbered tabs */}
            <SectionHeader
                title={activeMeeting?.title || groupTitle || "Meetings"}
                icon={Calendar}
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
                        <MeetingsPanelSkeleton />
                    ) : meetings.length === 0 ? (
                        <EmptyState onCreateMeeting={handleCreateMeeting} />
                    ) : activeMeeting ? (
                        <MeetingContent
                            meeting={activeMeeting}
                            projectId={projectId}
                            onUpdate={(data) => handleUpdateMeeting(activeMeeting.id, data)}
                            onCopy={() => handleCopyMeeting(activeMeeting.id)}
                            onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(activeMeeting.id) : undefined}
                            onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(activeMeeting.id) : undefined}
                        />
                    ) : (
                        <div className="p-8 text-center text-[var(--color-text-muted)]">
                            <p>Select a meeting or create a new one.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Loading Skeleton Component
function MeetingsPanelSkeleton() {
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
    onCreateMeeting: () => void;
}

function EmptyState({ onCreateMeeting }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-[var(--color-bg-tertiary)] p-4 mb-4">
                <Calendar className="h-8 w-8 text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                No meetings yet
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4 max-w-xs">
                Create your first meeting to document agendas, minutes, and action items with attendees.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
                Click the <span className="font-medium">+</span> button above to create a meeting.
            </p>
        </div>
    );
}

export default MeetingsPanel;
