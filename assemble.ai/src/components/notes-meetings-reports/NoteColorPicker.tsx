/**
 * NoteColorPicker Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Color picker with two modes:
 * - Default: Shows all 4 color dots
 * - Compact: Shows only selected color, expands on click
 */

'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { NoteColor } from '@/types/notes-meetings-reports';

const COLORS: { value: NoteColor; label: string; accent: string; tint: string }[] = [
    { value: 'purple', label: 'Purple', accent: 'var(--sw-lav)', tint: 'rgba(168, 156, 217, 0.18)' },
    { value: 'orange', label: 'Orange', accent: 'var(--sw-peach)', tint: 'rgba(245, 164, 114, 0.18)' },
    { value: 'pink', label: 'Pink', accent: 'var(--sw-rose)', tint: 'rgba(248, 101, 122, 0.18)' },
    { value: 'blue', label: 'Blue', accent: 'var(--sw-cyan)', tint: 'rgba(122, 184, 194, 0.18)' },
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

    const colorButtonStyle = (color: (typeof COLORS)[number], isSelected: boolean): CSSProperties => ({
        background: color.accent,
        boxShadow: isSelected
            ? `0 0 0 2px var(--sw-paper), 0 0 0 3px ${color.accent}`
            : undefined,
    });

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
                            selectedColor !== color.value && 'hover:scale-125',
                        )}
                        style={colorButtonStyle(color, selectedColor === color.value)}
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
                    'w-3 h-3 rounded-full transition-all hover:scale-110',
                )}
                style={colorButtonStyle(selectedColorData, true)}
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
                                selectedColor !== color.value && 'hover:scale-125',
                            )}
                            style={colorButtonStyle(color, selectedColor === color.value)}
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
