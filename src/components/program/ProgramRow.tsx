'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { useUpdateActivity, useDeleteActivity, useCreateMilestone } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import { ProgramBar } from './ProgramBar';
import { MilestoneMarker } from './MilestoneMarker';
import type { ProgramActivity, ProgramMilestone, ZoomLevel } from '@/types/program';

// Format date to ISO string (date only)
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

interface ProgramRowProps {
    projectId: string;
    activity: ProgramActivity;
    depth: number;
    hasChildren: boolean;
    columns: Array<{ date: Date; label: string }>;
    columnWidth: number;
    zoomLevel: ZoomLevel;
    milestones: ProgramMilestone[];
    isNameColumn: boolean;
    allActivities: ProgramActivity[];
    onStartLinkDrag?: (activityId: string, end: 'start' | 'end', clientX: number, clientY: number) => void;
    selectedActivityId?: string | null;
    onSelectActivity?: (activityId: string | null) => void;
}

export function ProgramRow({
    projectId,
    activity,
    depth,
    hasChildren,
    columns,
    columnWidth,
    zoomLevel,
    milestones,
    isNameColumn,
    allActivities,
    onStartLinkDrag,
    selectedActivityId,
    onSelectActivity,
}: ProgramRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(activity.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const updateActivity = useUpdateActivity(projectId);
    const deleteActivity = useDeleteActivity(projectId);
    const createMilestone = useCreateMilestone(projectId);
    const refetch = useRefetch();
    const timelineRef = useRef<HTMLDivElement>(null);

    // State for drag-to-create bar
    const [isCreatingBar, setIsCreatingBar] = useState(false);
    const [createBarStart, setCreateBarStart] = useState<number | null>(null);
    const [createBarEnd, setCreateBarEnd] = useState<number | null>(null);
    const hasExistingDates = Boolean(activity.startDate && activity.endDate);

    // Get date from X position
    const getDateFromPosition = useCallback((x: number): Date => {
        const colIndex = Math.floor(x / columnWidth);
        const fraction = (x % columnWidth) / columnWidth;

        if (colIndex < 0 || colIndex >= columns.length) {
            return colIndex < 0 ? columns[0].date : columns[columns.length - 1].date;
        }

        const colStart = columns[colIndex].date.getTime();
        const colEnd = colIndex < columns.length - 1
            ? columns[colIndex + 1].date.getTime()
            : colStart + (zoomLevel === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);

        const targetTime = colStart + fraction * (colEnd - colStart);
        return new Date(targetTime);
    }, [columns, columnWidth, zoomLevel]);

    const handleToggleCollapse = () => {
        updateActivity.mutate({
            id: activity.id,
            collapsed: !activity.collapsed,
        }, refetch);
    };

    const handleStartEdit = () => {
        setEditName(activity.name);
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSaveName = () => {
        if (editName.trim() && editName !== activity.name) {
            updateActivity.mutate({
                id: activity.id,
                name: editName.trim(),
            }, refetch);
        }
        setIsEditing(false);
    };

    // Find the previous sibling (for indent) or parent (for outdent)
    const handleIndent = () => {
        // Find siblings (activities with same parent)
        const siblings = allActivities.filter((a) => a.parentId === activity.parentId);
        const myIndex = siblings.findIndex((a) => a.id === activity.id);

        if (myIndex > 0) {
            // Make the previous sibling the new parent
            const previousSibling = siblings[myIndex - 1];
            updateActivity.mutate({
                id: activity.id,
                parentId: previousSibling.id,
            }, refetch);
        }
    };

    const handleOutdent = () => {
        if (activity.parentId) {
            // Find the parent to get its parentId (grandparent)
            const parent = allActivities.find((a) => a.id === activity.parentId);
            updateActivity.mutate({
                id: activity.id,
                parentId: parent?.parentId || null,
            }, refetch);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveName();
        } else if (e.key === 'Escape') {
            setEditName(activity.name);
            setIsEditing(false);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                handleOutdent();
            } else {
                handleIndent();
            }
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (confirm('Delete this activity?')) {
            deleteActivity.mutate(activity.id, refetch);
        }
    };

    // Double-click on timeline to create milestone
    const handleTimelineDoubleClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Find which column was clicked
        const colIndex = Math.floor(x / columnWidth);
        if (colIndex < 0 || colIndex >= columns.length) return;

        // Calculate date position within column
        const fraction = (x % columnWidth) / columnWidth;
        const colDate = columns[colIndex].date;
        const nextDate = colIndex < columns.length - 1
            ? columns[colIndex + 1].date
            : new Date(colDate.getTime() + (zoomLevel === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000);

        const milestoneTime = colDate.getTime() + fraction * (nextDate.getTime() - colDate.getTime());
        const milestoneDate = new Date(milestoneTime);

        const name = prompt('Milestone name:');
        if (name) {
            createMilestone.mutate({
                activityId: activity.id,
                name,
                date: milestoneDate.toISOString().split('T')[0],
            }, refetch);
        }
    };

    // Handle mouse down on timeline to start creating a bar
    const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
        // Only allow creating bar if activity doesn't have dates yet
        if (hasExistingDates) return;
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        setIsCreatingBar(true);
        setCreateBarStart(x);
        setCreateBarEnd(x);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!timelineRef.current) return;
            const moveRect = timelineRef.current.getBoundingClientRect();
            const moveX = Math.max(0, moveEvent.clientX - moveRect.left);
            setCreateBarEnd(moveX);
        };

        const handleMouseUp = async (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            if (!timelineRef.current) {
                setIsCreatingBar(false);
                setCreateBarStart(null);
                setCreateBarEnd(null);
                return;
            }

            const upRect = timelineRef.current.getBoundingClientRect();
            const endX = Math.max(0, upEvent.clientX - upRect.left);

            // Calculate start and end positions
            const startX = Math.min(x, endX);
            const finalEndX = Math.max(x, endX);

            // Only create if dragged at least a bit
            if (Math.abs(finalEndX - startX) > 10) {
                const startDate = getDateFromPosition(startX);
                const endDate = getDateFromPosition(finalEndX);

                // Snap to week boundaries if in week mode
                let finalStartDate = startDate;
                let finalEndDate = endDate;

                if (zoomLevel === 'week') {
                    // Snap start to Monday
                    const startDay = finalStartDate.getDay();
                    const startDiff = startDay === 0 ? -6 : 1 - startDay;
                    finalStartDate = new Date(finalStartDate);
                    finalStartDate.setDate(finalStartDate.getDate() + startDiff);

                    // Snap end to Sunday
                    const endDay = finalEndDate.getDay();
                    const endDiff = endDay === 0 ? 0 : 7 - endDay;
                    finalEndDate = new Date(finalEndDate);
                    finalEndDate.setDate(finalEndDate.getDate() + endDiff);
                }

                try {
                    console.log('Creating bar for activity:', activity.id, {
                        startDate: formatDate(finalStartDate),
                        endDate: formatDate(finalEndDate),
                    });
                    const result = await updateActivity.mutate({
                        id: activity.id,
                        startDate: formatDate(finalStartDate),
                        endDate: formatDate(finalEndDate),
                    }, async () => {
                        console.log('Refetching program data...');
                        await refetch();
                        console.log('Refetch complete');
                    });
                    console.log('Update result:', result);
                } catch (err) {
                    console.error('Failed to update activity dates:', err);
                }
            }

            setIsCreatingBar(false);
            setCreateBarStart(null);
            setCreateBarEnd(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [hasExistingDates, getDateFromPosition, zoomLevel, updateActivity, activity.id, refetch]);

    const rowHeight = 32;
    const indentWidth = 16;

    if (isNameColumn) {
        // Render the activity name column
        return (
            <div
                className="group flex items-center border-b border-[#3e3e42] hover:bg-[#2a2a2a]"
                style={{ height: rowHeight }}
            >
                {/* Indent spacer */}
                <div style={{ width: depth * indentWidth }} />

                {/* Collapse/expand chevron */}
                <div className="w-5 shrink-0">
                    {hasChildren && (
                        <button
                            onClick={handleToggleCollapse}
                            className="p-0.5 text-gray-500 hover:text-gray-300"
                        >
                            {activity.collapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )}
                        </button>
                    )}
                </div>

                {/* Color indicator */}
                <div
                    className="mr-2 h-3 w-1 rounded-full"
                    style={{ backgroundColor: '#56b6c2' }}
                />

                {/* Activity name */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-[#3e3e42] px-1 py-0.5 text-xs text-white outline-none ring-1 ring-[#0e639c]"
                        />
                    ) : (
                        <span
                            onDoubleClick={handleStartEdit}
                            className={`block truncate text-xs cursor-text ${
                                hasChildren ? 'font-medium text-white' : 'text-gray-300'
                            }`}
                        >
                            {activity.name}
                        </span>
                    )}
                </div>

                {/* Delete button (visible on hover) */}
                <button
                    onClick={handleDelete}
                    className="invisible mr-2 p-0.5 text-gray-500 hover:text-red-400 group-hover:visible"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }

    // Calculate creating bar position
    const creatingBarLeft = createBarStart !== null && createBarEnd !== null
        ? Math.min(createBarStart, createBarEnd)
        : 0;
    const creatingBarWidth = createBarStart !== null && createBarEnd !== null
        ? Math.abs(createBarEnd - createBarStart)
        : 0;
    const barHeight = 20;
    const topOffset = (rowHeight - barHeight) / 2;

    // Render the timeline cells row
    return (
        <div
            ref={timelineRef}
            data-activity-id={activity.id}
            className={`relative flex border-b border-[#3e3e42] hover:bg-[#2a2a2a]/50 ${
                !hasExistingDates ? 'cursor-crosshair' : ''
            }`}
            style={{ height: rowHeight }}
            onDoubleClick={handleTimelineDoubleClick}
            onMouseDown={handleTimelineMouseDown}
        >
            {/* Grid cells */}
            {columns.map((col, i) => (
                <div
                    key={i}
                    className="shrink-0 border-r border-[#3e3e42]/50"
                    style={{ width: columnWidth }}
                />
            ))}

            {/* Bar overlay */}
            {activity.startDate && activity.endDate && (
                <ProgramBar
                    projectId={projectId}
                    activity={activity}
                    columns={columns}
                    columnWidth={columnWidth}
                    zoomLevel={zoomLevel}
                    rowHeight={rowHeight}
                    onStartLinkDrag={onStartLinkDrag}
                    isSelected={selectedActivityId === activity.id}
                    onSelect={onSelectActivity ? () => onSelectActivity(activity.id) : undefined}
                />
            )}

            {/* Creating bar preview */}
            {isCreatingBar && creatingBarWidth > 10 && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: creatingBarLeft,
                        top: topOffset,
                        width: creatingBarWidth,
                        height: barHeight,
                        backgroundColor: 'rgba(86, 182, 194, 0.2)',
                        border: '1px solid rgba(86, 182, 194, 0.4)',
                    }}
                />
            )}

            {/* Milestones */}
            {milestones.map((milestone) => (
                <MilestoneMarker
                    key={milestone.id}
                    projectId={projectId}
                    milestone={milestone}
                    columns={columns}
                    columnWidth={columnWidth}
                    rowHeight={rowHeight}
                    color="#56b6c2"
                />
            ))}
        </div>
    );
}
