/**
 * AI Polish Button Component
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Filled diamond icon button with "Polish" text that triggers AI content polishing.
 * Styled to match the objectives section polish button.
 */

'use client';

import React from 'react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { cn } from '@/lib/utils';

interface AIPolishButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
    tooltip?: string;
}

export function AIPolishButton({
    onClick,
    isLoading = false,
    disabled = false,
    className,
    tooltip = 'Polish content with AI',
}: AIPolishButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={cn(
                'flex items-center gap-1.5 text-sm font-medium transition-all',
                disabled || isLoading
                    ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                    : 'text-[var(--color-accent-copper)] hover:opacity-80',
                className
            )}
            title={tooltip}
        >
            <DiamondIcon
                className={cn(
                    'w-4 h-4',
                    isLoading && 'animate-spin'
                )}
                variant="filled"
            />
            {isLoading ? 'Polishing...' : 'Polish'}
        </button>
    );
}

export default AIPolishButton;
