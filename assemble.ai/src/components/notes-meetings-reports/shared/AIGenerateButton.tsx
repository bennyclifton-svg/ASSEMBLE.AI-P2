/**
 * AI Generate Button Component
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Diamond icon button with "Generate" text that triggers AI content generation.
 * Styled to match the objectives section generate button.
 */

'use client';

import React from 'react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { cn } from '@/lib/utils';

interface AIGenerateButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
    tooltip?: string;
}

export function AIGenerateButton({
    onClick,
    isLoading = false,
    disabled = false,
    className,
    tooltip = 'Generate content with AI',
}: AIGenerateButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={cn(
                'flex items-center gap-1.5 text-sm font-medium transition-all',
                isLoading
                    ? 'text-[var(--color-accent-copper)] cursor-wait'
                    : disabled
                        ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                        : 'text-[var(--color-accent-copper)] hover:opacity-80',
                className
            )}
            title={tooltip}
        >
            <DiamondIcon
                className={cn(
                    'w-4 h-4',
                    isLoading && 'animate-diamond-spin'
                )}
                variant="empty"
            />
            <span className={isLoading ? 'animate-text-aurora' : ''}>
                {isLoading ? 'Generating...' : 'Generate'}
            </span>
        </button>
    );
}

export default AIGenerateButton;
