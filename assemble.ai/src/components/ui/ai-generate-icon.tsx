'use client';

import { cn } from '@/lib/utils';

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
    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={cn(
                'inline-flex items-center justify-center',
                'hover:opacity-80 transition-opacity cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0e639c] rounded',
                isLoading && 'cursor-wait',
                disabled && !isLoading && 'opacity-50 cursor-not-allowed',
                className
            )}
            title={isLoading ? 'Generating...' : title}
            type="button"
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={isLoading ? 'animate-spin [animation-duration:2.5s]' : ''}
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
