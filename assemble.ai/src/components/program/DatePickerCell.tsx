'use client';

/**
 * Date Picker Cell for Program Module
 * Feature 015 - Program Module Enhancements
 *
 * Popup date picker for activity start/end dates.
 * Based on MonthPicker.tsx pattern.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

    const handleTriggerClick = useCallback(() => {
        if (disabled) return;

        if (!isOpen && value) {
            const d = new Date(value);
            setViewDate({ year: d.getFullYear(), month: d.getMonth() });
        }

        setIsOpen((current) => !current);
    }, [disabled, isOpen, value]);

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
        <div ref={containerRef} className={`relative ${className}`} style={{ fontFamily: 'var(--sw-font-mono)' }}>
            <button
                ref={triggerRef}
                onClick={handleTriggerClick}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-center gap-1 px-1 py-1
                    text-[11px] border-r border-[var(--sw-rule-2)]
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--sw-paper)] cursor-pointer'}
                    ${isOpen ? 'bg-[var(--sw-paper)]' : ''}
                `}
            >
                <span className={displayValue ? 'text-[var(--sw-ink)]' : 'text-[var(--sw-muted)]'}>
                    {displayValue || placeholder}
                </span>
            </button>

            {/* Dropdown - fixed position to escape overflow containers */}
            {isOpen && dropdownPosition && (
                <div
                    className="fixed z-[100] w-[220px] border border-[var(--sw-rule)] bg-white p-2"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {/* Month/Year navigation */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1 text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-[var(--sw-ink)]">
                            {MONTHS[viewDate.month]} {viewDate.year}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-1 text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {DAYS.map(day => (
                            <div key={day} className="py-0.5 text-center text-[10px] text-[var(--sw-muted)]">
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
                                        w-6 h-6 text-[10px] transition-colors
                                        ${isSelected
                                            ? 'bg-[var(--sw-ink)] text-[var(--sw-paper)]'
                                            : isToday
                                            ? 'bg-[var(--sw-rose-tint)] text-[var(--sw-rose-dk)] ring-1 ring-[var(--sw-rose)]'
                                            : 'text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]'}
                                    `}
                                >
                                    {item.day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick actions */}
                    <div className="mt-2 flex gap-2 border-t border-[var(--sw-rule-2)] pt-2">
                        <button
                            onClick={handleToday}
                            className="flex-1 px-2 py-1 text-[10px] text-[var(--sw-rose-dk)] hover:bg-[var(--sw-rose-tint)]"
                        >
                            Today
                        </button>
                        {value && (
                            <button
                                onClick={() => {
                                    onChange(null);
                                    setIsOpen(false);
                                }}
                                className="flex-1 px-2 py-1 text-[10px] text-[var(--sw-muted)] hover:bg-[var(--sw-paper)] hover:text-[var(--sw-ink)]"
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
