/**
 * Meetings Panel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container for listing and managing meetings.
 * Phase 9: Added loading skeletons, enhanced empty state, delete confirmation.
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MeetingCard } from './MeetingCard';
import { DeleteConfirmDialog } from './shared/DeleteConfirmDialog';
import { useMeetings, useMeetingMutations } from '@/lib/hooks/use-meetings';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpdateMeetingRequest } from '@/types/notes-meetings-reports';

interface MeetingsPanelProps {
    projectId: string;
    onSaveTransmittal?: (meetingId: string) => void;
    onLoadTransmittal?: (meetingId: string) => void;
    className?: string;
}

export function MeetingsPanel({
    projectId,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: MeetingsPanelProps) {
    const { meetings, isLoading, error, refetch } = useMeetings({ projectId });
    const { createMeeting, updateMeeting, deleteMeeting, copyMeeting } = useMeetingMutations(projectId);

    const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; meetingId: string; meetingTitle: string }>({
        open: false,
        meetingId: '',
        meetingTitle: '',
    });

    // Handle create new meeting
    const handleCreateMeeting = useCallback(async () => {
        try {
            setIsCreating(true);
            const newMeeting = await createMeeting({ projectId });
            // Auto-expand the new meeting
            setExpandedMeetingId(newMeeting.id);
        } catch (err) {
            console.error('Failed to create meeting:', err);
        } finally {
            setIsCreating(false);
        }
    }, [createMeeting, projectId]);

    // Handle update meeting
    const handleUpdateMeeting = useCallback(async (meetingId: string, data: UpdateMeetingRequest) => {
        try {
            await updateMeeting(meetingId, data);
        } catch (err) {
            console.error('Failed to update meeting:', err);
        }
    }, [updateMeeting]);

    // Handle copy meeting
    const handleCopyMeeting = useCallback(async (meetingId: string) => {
        try {
            const copiedMeeting = await copyMeeting(meetingId);
            // Auto-expand the copied meeting
            setExpandedMeetingId(copiedMeeting.id);
        } catch (err) {
            console.error('Failed to copy meeting:', err);
        }
    }, [copyMeeting]);

    // Handle delete click - opens confirmation dialog
    const handleDeleteClick = useCallback((meetingId: string, meetingTitle: string) => {
        setDeleteDialog({ open: true, meetingId, meetingTitle });
    }, []);

    // Handle confirm delete
    const handleConfirmDelete = useCallback(async () => {
        try {
            const { meetingId } = deleteDialog;
            // Close if expanded
            if (expandedMeetingId === meetingId) {
                setExpandedMeetingId(null);
            }
            await deleteMeeting(meetingId);
        } catch (err) {
            console.error('Failed to delete meeting:', err);
        }
    }, [deleteMeeting, expandedMeetingId, deleteDialog]);

    // Toggle meeting expansion
    const handleToggleExpand = useCallback((meetingId: string) => {
        setExpandedMeetingId(current => current === meetingId ? null : meetingId);
    }, []);

    // Error state
    if (error) {
        return (
            <div className={cn('flex flex-col h-full', className)}>
                <PanelHeader meetingsCount={0} isCreating={isCreating} onCreateMeeting={handleCreateMeeting} />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
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

    return (
        <div className={cn('flex flex-col h-full', className)}>
            <PanelHeader
                meetingsCount={isLoading ? 0 : meetings.length}
                isCreating={isCreating}
                onCreateMeeting={handleCreateMeeting}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <MeetingsPanelSkeleton />
                ) : meetings.length === 0 ? (
                    <EmptyState onCreateMeeting={handleCreateMeeting} isCreating={isCreating} />
                ) : (
                    <div className="space-y-3">
                        {meetings.map((meeting) => (
                            <MeetingCard
                                key={meeting.id}
                                meeting={meeting}
                                projectId={projectId}
                                isExpanded={expandedMeetingId === meeting.id}
                                onToggleExpand={() => handleToggleExpand(meeting.id)}
                                onUpdate={(data) => handleUpdateMeeting(meeting.id, data)}
                                onCopy={() => handleCopyMeeting(meeting.id)}
                                onDelete={async () => handleDeleteClick(meeting.id, meeting.title)}
                                onSaveTransmittal={onSaveTransmittal ? () => onSaveTransmittal(meeting.id) : undefined}
                                onLoadTransmittal={onLoadTransmittal ? () => onLoadTransmittal(meeting.id) : undefined}
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
                itemName={deleteDialog.meetingTitle}
                itemType="meeting"
            />
        </div>
    );
}

// Panel Header Component
interface PanelHeaderProps {
    meetingsCount: number;
    isCreating: boolean;
    onCreateMeeting: () => void;
}

function PanelHeader({ meetingsCount, isCreating, onCreateMeeting }: PanelHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Meetings
                </h2>
                {meetingsCount > 0 && (
                    <span className="text-sm text-[var(--color-text-muted)]">
                        ({meetingsCount})
                    </span>
                )}
            </div>

            <Button
                variant="copper"
                size="sm"
                onClick={onCreateMeeting}
                disabled={isCreating}
                title="Create new meeting"
            >
                {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4 mr-1" />
                )}
                New Meeting
            </Button>
        </div>
    );
}

// Loading Skeleton Component
function MeetingsPanelSkeleton() {
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
                            <Skeleton className="h-5 w-40" />
                        </div>
                        <div className="flex items-center gap-1">
                            <Skeleton className="h-8 w-8 rounded" />
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
    onCreateMeeting: () => void;
    isCreating: boolean;
}

function EmptyState({ onCreateMeeting, isCreating }: EmptyStateProps) {
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
            <Button
                variant="copper"
                onClick={onCreateMeeting}
                disabled={isCreating}
            >
                {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Plus className="h-4 w-4 mr-2" />
                )}
                Create Meeting
            </Button>
        </div>
    );
}

export default MeetingsPanel;
