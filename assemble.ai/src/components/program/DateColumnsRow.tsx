'use client';

/**
 * Date Columns Row for Program Module
 * Feature 015 - Program Module Enhancements
 *
 * Renders Start and End date cells for a single activity row.
 */

import { useCallback } from 'react';
import { useUpdateActivity } from '@/lib/hooks/use-program';
import { useRefetch } from './ProgramPanel';
import { DatePickerCell } from './DatePickerCell';
import type { ProgramActivity } from '@/types/program';

interface DateColumnsRowProps {
    projectId: string;
    activity: ProgramActivity;
    rowHeight: number;
    startDateWidth: number;
    endDateWidth: number;
}

export function DateColumnsRow({
    projectId,
    activity,
    rowHeight,
    startDateWidth,
    endDateWidth,
}: DateColumnsRowProps) {
    const updateActivity = useUpdateActivity(projectId);
    const refetch = useRefetch();

    const handleStartDateChange = useCallback((date: string | null) => {
        updateActivity.mutate({
            id: activity.id,
            startDate: date,
        }, refetch);
    }, [updateActivity, activity.id, refetch]);

    const handleEndDateChange = useCallback((date: string | null) => {
        updateActivity.mutate({
            id: activity.id,
            endDate: date,
        }, refetch);
    }, [updateActivity, activity.id, refetch]);

    return (
        <div
            className="flex border-b border-[var(--color-border)]"
            style={{ height: rowHeight }}
        >
            {/* Start date column */}
            <div style={{ width: startDateWidth }}>
                <DatePickerCell
                    value={activity.startDate}
                    onChange={handleStartDateChange}
                    placeholder="-"
                    className="h-full"
                />
            </div>

            {/* End date column */}
            <div style={{ width: endDateWidth }}>
                <DatePickerCell
                    value={activity.endDate}
                    onChange={handleEndDateChange}
                    placeholder="-"
                    className="h-full"
                />
            </div>
        </div>
    );
}

export default DateColumnsRow;
