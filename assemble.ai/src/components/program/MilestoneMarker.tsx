'use client';

import React, { useState, useRef } from 'react';
import { useDeleteMilestone } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import type { ProgramMilestone } from '@/types/program';

interface MilestoneMarkerProps {
    projectId: string;
    milestone: ProgramMilestone;
    columns: Array<{ date: Date; label: string }>;
    columnWidth: number;
    rowHeight: number;
    color: string;
}

// Calculate position based on date within timeline
function getPositionForDate(date: Date, columns: Array<{ date: Date }>, columnWidth: number): number {
    if (columns.length === 0) return 0;

    // Find which column this date falls into
    for (let i = 0; i < columns.length; i++) {
        const colStart = columns[i].date.getTime();
        const colEnd = i < columns.length - 1
            ? columns[i + 1].date.getTime()
            : colStart + 7 * 24 * 60 * 60 * 1000; // Default to week

        if (date.getTime() >= colStart && date.getTime() < colEnd) {
            // Calculate fractional position within column
            const fraction = (date.getTime() - colStart) / (colEnd - colStart);
            return i * columnWidth + fraction * columnWidth;
        }
    }

    // If date is after all columns, return end position
    if (date.getTime() >= columns[columns.length - 1].date.getTime()) {
        return columns.length * columnWidth;
    }

    return 0;
}

export function MilestoneMarker({
    projectId,
    milestone,
    columns,
    columnWidth,
    rowHeight,
    color,
}: MilestoneMarkerProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const markerRef = useRef<HTMLDivElement>(null);

    const deleteMilestone = useDeleteMilestone(projectId);
    const refetch = useRefetch();

    const date = new Date(milestone.date);
    const left = getPositionForDate(date, columns, columnWidth);

    const markerSize = 12;
    const topOffset = (rowHeight - markerSize) / 2;

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete milestone "${milestone.name}"?`)) {
            deleteMilestone.mutate(milestone.id, refetch);
        }
    };

    return (
        <div
            ref={markerRef}
            className="absolute cursor-pointer"
            style={{
                left: left - markerSize / 2,
                top: topOffset,
                width: markerSize,
                height: markerSize,
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onDoubleClick={handleDoubleClick}
        >
            {/* Diamond shape */}
            <div
                className="absolute inset-0 transform rotate-45 border-2"
                style={{
                    backgroundColor: color,
                    borderColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
            />

            {/* Tooltip */}
            {showTooltip && (
                <div
                    className="absolute z-20 px-2 py-1 text-xs text-white bg-[#1e1e1e] border border-[#3e3e42] rounded shadow-lg whitespace-nowrap"
                    style={{
                        bottom: markerSize + 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="font-medium">{milestone.name}</div>
                    <div className="text-gray-400">
                        {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
