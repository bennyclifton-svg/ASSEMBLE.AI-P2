/**
 * Feature 013: RatingBadge Component (T015)
 * Displays Good/Average/Poor quality rating badges
 */

'use client';

import { cn } from '@/lib/utils';
import type { QualityRating } from '@/types/evaluation';
import { QUALITY_RATING_COLORS, QUALITY_RATING_LABELS } from '@/lib/constants/non-price-criteria';

interface RatingBadgeProps {
    rating: QualityRating | null;
    size?: 'sm' | 'md';
    className?: string;
}

export function RatingBadge({ rating, size = 'sm', className }: RatingBadgeProps) {
    if (!rating) return null;

    const colors = QUALITY_RATING_COLORS[rating];
    const label = QUALITY_RATING_LABELS[rating];

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-md border',
                colors.bg,
                colors.text,
                colors.border,
                size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
                className
            )}
        >
            {label}
        </span>
    );
}

/**
 * Rating button for selecting quality rating (3 buttons per FR-011)
 */
interface RatingButtonProps {
    rating: QualityRating;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export function RatingButton({ rating, selected, onClick, disabled }: RatingButtonProps) {
    const colors = QUALITY_RATING_COLORS[rating];
    const label = QUALITY_RATING_LABELS[rating];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'px-4 py-2 text-sm font-medium rounded-md border-2 transition-all',
                'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
                selected
                    ? cn(colors.bg, colors.text, colors.border, 'ring-2 ring-offset-2 ring-offset-[var(--color-bg-primary)]')
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
                '--tw-ring-color': selected ? getRingColor(rating) : undefined,
            } as React.CSSProperties}
        >
            {label}
        </button>
    );
}

function getRingColor(rating: QualityRating): string {
    switch (rating) {
        case 'good':
            return '#22c55e';
        case 'average':
            return '#eab308';
        case 'poor':
            return '#ef4444';
    }
}

/**
 * Rating button group for selecting quality rating
 */
interface RatingButtonGroupProps {
    value: QualityRating | null;
    onChange: (rating: QualityRating) => void;
    disabled?: boolean;
}

export function RatingButtonGroup({ value, onChange, disabled }: RatingButtonGroupProps) {
    return (
        <div className="flex gap-2">
            <RatingButton
                rating="good"
                selected={value === 'good'}
                onClick={() => onChange('good')}
                disabled={disabled}
            />
            <RatingButton
                rating="average"
                selected={value === 'average'}
                onClick={() => onChange('average')}
                disabled={disabled}
            />
            <RatingButton
                rating="poor"
                selected={value === 'poor'}
                onClick={() => onChange('poor')}
                disabled={disabled}
            />
        </div>
    );
}

/**
 * Compact inline rating buttons for use within table cells
 * Always visible, one-click to select rating
 * Shows colored dots (no text) - muted when unselected, highlighted border when selected
 */
interface InlineRatingButtonsProps {
    value: QualityRating | null;
    onChange: (rating: QualityRating) => void;
    disabled?: boolean;
    saving?: boolean;
    readOnly?: boolean;
}

// Muted background colors for unselected state (increased intensity from /40 to /70)
const MUTED_COLORS: Record<QualityRating, string> = {
    good: 'bg-green-900/70',
    average: 'bg-yellow-900/70',
    poor: 'bg-red-900/70',
};

// Highlight border colors for selected state (reduced from ring-2 to ring-1)
const HIGHLIGHT_BORDERS: Record<QualityRating, string> = {
    good: 'ring-1 ring-green-400',
    average: 'ring-1 ring-yellow-400',
    poor: 'ring-1 ring-red-400',
};

export function InlineRatingButtons({ value, onChange, disabled, saving, readOnly }: InlineRatingButtonsProps) {
    const ratings: QualityRating[] = ['good', 'average', 'poor'];

    return (
        <div className="flex gap-1">
            {ratings.map((rating) => {
                const isSelected = value === rating;

                return (
                    <button
                        key={rating}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!readOnly) onChange(rating);
                        }}
                        disabled={disabled || saving || readOnly}
                        title={QUALITY_RATING_LABELS[rating]}
                        className={cn(
                            'w-5 h-5 transition-all',
                            'focus:outline-none',
                            MUTED_COLORS[rating],
                            isSelected && HIGHLIGHT_BORDERS[rating],
                            !readOnly && 'hover:opacity-80 cursor-pointer',
                            (disabled || saving) && 'opacity-50 cursor-not-allowed',
                            readOnly && 'cursor-default'
                        )}
                    />
                );
            })}
        </div>
    );
}
