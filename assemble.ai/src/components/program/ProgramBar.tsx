'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useUpdateActivity } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import type { ProgramActivity, ZoomLevel } from '@/types/program';

interface ProgramBarProps {
    projectId: string;
    activity: ProgramActivity;
    columns: Array<{ date: Date; label: string }>;
    columnWidth: number;
    zoomLevel: ZoomLevel;
    rowHeight: number;
    onStartLinkDrag?: (activityId: string, end: 'start' | 'end', clientX: number, clientY: number) => void;
    isSelected?: boolean;
    onSelect?: () => void;
}

// Calculate position based on date within timeline
function getPositionForDate(date: Date, columns: Array<{ date: Date }>, columnWidth: number, zoomLevel: ZoomLevel): number {
    if (columns.length === 0) return 0;

    const targetDate = date.getTime();

    // Find which column this date falls into
    for (let i = 0; i < columns.length; i++) {
        const colStart = columns[i].date.getTime();
        const colEnd = i < columns.length - 1
            ? columns[i + 1].date.getTime()
            : colStart + (zoomLevel === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);

        if (targetDate >= colStart && targetDate < colEnd) {
            // Calculate fractional position within column
            const fraction = (targetDate - colStart) / (colEnd - colStart);
            return i * columnWidth + fraction * columnWidth;
        }
    }

    // If date is after all columns, return end position
    if (targetDate >= columns[columns.length - 1].date.getTime()) {
        return columns.length * columnWidth;
    }

    // If date is before all columns, return start
    return 0;
}

// Parse date from ISO string
function parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    return new Date(dateStr);
}

// Format date to ISO string (date only)
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function ProgramBar({
    projectId,
    activity,
    columns,
    columnWidth,
    zoomLevel,
    rowHeight,
    onStartLinkDrag,
    isSelected,
    onSelect,
}: ProgramBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizingLeft, setIsResizingLeft] = useState(false);
    const [isResizingRight, setIsResizingRight] = useState(false);

    // Use refs to avoid stale closures in event handlers
    const dragStateRef = useRef({
        startX: 0,
        originalLeft: 0,
        originalWidth: 0,
    });

    const updateActivity = useUpdateActivity(projectId);
    const refetch = useRefetch();

    const startDate = parseDate(activity.startDate);
    const endDate = parseDate(activity.endDate);

    if (!startDate || !endDate || columns.length === 0) {
        return null;
    }

    const left = getPositionForDate(startDate, columns, columnWidth, zoomLevel);
    const right = getPositionForDate(endDate, columns, columnWidth, zoomLevel);
    const width = Math.max(right - left, 8); // Minimum width

    const barHeight = 20;
    const topOffset = (rowHeight - barHeight) / 2;

    // Get date from X position - stable reference
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

    // Handle drag start (move entire bar)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isResizingLeft || isResizingRight) return;
        e.preventDefault();
        e.stopPropagation();

        // Store initial state in ref
        dragStateRef.current = {
            startX: e.clientX,
            originalLeft: left,
            originalWidth: width,
        };

        setIsDragging(true);

        const handleMove = (moveEvent: MouseEvent) => {
            const { startX, originalLeft: origLeft } = dragStateRef.current;
            const delta = moveEvent.clientX - startX;
            const newLeft = Math.max(0, origLeft + delta);

            // Update bar position visually (optimistic)
            if (barRef.current) {
                barRef.current.style.left = `${newLeft}px`;
            }
        };

        const handleUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);

            const { startX, originalLeft: origLeft, originalWidth: origWidth } = dragStateRef.current;
            const delta = upEvent.clientX - startX;

            // Only update if actually dragged (not just clicked)
            if (Math.abs(delta) < 3) {
                // Reset visual position on click without drag
                if (barRef.current) {
                    barRef.current.style.left = `${origLeft}px`;
                }
                setIsDragging(false);
                // Treat as click - select this bar
                onSelect?.();
                return;
            }

            const newLeft = Math.max(0, origLeft + delta);
            const newStartDate = getDateFromPosition(newLeft);
            const newEndDate = getDateFromPosition(newLeft + origWidth);

            // Free-form dragging - no snap-to-week constraint
            updateActivity.mutate({
                id: activity.id,
                startDate: formatDate(newStartDate),
                endDate: formatDate(newEndDate),
            }, refetch);

            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    // Handle resize start (left edge)
    const handleResizeLeftStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragStateRef.current = {
            startX: e.clientX,
            originalLeft: left,
            originalWidth: width,
        };

        setIsResizingLeft(true);

        const handleMove = (moveEvent: MouseEvent) => {
            const { startX, originalLeft: origLeft, originalWidth: origWidth } = dragStateRef.current;
            const delta = moveEvent.clientX - startX;
            const newLeft = Math.max(0, Math.min(origLeft + delta, origLeft + origWidth - 16));
            const newWidth = origWidth - (newLeft - origLeft);

            if (barRef.current) {
                barRef.current.style.left = `${newLeft}px`;
                barRef.current.style.width = `${newWidth}px`;
            }
        };

        const handleUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);

            const { startX, originalLeft: origLeft, originalWidth: origWidth } = dragStateRef.current;
            const delta = upEvent.clientX - startX;

            // Only update if actually dragged
            if (Math.abs(delta) < 3) {
                if (barRef.current) {
                    barRef.current.style.left = `${origLeft}px`;
                    barRef.current.style.width = `${origWidth}px`;
                }
                setIsResizingLeft(false);
                return;
            }

            const newLeft = Math.max(0, Math.min(origLeft + delta, origLeft + origWidth - 16));
            const newStartDate = getDateFromPosition(newLeft);

            // Free-form dragging - no snap-to-week constraint
            updateActivity.mutate({
                id: activity.id,
                startDate: formatDate(newStartDate),
            }, refetch);

            setIsResizingLeft(false);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    // Handle resize start (right edge)
    const handleResizeRightStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragStateRef.current = {
            startX: e.clientX,
            originalLeft: left,
            originalWidth: width,
        };

        setIsResizingRight(true);

        const handleMove = (moveEvent: MouseEvent) => {
            const { startX, originalWidth: origWidth } = dragStateRef.current;
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.max(16, origWidth + delta);

            if (barRef.current) {
                barRef.current.style.width = `${newWidth}px`;
            }
        };

        const handleUp = (upEvent: MouseEvent) => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);

            const { startX, originalLeft: origLeft, originalWidth: origWidth } = dragStateRef.current;
            const delta = upEvent.clientX - startX;

            // Only update if actually dragged
            if (Math.abs(delta) < 3) {
                if (barRef.current) {
                    barRef.current.style.width = `${origWidth}px`;
                }
                setIsResizingRight(false);
                return;
            }

            const newWidth = Math.max(16, origWidth + delta);
            const newEndDate = getDateFromPosition(origLeft + newWidth);

            // Free-form dragging - no snap-to-week constraint
            updateActivity.mutate({
                id: activity.id,
                endDate: formatDate(newEndDate),
            }, refetch);

            setIsResizingRight(false);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    // Handle starting a link drag (for creating dependencies)
    const handleLinkDragStart = (end: 'start' | 'end') => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onStartLinkDrag?.(activity.id, end, e.clientX, e.clientY);
    };

    return (
        <div
            ref={barRef}
            className={`absolute ${
                isDragging || isResizingLeft || isResizingRight
                    ? 'opacity-80 ring-2 ring-[var(--color-text-primary)]/30'
                    : isSelected
                    ? 'ring-2 ring-[var(--color-accent-teal)] ring-offset-1 ring-offset-[var(--color-bg-primary)]'
                    : 'hover:brightness-110'
            } ${
                isSelected
                    ? 'bg-[var(--color-accent-teal)]/35 border border-[var(--color-accent-teal)]/70'
                    : 'bg-[var(--color-accent-teal)]/20 border border-[var(--color-accent-teal)]/40'
            }`}
            style={{
                left,
                top: topOffset,
                width,
                height: barHeight,
                cursor: 'move',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Left resize handle - wider hit area */}
            <div
                className="absolute top-0 bottom-0 hover:bg-[var(--color-text-primary)]/30 z-10"
                style={{
                    left: -2,
                    width: 8,
                    cursor: 'ew-resize',
                }}
                onMouseDown={handleResizeLeftStart}
            />

            {/* Right resize handle - wider hit area */}
            <div
                className="absolute top-0 bottom-0 hover:bg-[var(--color-text-primary)]/30 z-10"
                style={{
                    right: -2,
                    width: 8,
                    cursor: 'ew-resize',
                }}
                onMouseDown={handleResizeRightStart}
            />

            {/* Link connector - left (for SS dependencies) */}
            <div
                className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-text-primary)]/50 opacity-0 hover:opacity-100 hover:bg-[var(--color-text-primary)] cursor-crosshair z-20"
                title="Drag to create Start-to-Start dependency"
                onMouseDown={handleLinkDragStart('start')}
            />

            {/* Link connector - right (for FS dependencies) */}
            <div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-text-primary)]/50 opacity-0 hover:opacity-100 hover:bg-[var(--color-text-primary)] cursor-crosshair z-20"
                title="Drag to create Finish-to-Start dependency"
                onMouseDown={handleLinkDragStart('end')}
            />

            {/* Activity name (only show if bar is wide enough) */}
            {width > 60 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--color-accent-teal)] font-medium truncate px-3 pointer-events-none">
                    {activity.name}
                </span>
            )}
        </div>
    );
}
