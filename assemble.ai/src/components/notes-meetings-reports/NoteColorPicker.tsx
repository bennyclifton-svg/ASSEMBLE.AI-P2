/**
 * NoteColorPicker Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Color picker with two modes:
 * - Default: Shows all 4 color dots
 * - Compact: Shows only selected color, expands on click
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { NoteColor } from '@/types/notes-meetings-reports';

const COLORS: { value: NoteColor; label: string; bgClass: string; ringClass: string }[] = [
    { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-300/50', ringClass: 'ring-yellow-400' },
    { value: 'blue', label: 'Blue', bgClass: 'bg-blue-300/50', ringClass: 'ring-blue-400' },
    { value: 'green', label: 'Green', bgClass: 'bg-green-300/50', ringClass: 'ring-green-400' },
    { value: 'pink', label: 'Pink', bgClass: 'bg-pink-300/50', ringClass: 'ring-pink-400' },
];

interface NoteColorPickerProps {
    selectedColor: NoteColor;
    onColorChange: (color: NoteColor) => void;
    /** Compact mode: shows single dot that expands on click */
    compact?: boolean;
    className?: string;
}

export function NoteColorPicker({
    selectedColor,
    onColorChange,
    compact = false,
    className,
}: NoteColorPickerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedColorData = COLORS.find((c) => c.value === selectedColor) || COLORS[0];

    // Close on click outside (compact mode only)
    useEffect(() => {
        if (!compact || !isExpanded) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [compact, isExpanded]);

    const handleColorSelect = (color: NoteColor) => {
        onColorChange(color);
        if (compact) {
            setIsExpanded(false);
        }
    };

    // Default mode: show all 4 dots
    if (!compact) {
        return (
            <div className={cn('flex items-center gap-1.5', className)}>
                {COLORS.map((color) => (
                    <button
                        key={color.value}
                        onClick={() => onColorChange(color.value)}
                        className={cn(
                            'w-3 h-3 rounded-full transition-all',
                            color.bgClass,
                            selectedColor === color.value
                                ? `ring-1 ring-offset-1 ring-offset-[var(--color-bg-secondary)] ${color.ringClass}`
                                : 'hover:scale-125',
                        )}
                        title={color.label}
                        aria-label={`Set note color to ${color.label}`}
                    />
                ))}
            </div>
        );
    }

    // Compact mode: single dot that expands
    return (
        <div ref={containerRef} className={cn('relative flex items-center', className)}>
            {/* Selected color button - always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    selectedColorData.bgClass,
                    `ring-1 ring-offset-1 ring-offset-[var(--color-bg-secondary)] ${selectedColorData.ringClass}`,
                )}
                title={`Color: ${selectedColorData.label} (click to change)`}
                aria-label={`Current color: ${selectedColorData.label}. Click to change.`}
            />

            {/* Expanded color options */}
            {isExpanded && (
                <div className="absolute left-0 top-full mt-1 flex items-center gap-1 p-1 rounded-md bg-[var(--color-bg-primary)] shadow-md border border-[var(--color-border)] z-10">
                    {COLORS.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => handleColorSelect(color.value)}
                            className={cn(
                                'w-3.5 h-3.5 rounded-full transition-all',
                                color.bgClass,
                                selectedColor === color.value
                                    ? `ring-1 ring-offset-1 ring-offset-[var(--color-bg-primary)] ${color.ringClass}`
                                    : 'hover:scale-125',
                            )}
                            title={color.label}
                            aria-label={`Set note color to ${color.label}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default NoteColorPicker;
