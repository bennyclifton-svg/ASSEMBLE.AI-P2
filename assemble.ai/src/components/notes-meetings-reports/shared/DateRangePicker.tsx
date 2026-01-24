/**
 * Date Range Picker Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A shared component for selecting reporting period date ranges.
 */

'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
    startDate: string | null;
    endDate: string | null;
    onStartDateChange: (date: string | null) => void;
    onEndDateChange: (date: string | null) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    label = 'Reporting Period',
    className,
    disabled = false,
}: DateRangePickerProps) {
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {label && (
                <Label className="text-sm text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {label}:
                </Label>
            )}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">From</span>
                    <Input
                        type="date"
                        value={startDate || ''}
                        onChange={(e) => onStartDateChange(e.target.value || null)}
                        disabled={disabled}
                        className="w-auto h-8 text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">To</span>
                    <Input
                        type="date"
                        value={endDate || ''}
                        onChange={(e) => onEndDateChange(e.target.value || null)}
                        disabled={disabled}
                        className="w-auto h-8 text-sm"
                        min={startDate || undefined}
                    />
                </div>
            </div>
        </div>
    );
}

export default DateRangePicker;
