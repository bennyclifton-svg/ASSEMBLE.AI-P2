'use client';

import React, { useState, useMemo, createContext, useContext } from 'react';
import { useProgram, buildActivityTree } from '@/lib/hooks/use-program';
import { ProgramToolbar } from './ProgramToolbar';
import { ProgramTable } from './ProgramTable';
import type { ZoomLevel } from '@/types/program';

// Context for refetch function
const RefetchContext = createContext<() => void>(() => {});
export const useRefetch = () => useContext(RefetchContext);

interface ProgramPanelProps {
    projectId: string;
}

export function ProgramPanel({ projectId }: ProgramPanelProps) {
    const { data, isLoading, error, refetch } = useProgram(projectId);
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');

    // Build hierarchical tree from flat activities
    const activityTree = useMemo(() => {
        if (!data?.activities) return [];
        return buildActivityTree(data.activities);
    }, [data?.activities]);

    // Calculate date range from activities
    const dateRange = useMemo(() => {
        const now = new Date();

        if (!data?.activities) {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 12, 0);
            return { start, end };
        }

        const dates: Date[] = [];
        for (const activity of data.activities) {
            if (activity.startDate) dates.push(new Date(activity.startDate));
            if (activity.endDate) dates.push(new Date(activity.endDate));
        }
        for (const milestone of data.milestones || []) {
            if (milestone.date) dates.push(new Date(milestone.date));
        }

        if (dates.length === 0) {
            // Default to current month + 12 months
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 12, 0);
            return { start, end };
        }

        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        let maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        // Ensure timeline extends at least 6 months from today
        const sixMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 6, 0);
        if (maxDate < sixMonthsFromNow) {
            maxDate = sixMonthsFromNow;
        }

        // Add padding (1 week before and 1 month after)
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setMonth(maxDate.getMonth() + 1);

        return { start: minDate, end: maxDate };
    }, [data?.activities, data?.milestones]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
                <div className="text-sm text-gray-400">Loading program...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
                <div className="text-sm text-red-400">Failed to load program</div>
            </div>
        );
    }

    return (
        <RefetchContext.Provider value={refetch}>
            <div className="flex h-full flex-col bg-[#1e1e1e]">
                <ProgramToolbar
                    projectId={projectId}
                    zoomLevel={zoomLevel}
                    onZoomChange={setZoomLevel}
                />
                <div className="flex-1 overflow-hidden">
                    <ProgramTable
                        projectId={projectId}
                        activities={activityTree}
                        allActivities={data?.activities || []}
                        dependencies={data?.dependencies || []}
                        milestones={data?.milestones || []}
                        dateRange={dateRange}
                        zoomLevel={zoomLevel}
                    />
                </div>
            </div>
        </RefetchContext.Provider>
    );
}
