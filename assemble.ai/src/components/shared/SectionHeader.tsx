/**
 * SectionHeader Component
 * Reusable segmented ribbon header matching RFT/TRR/Addendum/Evaluation styling
 *
 * Layout: [Title Segment] [Expand/Collapse] [Options Menu (expandable)]
 */

'use client';

import { ReactNode } from 'react';
import { LucideIcon, MoreHorizontal, MoreVertical } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';

// Accent color from design system
const SECTION_ACCENT = 'var(--color-accent-copper)';

interface SectionHeaderProps {
    /** Section title (e.g., "NOTES", "MEETINGS", "REQUEST FOR TENDER") */
    title: string;
    /** Icon to display before the title */
    icon: LucideIcon;
    /** Whether the content section is expanded */
    isExpanded: boolean;
    /** Callback when expand/collapse is toggled */
    onToggleExpand: () => void;
    /** Whether the options menu is expanded */
    isMenuExpanded: boolean;
    /** Callback when options menu expand is toggled */
    onToggleMenu: () => void;
    /** Content to show in the expandable options area (tabs, export buttons, etc.) */
    menuContent?: ReactNode;
    /** Optional custom accent color (defaults to copper) */
    accentColor?: string;
    /** Optional className for the container */
    className?: string;
}

export function SectionHeader({
    title,
    icon: Icon,
    isExpanded,
    onToggleExpand,
    isMenuExpanded,
    onToggleMenu,
    menuContent,
    accentColor = SECTION_ACCENT,
    className = '',
}: SectionHeaderProps) {
    return (
        <div className={`flex items-stretch gap-0.5 p-2 ${className}`}>
            {/* Title segment */}
            <div className="flex items-center w-[220px] px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-l-md">
                <Icon className="w-4 h-4" style={{ color: accentColor }} />
                <span className="ml-1 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                    {title}
                </span>
            </div>

            {/* Corner bracket segment - expand/collapse toggle */}
            <button
                onClick={onToggleExpand}
                className="flex items-center justify-center p-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
            >
                <CornerBracketIcon
                    direction={isExpanded ? 'right' : 'left'}
                    className="w-4 h-4"
                />
            </button>

            {/* Options menu segment - expandable */}
            <div className="flex items-center bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-sm rounded-r-md transition-all">
                <button
                    onClick={onToggleMenu}
                    className="flex items-center justify-center w-8 h-8 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    title={isMenuExpanded ? 'Hide options' : 'Show options'}
                >
                    {isMenuExpanded ? (
                        <MoreHorizontal className="w-4 h-4" />
                    ) : (
                        <MoreVertical className="w-4 h-4" />
                    )}
                </button>

                {/* Expanded menu content */}
                {isMenuExpanded && menuContent && (
                    <>
                        <div className="ml-1 mr-2 h-5 w-px bg-[var(--color-border)]" />
                        {menuContent}
                    </>
                )}
            </div>
        </div>
    );
}

export default SectionHeader;
