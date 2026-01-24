'use client';

/**
 * Date Picker Cell for Program Module
 * Feature 015 - Program Module Enhancements
 *
 * Popup date picker for activity start/end dates.
 * Based on MonthPicker.tsx pattern.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerCellProps {
    value: string | null;  // ISO date string YYYY-MM-DD
    onChange: (date: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function DatePickerCell({
    value,
    onChange,
    placeholder = '-',
    disabled = false,
    className = '',
}: DatePickerCellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            const d = new Date(value);
            return { year: d.getFullYear(), month: d.getMonth() };
        }
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

    // Calculate dropdown position when opening
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
            });
        }
    }, [isOpen]);

    // Parse value to Date
    const selectedDate = useMemo(() => {
        if (!value) return null;
        return new Date(value);
    }, [value]);

    // Format display value as DD/MM/YY
    const displayValue = useMemo(() => {
        if (!selectedDate) return null;
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = String(selectedDate.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }, [selectedDate]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update view when value changes
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            setViewDate({ year: d.getFullYear(), month: d.getMonth() });
        }
    }, [value]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const { year, month } = viewDate;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days: Array<{ date: Date | null; day: number | null }> = [];

        // Empty cells before first day
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: null, day: null });
        }

        // Days of month
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ date: new Date(year, month, d), day: d });
        }

        return days;
    }, [viewDate]);

    const handlePrevMonth = useCallback(() => {
        setViewDate(prev => {
            if (prev.month === 0) {
                return { year: prev.year - 1, month: 11 };
            }
            return { ...prev, month: prev.month - 1 };
        });
    }, []);

    const handleNextMonth = useCallback(() => {
        setViewDate(prev => {
            if (prev.month === 11) {
                return { year: prev.year + 1, month: 0 };
            }
            return { ...prev, month: prev.month + 1 };
        });
    }, []);

    const handleSelectDate = useCallback((date: Date) => {
        const isoDate = date.toISOString().split('T')[0];
        onChange(isoDate);
        setIsOpen(false);
    }, [onChange]);

    const handleToday = useCallback(() => {
        const today = new Date();
        const isoDate = today.toISOString().split('T')[0];
        onChange(isoDate);
        setIsOpen(false);
    }, [onChange]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-center gap-1 px-1 py-1
                    text-xs border-r border-[var(--color-border)]
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--color-bg-tertiary)] cursor-pointer'}
                    ${isOpen ? 'bg-[var(--color-bg-tertiary)]' : ''}
                `}
            >
                <span className={displayValue ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-muted)]'}>
                    {displayValue || placeholder}
                </span>
            </button>

            {/* Dropdown - fixed position to escape overflow containers */}
            {isOpen && dropdownPosition && (
                <div
                    className="fixed z-[100] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg p-2 w-[220px]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {/* Month/Year navigation */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-[var(--color-text-primary)]">
                            {MONTHS[viewDate.month]} {viewDate.year}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {DAYS.map(day => (
                            <div key={day} className="text-center text-[10px] text-[var(--color-text-muted)] py-0.5">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map((item, idx) => {
                            if (!item.date) {
                                return <div key={idx} className="w-6 h-6" />;
                            }

                            const isSelected = selectedDate &&
                                item.date.getFullYear() === selectedDate.getFullYear() &&
                                item.date.getMonth() === selectedDate.getMonth() &&
                                item.date.getDate() === selectedDate.getDate();

                            const isToday = item.date.getTime() === today.getTime();

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectDate(item.date!)}
                                    className={`
                                        w-6 h-6 text-[10px] rounded transition-colors
                                        ${isSelected
                                            ? 'bg-[var(--color-accent-teal)] text-white'
                                            : isToday
                                            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent-teal)] ring-1 ring-[var(--color-accent-teal)]/30'
                                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'}
                                    `}
                                >
                                    {item.day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick actions */}
                    <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex gap-2">
                        <button
                            onClick={handleToday}
                            className="flex-1 px-2 py-1 text-[10px] text-[var(--color-accent-teal)] hover:bg-[var(--color-bg-tertiary)] rounded"
                        >
                            Today
                        </button>
                        {value && (
                            <button
                                onClick={() => {
                                    onChange(null);
                                    setIsOpen(false);
                                }}
                                className="flex-1 px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] rounded"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DatePickerCell;
