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
                <Label
                    className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--sw-muted)]"
                    style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.08em', textTransform: 'lowercase' }}
                >
                    <Calendar className="h-4 w-4" />
                    {label}:
                </Label>
            )}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--sw-muted)]">from</span>
                    <Input
                        type="date"
                        value={startDate || ''}
                        onChange={(e) => onStartDateChange(e.target.value || null)}
                        disabled={disabled}
                        className="h-8 w-auto rounded-none border-[var(--sw-rule)] bg-white text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--sw-muted)]">to</span>
                    <Input
                        type="date"
                        value={endDate || ''}
                        onChange={(e) => onEndDateChange(e.target.value || null)}
                        disabled={disabled}
                        className="h-8 w-auto rounded-none border-[var(--sw-rule)] bg-white text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        min={startDate || undefined}
                    />
                </div>
            </div>
        </div>
    );
}

export default DateRangePicker;
