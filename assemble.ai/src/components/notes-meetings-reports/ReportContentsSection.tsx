/**
 * Report Contents Section Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A single report section with content editor and AI generation buttons.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Diamond } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalContent(newContent);
        debouncedSave(newContent);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
        }
    }, [localContent]);

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
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {onGenerate && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onGenerate(section.id)}
                                disabled={isGenerating || isPolishing}
                                title="Generate content"
                            >
                                <Diamond
                                    className={cn(
                                        'h-4 w-4',
                                        isGenerating ? 'animate-pulse text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)]'
                                    )}
                                />
                            </Button>
                        )}
                        {onPolish && hasContent && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onPolish(section.id)}
                                disabled={isGenerating || isPolishing}
                                title="Polish content"
                            >
                                <Diamond
                                    className={cn(
                                        'h-4 w-4 fill-current',
                                        isPolishing ? 'animate-pulse text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)]'
                                    )}
                                />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Section Content */}
            {isExpanded && !hasChildren && (
                <div className="px-3 pb-3" style={{ paddingLeft: `${12 + level * 16}px` }}>
                    <textarea
                        ref={textareaRef}
                        value={localContent}
                        onChange={handleContentChange}
                        placeholder="Enter content..."
                        className="w-full min-h-[80px] p-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] resize-none"
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
