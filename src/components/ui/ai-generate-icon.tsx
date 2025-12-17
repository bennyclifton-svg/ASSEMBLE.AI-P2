'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AIGenerateIconProps {
    size?: number;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    title?: string;
}

/**
 * AI Generate Icon - Diamond shape (square rotated 45° with inner square)
 * Used to trigger AI-powered content generation from Knowledge Source
 */
export function AIGenerateIcon({
    size = 16,
    className,
    onClick,
    disabled = false,
    isLoading = false,
    title = 'Generate with AI',
}: AIGenerateIconProps) {
    if (isLoading) {
        return (
            <span
                className={cn(
                    'inline-flex items-center justify-center',
                    className
                )}
                title="Generating..."
            >
                <Loader2
                    className="animate-spin"
                    style={{ width: size, height: size }}
                />
            </span>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'inline-flex items-center justify-center',
                'hover:opacity-80 transition-opacity cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0e639c] rounded',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            title={title}
            type="button"
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Outer diamond (square rotated 45°) */}
                <path
                    d="M8 1L15 8L8 15L1 8L8 1Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                />
                {/* Inner diamond (smaller, filled) */}
                <path
                    d="M8 4.5L11.5 8L8 11.5L4.5 8L8 4.5Z"
                    fill="currentColor"
                />
            </svg>
        </button>
    );
}
