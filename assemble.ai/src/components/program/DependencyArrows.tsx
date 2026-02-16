'use client';

import React, { useMemo, useState } from 'react';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import type { ProgramActivity, ProgramDependency, ZoomLevel } from '@/types/program';

interface DependencyArrowsProps {
    activities: ProgramActivity[];
    dependencies: ProgramDependency[];
    columns: Array<{ date: Date; label: string }>;
    columnWidth: number;
    zoomLevel: ZoomLevel;
    rowHeight: number;
    onDeleteDependency?: (dependencyId: string) => void;
}

// Calculate X position for a date
function getPositionForDate(
    date: Date,
    columns: Array<{ date: Date }>,
    columnWidth: number,
    zoomLevel: ZoomLevel
): number {
    if (columns.length === 0) return 0;

    for (let i = 0; i < columns.length; i++) {
        const colStart = columns[i].date.getTime();
        const colEnd = i < columns.length - 1
            ? columns[i + 1].date.getTime()
            : colStart + (zoomLevel === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);

        if (date.getTime() >= colStart && date.getTime() < colEnd) {
            const fraction = (date.getTime() - colStart) / (colEnd - colStart);
            return i * columnWidth + fraction * columnWidth;
        }
    }

    if (date.getTime() >= columns[columns.length - 1].date.getTime()) {
        return columns.length * columnWidth;
    }

    return 0;
}

export function DependencyArrows({
    activities,
    dependencies,
    columns,
    columnWidth,
    zoomLevel,
    rowHeight,
    onDeleteDependency,
}: DependencyArrowsProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Build activity index map for quick lookup
    const activityIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        activities.forEach((activity, index) => {
            map.set(activity.id, index);
        });
        return map;
    }, [activities]);

    // Calculate arrow paths
    const arrows = useMemo(() => {
        return dependencies
            .map((dep) => {
                const fromActivity = activities.find((a) => a.id === dep.fromActivityId);
                const toActivity = activities.find((a) => a.id === dep.toActivityId);

                if (!fromActivity || !toActivity) return null;

                const fromIndex = activityIndexMap.get(dep.fromActivityId);
                const toIndex = activityIndexMap.get(dep.toActivityId);

                if (fromIndex === undefined || toIndex === undefined) return null;

                // Get dates based on dependency type
                let fromDate: Date | null = null;
                let toDate: Date | null = null;

                switch (dep.type) {
                    case 'FS': // Finish-to-Start
                        fromDate = fromActivity.endDate ? new Date(fromActivity.endDate) : null;
                        toDate = toActivity.startDate ? new Date(toActivity.startDate) : null;
                        break;
                    case 'SS': // Start-to-Start
                        fromDate = fromActivity.startDate ? new Date(fromActivity.startDate) : null;
                        toDate = toActivity.startDate ? new Date(toActivity.startDate) : null;
                        break;
                    case 'FF': // Finish-to-Finish
                        fromDate = fromActivity.endDate ? new Date(fromActivity.endDate) : null;
                        toDate = toActivity.endDate ? new Date(toActivity.endDate) : null;
                        break;
                }

                if (!fromDate || !toDate) return null;

                const fromX = getPositionForDate(fromDate, columns, columnWidth, zoomLevel);
                const toX = getPositionForDate(toDate, columns, columnWidth, zoomLevel);
                const fromY = fromIndex * rowHeight + rowHeight / 2;
                const toY = toIndex * rowHeight + rowHeight / 2;

                return {
                    id: dep.id,
                    type: dep.type,
                    fromX,
                    fromY,
                    toX,
                    toY,
                };
            })
            .filter(Boolean) as Array<{
                id: string;
                type: string;
                fromX: number;
                fromY: number;
                toX: number;
                toY: number;
            }>;
    }, [activities, dependencies, activityIndexMap, columns, columnWidth, zoomLevel, rowHeight]);

    const handleClick = (id: string) => {
        if (onDeleteDependency) {
            setPendingDeleteId(id);
            setDeleteDialogOpen(true);
        }
    };

    const handleConfirmDelete = () => {
        if (pendingDeleteId && onDeleteDependency) {
            onDeleteDependency(pendingDeleteId);
            setPendingDeleteId(null);
        }
    };

    if (arrows.length === 0) return null;

    return (
        <>
        <svg
            className="absolute inset-0 z-5"
            style={{ width: columns.length * columnWidth, height: activities.length * rowHeight, pointerEvents: 'none' }}
        >
            {/* Define arrowhead markers */}
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 8 3, 0 6" fill="var(--color-text-muted)" />
                </marker>
                <marker
                    id="arrowhead-hover"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <polygon points="0 0, 8 3, 0 6" fill="var(--color-accent-coral)" />
                </marker>
            </defs>
            {arrows.map((arrow) => {
                const isHovered = hoveredId === arrow.id;

                // Professional Gantt-style routing based on dependency type
                // Key principle: route OUTSIDE bars, never through them
                let path: string;
                const horizontalGap = 15;

                const goingDown = arrow.toY > arrow.fromY;

                // Vertical routing should go through the gap between rows
                const midY = goingDown
                    ? arrow.fromY + rowHeight / 2 + 4  // Just below source row
                    : arrow.fromY - rowHeight / 2 - 4; // Just above source row

                if (arrow.type === 'FS') {
                    // FINISH-TO-START: Exit right from source end, enter left at target start
                    // Classic "waterfall" pattern - clean L-shape or S-shape

                    if (arrow.fromY === arrow.toY) {
                        // Same row - simple horizontal line
                        path = `M ${arrow.fromX} ${arrow.fromY} L ${arrow.toX} ${arrow.toY}`;
                    } else if (arrow.toX >= arrow.fromX + horizontalGap) {
                        // Target starts after source ends (normal case) - clean L-shape
                        // Go right from source, drop down, go to target
                        const dropX = arrow.fromX + horizontalGap;
                        path = `M ${arrow.fromX} ${arrow.fromY} ` +
                               `L ${dropX} ${arrow.fromY} ` +      // Exit right
                               `L ${dropX} ${arrow.toY} ` +        // Drop to target row
                               `L ${arrow.toX} ${arrow.toY}`;      // Enter target
                    } else {
                        // Target starts before source ends (need to route around)
                        // Go right, drop to gap, go left, drop to target, enter
                        const exitX = arrow.fromX + horizontalGap;
                        const entryX = arrow.toX - horizontalGap;
                        path = `M ${arrow.fromX} ${arrow.fromY} ` +
                               `L ${exitX} ${arrow.fromY} ` +      // Exit right
                               `L ${exitX} ${midY} ` +             // Drop to gap
                               `L ${entryX} ${midY} ` +            // Horizontal in gap
                               `L ${entryX} ${arrow.toY} ` +       // Drop to target row
                               `L ${arrow.toX} ${arrow.toY}`;      // Enter target
                    }
                } else if (arrow.type === 'SS') {
                    // START-TO-START: Exit LEFT from source start, enter left at target start
                    // Must go left first to avoid cutting through source bar

                    if (arrow.fromY === arrow.toY) {
                        // Same row - direct line (rare for SS)
                        path = `M ${arrow.fromX} ${arrow.fromY} L ${arrow.toX} ${arrow.toY}`;
                    } else {
                        // Different rows - exit LEFT, route through gap, enter from left
                        const exitX = Math.min(arrow.fromX, arrow.toX) - horizontalGap;
                        path = `M ${arrow.fromX} ${arrow.fromY} ` +
                               `L ${exitX} ${arrow.fromY} ` +      // Exit left from source
                               `L ${exitX} ${arrow.toY} ` +        // Drop/rise to target row
                               `L ${arrow.toX} ${arrow.toY}`;      // Enter target from left
                    }
                } else {
                    // FINISH-TO-FINISH: Exit right from source end, enter right at target end

                    if (arrow.fromY === arrow.toY) {
                        // Same row - direct line
                        path = `M ${arrow.fromX} ${arrow.fromY} L ${arrow.toX} ${arrow.toY}`;
                    } else {
                        // Different rows - exit right, route to right of both, enter from right
                        const exitX = Math.max(arrow.fromX, arrow.toX) + horizontalGap;
                        path = `M ${arrow.fromX} ${arrow.fromY} ` +
                               `L ${exitX} ${arrow.fromY} ` +      // Exit right from source
                               `L ${exitX} ${arrow.toY} ` +        // Drop/rise to target row
                               `L ${arrow.toX} ${arrow.toY}`;      // Enter target from right
                    }
                }

                const lineColor = isHovered ? 'var(--color-accent-coral)' : 'var(--color-text-muted)';

                return (
                    <g key={arrow.id}>
                        {/* Invisible wider hit area for easier clicking */}
                        <path
                            d={path}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="12"
                            style={{ cursor: onDeleteDependency ? 'pointer' : 'default', pointerEvents: 'auto' }}
                            onMouseEnter={() => setHoveredId(arrow.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => handleClick(arrow.id)}
                        />
                        {/* Visible line with arrowhead */}
                        <path
                            d={path}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth={isHovered ? 2 : 1.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeDasharray={arrow.type === 'FS' ? 'none' : '4,2'}
                            opacity={isHovered ? 1 : 0.7}
                            markerEnd={isHovered ? 'url(#arrowhead-hover)' : 'url(#arrowhead)'}
                            style={{ pointerEvents: 'none' }}
                        />
                        {/* Small dot at start point */}
                        <circle
                            cx={arrow.fromX}
                            cy={arrow.fromY}
                            r={isHovered ? 3.5 : 3}
                            fill={lineColor}
                            opacity={isHovered ? 1 : 0.7}
                            style={{ pointerEvents: 'none' }}
                        />
                    </g>
                );
            })}
        </svg>

        {/* Delete Confirmation Dialog */}
        <AuroraConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleConfirmDelete}
            title="Delete this dependency?"
        />
        </>
    );
}
