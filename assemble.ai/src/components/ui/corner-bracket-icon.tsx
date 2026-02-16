'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CornerBracketIconProps {
    className?: string;
    /** Direction the brackets point: 'left' (inward) or 'right' (outward) */
    direction?: 'left' | 'right';
    /** Use gradient stroke instead of currentColor */
    gradient?: boolean;
}

// Aurora gradient colors for each theme
const GRADIENT_COLORS = {
    dark: {
        start: '#0080FF',
        mid: '#1776c1',
        end: '#8B5CF6',
    },
    light: {
        start: '#0066CC',
        mid: '#0891B2',
        end: '#6D28D9',
    },
};

/**
 * Corner Brackets Icon - Two L-shaped brackets pointing outward
 * Used for panel expand/collapse toggle
 */
export function CornerBracketIcon({ className, direction = 'left', gradient = false }: CornerBracketIconProps) {
    // Unique ID for gradient to avoid conflicts when multiple icons are rendered
    const gradientId = `corner-bracket-gradient-${Math.random().toString(36).substr(2, 9)}`;

    // Detect theme for gradient colors
    const [isLightTheme, setIsLightTheme] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            setIsLightTheme(theme === 'precision-light');
        };

        checkTheme();

        // Watch for theme changes
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        return () => observer.disconnect();
    }, []);

    const colors = isLightTheme ? GRADIENT_COLORS.light : GRADIENT_COLORS.dark;

    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
                'inline-block',
                className
            )}
        >
            {gradient && (
                <defs>
                    {/* Gradient spans a wide area so only a fraction is visible in the small icon */}
                    {/* Icon positioned on right side of nav, shows purple portion (gradient end) */}
                    <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="-300" y1="8" x2="16" y2="8">
                        <stop offset="0%" stopColor={colors.start} />
                        <stop offset="50%" stopColor={colors.mid} />
                        <stop offset="100%" stopColor={colors.end} />
                    </linearGradient>
                </defs>
            )}
            {direction === 'left' ? (
                <>
                    {/* Outward: Top-right bracket - vertex at outer corner (14,2), arms point left and down */}
                    <path
                        d="M10 2H14V6"
                        stroke={gradient ? `url(#${gradientId})` : "currentColor"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Outward: Bottom-left bracket - vertex at outer corner (2,14), arms point right and up */}
                    <path
                        d="M6 14H2V10"
                        stroke={gradient ? `url(#${gradientId})` : "currentColor"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            ) : (
                <>
                    {/* Inward: Top-right bracket - vertex at inner point (10,6), arms point up and right */}
                    <path
                        d="M10 2V6H14"
                        stroke={gradient ? `url(#${gradientId})` : "currentColor"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Inward: Bottom-left bracket - vertex at inner point (6,10), arms point down and left */}
                    <path
                        d="M6 14V10H2"
                        stroke={gradient ? `url(#${gradientId})` : "currentColor"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            )}
        </svg>
    );
}
