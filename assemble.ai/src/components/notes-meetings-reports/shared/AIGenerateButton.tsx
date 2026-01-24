/**
 * AI Generate Button Component
 * Feature 021 - Notes, Meetings & Reports - Phase 6 (User Story 4)
 *
 * Empty diamond icon button that triggers AI content generation.
 * Shows loading state while generating.
 */

'use client';

import React from 'react';
import { Diamond, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIGenerateButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    tooltip?: string;
}

export function AIGenerateButton({
    onClick,
    isLoading = false,
    disabled = false,
    size = 'md',
    className,
    tooltip = 'Generate content with AI',
}: AIGenerateButtonProps) {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-7 w-7',
    };

    const iconSizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(sizeClasses[size], className)}
            onClick={onClick}
            disabled={disabled || isLoading}
            title={tooltip}
        >
            {isLoading ? (
                <Loader2
                    className={cn(
                        iconSizeClasses[size],
                        'animate-spin text-[var(--color-accent-primary)]'
                    )}
                />
            ) : (
                <Diamond
                    className={cn(
                        iconSizeClasses[size],
                        'text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors'
                    )}
                />
            )}
        </Button>
    );
}

export default AIGenerateButton;
