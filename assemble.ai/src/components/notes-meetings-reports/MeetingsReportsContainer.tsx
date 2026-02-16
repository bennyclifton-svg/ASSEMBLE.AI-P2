/**
 * Meetings & Reports Container Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Container supporting multiple meeting/report group instances.
 * Each group is a collapsible section with its own numbered sub-tabs.
 * Groups are created via "+ New Meeting" / "+ New Report" buttons.
 */

'use client';

import React, { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { mutate as globalMutate } from 'swr';
import { MeetingsPanel } from './MeetingsPanel';
import { ReportsPanel } from './ReportsPanel';
import { useMeetingGroups } from '@/lib/hooks/use-meeting-groups';
import { useReportGroups } from '@/lib/hooks/use-report-groups';
import { cn } from '@/lib/utils';

interface MeetingsReportsContainerProps {
    projectId: string;
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    className?: string;
}

export function MeetingsReportsContainer({
    projectId,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    className,
}: MeetingsReportsContainerProps) {
    const {
        groups: meetingGroups,
        createGroup: createMeetingGroup,
        renameGroup: renameMeetingGroup,
        deleteGroup: deleteMeetingGroup,
    } = useMeetingGroups(projectId);

    const {
        groups: reportGroups,
        createGroup: createReportGroup,
        renameGroup: renameReportGroup,
        deleteGroup: deleteReportGroup,
    } = useReportGroups(projectId);

    // Handlers for Save Transmittal
    const handleSaveTransmittal = useCallback(async (type: 'meeting' | 'report', id: string) => {
        if (!selectedDocumentIds) return;

        const endpoint = type === 'meeting'
            ? `/api/meetings/${id}/transmittal`
            : `/api/project-reports/${id}/transmittal`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds: selectedDocumentIds }),
            });

            if (!response.ok) return;
            globalMutate(endpoint);
        } catch (err) {
            console.error(`[MeetingsReportsContainer] Error saving transmittal for ${type}:`, err);
        }
    }, [selectedDocumentIds]);

    // Handlers for Load Transmittal
    const handleLoadTransmittal = useCallback(async (type: 'meeting' | 'report', id: string) => {
        const endpoint = type === 'meeting'
            ? `/api/meetings/${id}/transmittal`
            : `/api/project-reports/${id}/transmittal`;

        try {
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                const documentIds = data.documents?.map((doc: { documentId: string }) => doc.documentId) || [];
                onSetSelectedDocumentIds?.(documentIds);
            }
        } catch (err) {
            console.error(`[MeetingsReportsContainer] Error loading transmittal for ${type}:`, err);
        }
    }, [onSetSelectedDocumentIds]);

    const btnClass = "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)] bg-[var(--color-accent-green)] hover:bg-[var(--primitive-green-dark)] disabled:opacity-50";

    return (
        <div className={cn('flex flex-col h-full gap-4 overflow-y-auto pt-2', className)}>
            {/* Top row: + New Meeting / + New Report buttons */}
            <div className="flex items-center justify-end gap-2 px-2">
                <button
                    onClick={() => createMeetingGroup()}
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-white bg-[#1776c1] hover:opacity-90 disabled:opacity-50"
                >
                    <Plus className="h-3.5 w-3.5" />
                    New Meeting
                </button>
                <button
                    onClick={() => createReportGroup()}
                    className={btnClass}
                >
                    <Plus className="h-3.5 w-3.5" />
                    New Report
                </button>
            </div>

            {/* Meeting group instances */}
            {meetingGroups.map((group) => (
                <MeetingsPanel
                    key={group.id}
                    projectId={projectId}
                    groupId={group.id}
                    groupTitle={group.title}
                    onRenameGroup={(newTitle) => renameMeetingGroup(group.id, newTitle)}
                    onDeleteGroup={() => deleteMeetingGroup(group.id)}
                    onSaveTransmittal={(meetingId) => handleSaveTransmittal('meeting', meetingId)}
                    onLoadTransmittal={(meetingId) => handleLoadTransmittal('meeting', meetingId)}
                />
            ))}

            {/* Report group instances */}
            {reportGroups.map((group) => (
                <ReportsPanel
                    key={group.id}
                    projectId={projectId}
                    groupId={group.id}
                    groupTitle={group.title}
                    onRenameGroup={(newTitle) => renameReportGroup(group.id, newTitle)}
                    onDeleteGroup={() => deleteReportGroup(group.id)}
                    onSaveTransmittal={(reportId) => handleSaveTransmittal('report', reportId)}
                    onLoadTransmittal={(reportId) => handleLoadTransmittal('report', reportId)}
                />
            ))}

            {/* Empty state when no groups exist */}
            {meetingGroups.length === 0 && reportGroups.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm text-[var(--color-text-muted)] mb-2">
                        No meetings or reports yet.
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Click "+ New Meeting" or "+ New Report" to get started.
                    </p>
                </div>
            )}
        </div>
    );
}

export default MeetingsReportsContainer;
