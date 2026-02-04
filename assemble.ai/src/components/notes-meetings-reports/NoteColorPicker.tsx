/**
 * NoteColorPicker Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * 4 pastel color buttons for note background selection.
 */

'use client';

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
    className?: string;
}

export function NoteColorPicker({
    selectedColor,
    onColorChange,
    className,
}: NoteColorPickerProps) {
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

export default NoteColorPicker;
