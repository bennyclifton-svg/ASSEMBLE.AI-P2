'use client';

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ProgramRow } from './ProgramRow';
import { DependencyArrows } from './DependencyArrows';
import { useCreateDependency, useDeleteDependency, useDeleteActivity } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import type { ProgramActivity, ProgramDependency, ProgramMilestone, ZoomLevel } from '@/types/program';

interface LinkingState {
    fromActivityId: string;
    fromEnd: 'start' | 'end';
    mouseX: number;
    mouseY: number;
}

interface ProgramTableProps {
    projectId: string;
    activities: ProgramActivity[];
    allActivities: ProgramActivity[];
    dependencies: ProgramDependency[];
    milestones: ProgramMilestone[];
    dateRange: { start: Date; end: Date };
    zoomLevel: ZoomLevel;
}

// Generate timeline columns based on date range and zoom level
function generateTimelineColumns(start: Date, end: Date, zoomLevel: ZoomLevel) {
    const columns: Array<{ date: Date; label: string; isFirstOfMonth: boolean }> = [];
    const current = new Date(start);

    // Align to start of week (Monday) or month
    if (zoomLevel === 'week') {
        const day = current.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
        current.setDate(current.getDate() + diff);
    } else {
        current.setDate(1);
    }

    while (current <= end) {
        const isFirstOfMonth = current.getDate() <= 7;
        columns.push({
            date: new Date(current),
            label: zoomLevel === 'week'
                ? current.getDate().toString()
                : current.toLocaleDateString('en-US', { month: 'short' }),
            isFirstOfMonth,
        });

        if (zoomLevel === 'week') {
            current.setDate(current.getDate() + 7);
        } else {
            current.setMonth(current.getMonth() + 1);
        }
    }

    return columns;
}

// Group columns by month for header
function groupColumnsByMonth(columns: Array<{ date: Date; label: string }>, zoomLevel: ZoomLevel) {
    if (zoomLevel === 'month') {
        return columns.map((col) => ({
            month: col.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            span: 1,
        }));
    }

    const groups: Array<{ month: string; span: number }> = [];
    let currentMonth = '';
    let currentSpan = 0;

    for (const col of columns) {
        const month = col.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (month === currentMonth) {
            currentSpan++;
        } else {
            if (currentMonth) {
                groups.push({ month: currentMonth, span: currentSpan });
            }
            currentMonth = month;
            currentSpan = 1;
        }
    }
    if (currentMonth) {
        groups.push({ month: currentMonth, span: currentSpan });
    }

    return groups;
}

// Flatten the tree while respecting collapsed state
function flattenVisibleActivities(activities: ProgramActivity[]): ProgramActivity[] {
    const result: ProgramActivity[] = [];

    function traverse(items: ProgramActivity[], depth: number = 0) {
        for (const item of items) {
            result.push({ ...item, sortOrder: depth }); // Use sortOrder to store depth temporarily
            if (item.children && item.children.length > 0 && !item.collapsed) {
                traverse(item.children, depth + 1);
            }
        }
    }

    traverse(activities);
    return result;
}

export function ProgramTable({
    projectId,
    activities,
    allActivities,
    dependencies,
    milestones,
    dateRange,
    zoomLevel,
}: ProgramTableProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const timelineAreaRef = useRef<HTMLDivElement>(null);
    const [linkingState, setLinkingState] = useState<LinkingState | null>(null);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

    const createDependency = useCreateDependency(projectId);
    const deleteDependency = useDeleteDependency(projectId);
    const deleteActivity = useDeleteActivity(projectId);
    const refetch = useRefetch();

    // Handle deleting a dependency
    const handleDeleteDependency = useCallback((dependencyId: string) => {
        deleteDependency.mutate(dependencyId, refetch);
    }, [deleteDependency, refetch]);

    // Generate timeline columns
    const columns = useMemo(
        () => generateTimelineColumns(dateRange.start, dateRange.end, zoomLevel),
        [dateRange.start, dateRange.end, zoomLevel]
    );

    // Group columns by month for header
    const monthGroups = useMemo(
        () => groupColumnsByMonth(columns, zoomLevel),
        [columns, zoomLevel]
    );

    // Flatten activities respecting collapsed state
    const visibleActivities = useMemo(
        () => flattenVisibleActivities(activities),
        [activities]
    );

    // Today's position
    const today = new Date();
    const todayIndex = columns.findIndex((col) => {
        const colDate = col.date;
        const nextDate = new Date(colDate);
        if (zoomLevel === 'week') {
            nextDate.setDate(nextDate.getDate() + 7);
        } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        return today >= colDate && today < nextDate;
    });

    const columnWidth = zoomLevel === 'week' ? 40 : 80;
    const activityColumnWidth = 200;
    const rowHeight = 32;

    // Handle starting a link drag from a bar
    const handleStartLinkDrag = useCallback((activityId: string, end: 'start' | 'end', clientX: number, clientY: number) => {
        setLinkingState({
            fromActivityId: activityId,
            fromEnd: end,
            mouseX: clientX,
            mouseY: clientY,
        });

        const handleMouseMove = (e: MouseEvent) => {
            setLinkingState((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
        };

        const handleMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Find if we're over another bar
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const barElement = target?.closest('[data-activity-id]');

            if (barElement) {
                const toActivityId = barElement.getAttribute('data-activity-id');
                if (toActivityId && toActivityId !== activityId) {
                    // Determine dependency type based on which end we started from
                    // fromEnd === 'end' means Finish-to-Start (FS)
                    // fromEnd === 'start' means Start-to-Start (SS)
                    const depType = end === 'end' ? 'FS' : 'SS';

                    createDependency.mutate({
                        fromActivityId: activityId,
                        toActivityId,
                        type: depType,
                    }, refetch);
                }
            }

            setLinkingState(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [createDependency, refetch]);

    // Calculate line position for visual feedback during linking
    const getLinkLine = useCallback(() => {
        if (!linkingState || !timelineAreaRef.current) return null;

        const rect = timelineAreaRef.current.getBoundingClientRect();
        const fromActivity = visibleActivities.find((a) => a.id === linkingState.fromActivityId);
        if (!fromActivity) return null;

        const fromIndex = visibleActivities.indexOf(fromActivity);
        const fromY = fromIndex * rowHeight + rowHeight / 2;

        // Calculate X based on the activity's start/end date
        let fromX = 0;
        if (linkingState.fromEnd === 'end' && fromActivity.endDate) {
            const endDate = new Date(fromActivity.endDate);
            for (let i = 0; i < columns.length; i++) {
                const colStart = columns[i].date.getTime();
                const colEnd = i < columns.length - 1
                    ? columns[i + 1].date.getTime()
                    : colStart + (zoomLevel === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
                if (endDate.getTime() >= colStart && endDate.getTime() < colEnd) {
                    const fraction = (endDate.getTime() - colStart) / (colEnd - colStart);
                    fromX = i * columnWidth + fraction * columnWidth;
                    break;
                }
            }
        } else if (linkingState.fromEnd === 'start' && fromActivity.startDate) {
            const startDate = new Date(fromActivity.startDate);
            for (let i = 0; i < columns.length; i++) {
                const colStart = columns[i].date.getTime();
                const colEnd = i < columns.length - 1
                    ? columns[i + 1].date.getTime()
                    : colStart + (zoomLevel === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
                if (startDate.getTime() >= colStart && startDate.getTime() < colEnd) {
                    const fraction = (startDate.getTime() - colStart) / (colEnd - colStart);
                    fromX = i * columnWidth + fraction * columnWidth;
                    break;
                }
            }
        }

        const toX = linkingState.mouseX - rect.left + timelineAreaRef.current.scrollLeft;
        const toY = linkingState.mouseY - rect.top + timelineAreaRef.current.scrollTop;

        return { fromX, fromY, toX, toY };
    }, [linkingState, visibleActivities, columns, columnWidth, zoomLevel, rowHeight]);

    // Sync horizontal scroll between timeline header and body
    useEffect(() => {
        const timelineArea = timelineAreaRef.current;
        const headerArea = scrollContainerRef.current;
        if (!timelineArea || !headerArea) return;

        const handleScroll = () => {
            headerArea.scrollLeft = timelineArea.scrollLeft;
        };

        timelineArea.addEventListener('scroll', handleScroll);
        return () => timelineArea.removeEventListener('scroll', handleScroll);
    }, []);

    // Keyboard handler for delete and deselect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete or Backspace to delete selected activity
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedActivityId) {
                // Prevent if user is typing in an input
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }
                e.preventDefault();
                if (confirm('Delete this activity and all its children, dependencies, and milestones?')) {
                    deleteActivity.mutate(selectedActivityId, () => {
                        setSelectedActivityId(null);
                        refetch();
                    });
                }
            }
            // Escape to deselect
            if (e.key === 'Escape') {
                setSelectedActivityId(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedActivityId, deleteActivity, refetch]);

    // Handle selecting an activity
    const handleSelectActivity = useCallback((activityId: string | null) => {
        setSelectedActivityId(activityId);
    }, []);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex border-b border-[#3e3e42] bg-[#252526]">
                {/* Activity column header */}
                <div
                    className="shrink-0 border-r border-[#3e3e42] px-3 py-2 text-xs font-medium text-gray-400"
                    style={{ width: activityColumnWidth }}
                >
                    Activity
                </div>

                {/* Timeline header */}
                <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
                    <div className="flex flex-col" style={{ minWidth: columns.length * columnWidth }}>
                        {/* Month row */}
                        <div className="flex border-b border-[#3e3e42]">
                            {monthGroups.map((group, i) => (
                                <div
                                    key={i}
                                    className="shrink-0 border-r border-[#3e3e42] px-2 py-1 text-center text-xs font-medium text-gray-300"
                                    style={{ width: columnWidth * group.span }}
                                >
                                    {group.month}
                                </div>
                            ))}
                        </div>

                        {/* Week/Day row */}
                        {zoomLevel === 'week' && (
                            <div className="flex">
                                {columns.map((col, i) => (
                                    <div
                                        key={i}
                                        className={`shrink-0 border-r border-[#3e3e42] px-1 py-1 text-center text-xs text-gray-500 ${
                                            i === todayIndex ? 'bg-[#0e639c]/20' : ''
                                        }`}
                                        style={{ width: columnWidth }}
                                    >
                                        {col.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Activity column (sticky) */}
                <div
                    className="shrink-0 overflow-y-auto border-r border-[#3e3e42] bg-[#1e1e1e]"
                    style={{ width: activityColumnWidth }}
                >
                    {visibleActivities.map((activity) => (
                        <ProgramRow
                            key={activity.id}
                            projectId={projectId}
                            activity={activity}
                            depth={activity.sortOrder} // We stored depth in sortOrder temporarily
                            hasChildren={
                                allActivities.some((a) => a.parentId === activity.id)
                            }
                            columns={columns}
                            columnWidth={columnWidth}
                            zoomLevel={zoomLevel}
                            milestones={milestones.filter((m) => m.activityId === activity.id)}
                            isNameColumn={true}
                            allActivities={allActivities}
                        />
                    ))}

                    {visibleActivities.length === 0 && (
                        <div className="px-3 py-8 text-center text-xs text-gray-500">
                            No activities yet. Click "Add Activity" or insert a template to get started.
                        </div>
                    )}
                </div>

                {/* Timeline area (scrollable) */}
                <div ref={timelineAreaRef} className="relative flex-1 overflow-auto">
                    {/* Today marker */}
                    {todayIndex >= 0 && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10"
                            style={{ left: todayIndex * columnWidth + columnWidth / 2 }}
                        />
                    )}

                    {/* Rows */}
                    <div style={{ minWidth: columns.length * columnWidth }}>
                        {visibleActivities.map((activity) => (
                            <ProgramRow
                                key={activity.id}
                                projectId={projectId}
                                activity={activity}
                                depth={activity.sortOrder}
                                hasChildren={
                                    allActivities.some((a) => a.parentId === activity.id)
                                }
                                columns={columns}
                                columnWidth={columnWidth}
                                zoomLevel={zoomLevel}
                                milestones={milestones.filter((m) => m.activityId === activity.id)}
                                isNameColumn={false}
                                allActivities={allActivities}
                                onStartLinkDrag={handleStartLinkDrag}
                                selectedActivityId={selectedActivityId}
                                onSelectActivity={handleSelectActivity}
                            />
                        ))}

                        {/* Dependency arrows overlay */}
                        <DependencyArrows
                            activities={visibleActivities}
                            dependencies={dependencies}
                            columns={columns}
                            columnWidth={columnWidth}
                            zoomLevel={zoomLevel}
                            rowHeight={rowHeight}
                            onDeleteDependency={handleDeleteDependency}
                        />

                        {/* Linking visual feedback */}
                        {linkingState && (() => {
                            const line = getLinkLine();
                            if (!line) return null;
                            return (
                                <svg
                                    className="absolute inset-0 pointer-events-none z-20"
                                    style={{ width: columns.length * columnWidth, height: visibleActivities.length * rowHeight }}
                                >
                                    <line
                                        x1={line.fromX}
                                        y1={line.fromY}
                                        x2={line.toX}
                                        y2={line.toY}
                                        stroke="#0e639c"
                                        strokeWidth="2"
                                        strokeDasharray="4,4"
                                    />
                                    <circle
                                        cx={line.fromX}
                                        cy={line.fromY}
                                        r="4"
                                        fill="#0e639c"
                                    />
                                </svg>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
