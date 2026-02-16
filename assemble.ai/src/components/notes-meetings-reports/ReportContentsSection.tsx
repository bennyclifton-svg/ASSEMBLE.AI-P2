/**
 * Report Contents Section Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A single report section with rich text editor and AI generation buttons.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { cn } from '@/lib/utils';
import type { ReportSection } from '@/types/notes-meetings-reports';

interface ReportContentsSectionProps {
    section: ReportSection;
    childSections?: ReportSection[];
    onUpdateContent: (sectionId: string, content: string) => Promise<void>;
    onUpdateLabel?: (sectionId: string, label: string) => Promise<void>;
    onGenerate?: (sectionId: string) => void;
    onPolish?: (sectionId: string) => void;
    isGenerating?: boolean;
    isPolishing?: boolean;
    level?: number;
    className?: string;
}

export function ReportContentsSection({
    section,
    childSections = [],
    onUpdateContent,
    onUpdateLabel,
    onGenerate,
    onPolish,
    isGenerating = false,
    isPolishing = false,
    level = 0,
    className,
}: ReportContentsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [localContent, setLocalContent] = useState(section.content || '');
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [editLabel, setEditLabel] = useState(section.sectionLabel);
    const labelInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update local content when section changes
    useEffect(() => {
        setLocalContent(section.content || '');
    }, [section.content]);

    // Auto-save with debounce
    const debouncedSave = useCallback((content: string) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            onUpdateContent(section.id, content);
        }, 500);
    }, [section.id, onUpdateContent]);

    const handleContentChange = useCallback((newContent: string) => {
        setLocalContent(newContent);
        debouncedSave(newContent);
    }, [debouncedSave]);

    // Focus label input when editing starts
    useEffect(() => {
        if (isEditingLabel && labelInputRef.current) {
            labelInputRef.current.focus();
            labelInputRef.current.select();
        }
    }, [isEditingLabel]);

    const handleLabelDoubleClick = () => {
        if (onUpdateLabel) {
            setEditLabel(section.sectionLabel);
            setIsEditingLabel(true);
        }
    };

    const handleLabelBlur = () => {
        setIsEditingLabel(false);
        if (editLabel.trim() && editLabel !== section.sectionLabel && onUpdateLabel) {
            onUpdateLabel(section.id, editLabel.trim());
        } else {
            setEditLabel(section.sectionLabel);
        }
    };

    const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setEditLabel(section.sectionLabel);
            setIsEditingLabel(false);
        }
    };

    const hasChildren = childSections.length > 0;
    const hasContent = localContent.trim().length > 0;
    const isParent = level === 0;

    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
        <div className={cn('border-b border-[var(--color-border)] last:border-b-0', className)}>
            {/* Section Header */}
            <div
                className={cn(
                    'flex items-center justify-between py-2 px-3',
                    isParent ? 'bg-[var(--color-bg-secondary)]' : 'bg-transparent',
                    hasChildren && 'cursor-pointer'
                )}
                onClick={hasChildren ? () => setIsExpanded(!isExpanded) : undefined}
                style={{ paddingLeft: `${12 + level * 16}px` }}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {hasChildren && (
                        <ChevronIcon className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
                    )}
                    {isEditingLabel ? (
                        <input
                            ref={labelInputRef}
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onBlur={handleLabelBlur}
                            onKeyDown={handleLabelKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 bg-transparent border-b border-[var(--color-accent-primary)] text-[var(--color-text-primary)] font-medium focus:outline-none text-sm"
                        />
                    ) : (
                        <span
                            className={cn(
                                'font-medium text-sm truncate',
                                isParent ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]',
                                onUpdateLabel && 'hover:text-[var(--color-accent-primary)] cursor-text'
                            )}
                            onDoubleClick={handleLabelDoubleClick}
                        >
                            {section.sectionLabel}
                        </span>
                    )}
                </div>

                {/* AI Generate/Polish buttons */}
                {!hasChildren && (
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {onGenerate && (
                            <button
                                onClick={() => onGenerate(section.id)}
                                disabled={isGenerating || isPolishing}
                                className={cn(
                                    'flex items-center gap-1.5 text-sm font-medium transition-all',
                                    isGenerating
                                        ? 'text-[var(--color-accent-copper)] cursor-wait'
                                        : isPolishing
                                            ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                            : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                )}
                                title="Generate content"
                            >
                                <DiamondIcon
                                    className={cn('w-4 h-4', isGenerating && 'animate-diamond-spin')}
                                    variant="empty"
                                />
                                <span className={isGenerating ? 'animate-text-aurora' : ''}>
                                    {isGenerating ? 'Generating...' : 'Generate'}
                                </span>
                            </button>
                        )}
                        {onPolish && hasContent && (
                            <button
                                onClick={() => onPolish(section.id)}
                                disabled={isGenerating || isPolishing}
                                className={cn(
                                    'flex items-center gap-1.5 text-sm font-medium transition-all',
                                    isPolishing
                                        ? 'text-[var(--color-accent-copper)] cursor-wait'
                                        : isGenerating
                                            ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                            : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                )}
                                title="Polish content"
                            >
                                <DiamondIcon
                                    className={cn('w-4 h-4', isPolishing && 'animate-diamond-spin')}
                                    variant="filled"
                                />
                                <span className={isPolishing ? 'animate-text-aurora' : ''}>
                                    {isPolishing ? 'Polishing...' : 'Polish'}
                                </span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Section Content */}
            {isExpanded && !hasChildren && (
                <div className="pb-1" style={{ paddingLeft: `${12 + level * 16}px` }}>
                    <RichTextEditor
                        content={localContent}
                        onChange={handleContentChange}
                        placeholder="Enter content..."
                        variant="mini"
                        toolbarVariant="mini"
                        transparentBg
                        className="border-0 rounded-none"
                        editorClassName="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors"
                    />
                </div>
            )}

            {/* Child Sections */}
            {isExpanded && hasChildren && (
                <div className="pl-4">
                    {childSections.map((child) => (
                        <ReportContentsSection
                            key={child.id}
                            section={child}
                            childSections={[]}
                            onUpdateContent={onUpdateContent}
                            onUpdateLabel={onUpdateLabel}
                            onGenerate={onGenerate}
                            onPolish={onPolish}
                            isGenerating={isGenerating}
                            isPolishing={isPolishing}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ReportContentsSection;
