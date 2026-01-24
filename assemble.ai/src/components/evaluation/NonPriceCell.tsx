/**
 * Feature 013: NonPriceCell Component
 * Inline editing: content editable on click, rating buttons always visible
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { InlineRatingButtons } from './RatingBadge';
import type { EvaluationNonPriceCell, QualityRating } from '@/types/evaluation';
import {
    getDisplayContent,
    getDisplayRating,
    isAIGenerated,
    isLowConfidence,
    isUserEdited,
} from '@/types/evaluation';
import { cn } from '@/lib/utils';

interface NonPriceCellProps {
    cell: EvaluationNonPriceCell | undefined;
    onContentChange: (content: string) => Promise<void>;
    onRatingChange: (rating: QualityRating) => Promise<void>;
    disabled?: boolean;
}

export function NonPriceCell({
    cell,
    onContentChange,
    onRatingChange,
    disabled = false,
}: NonPriceCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isSavingContent, setIsSavingContent] = useState(false);
    const [isSavingRating, setIsSavingRating] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const content = cell ? getDisplayContent(cell) : null;
    const rating = cell ? getDisplayRating(cell) : null;
    const aiGenerated = cell ? isAIGenerated(cell) : false;
    const lowConfidence = cell ? isLowConfidence(cell) : false;
    const userEdited = cell ? isUserEdited(cell) : false;

    // Auto-resize textarea to fit content
    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    // Focus textarea when entering edit mode and auto-resize
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
            // Auto-resize after focus
            setTimeout(autoResize, 0);
        }
    }, [isEditing]);

    // Handle content click to enter edit mode
    const handleContentClick = () => {
        if (disabled || isSavingContent) return;
        setEditValue(content || '');
        setIsEditing(true);
    };

    // Handle content save on blur
    const handleContentBlur = async () => {
        const trimmedValue = editValue.trim();
        setIsEditing(false);

        // Only save if changed
        if (trimmedValue !== (content || '')) {
            setIsSavingContent(true);
            try {
                await onContentChange(trimmedValue);
            } finally {
                setIsSavingContent(false);
            }
        }
    };

    // Handle keyboard in textarea
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textareaRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(content || '');
            setIsEditing(false);
        }
    };

    // Handle rating change (instant save)
    const handleRatingChange = async (newRating: QualityRating) => {
        if (disabled || isSavingRating) return;
        setIsSavingRating(true);
        try {
            await onRatingChange(newRating);
        } finally {
            setIsSavingRating(false);
        }
    };

    return (
        <div
            className={cn(
                'flex flex-col h-full min-h-[80px] border-r border-[var(--color-border)]',
                disabled && 'opacity-60'
            )}
        >
            {/* Content area - top section */}
            <div
                onClick={handleContentClick}
                className={cn(
                    'flex-1 p-2 cursor-text transition-colors min-h-[60px]',
                    'hover:bg-[var(--color-bg-tertiary)]',
                    isEditing && 'bg-[var(--color-bg-tertiary)]',
                    !content && !isEditing && 'bg-[var(--color-bg-secondary)]'
                )}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={(e) => {
                            setEditValue(e.target.value);
                            autoResize();
                        }}
                        onBlur={handleContentBlur}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter assessment..."
                        maxLength={200}
                        className={cn(
                            'w-full min-h-[44px] text-xs text-[var(--color-text-primary)] leading-relaxed',
                            'bg-transparent resize-none outline-none',
                            'placeholder:text-[var(--color-text-muted)] placeholder:italic'
                        )}
                    />
                ) : (
                    <div className="text-xs text-[var(--color-text-primary)] leading-relaxed min-h-[44px]">
                        {content ? (
                            <>
                                {content}
                                {isSavingContent && (
                                    <span className="text-[var(--color-text-muted)] ml-1">saving...</span>
                                )}
                            </>
                        ) : (
                            <span className="text-[var(--color-text-muted)] italic">Click to add...</span>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom row: Rating buttons + AI indicators */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
                {/* Rating buttons - always visible */}
                <InlineRatingButtons
                    value={rating}
                    onChange={handleRatingChange}
                    disabled={disabled}
                    saving={isSavingRating}
                />

                {/* AI indicators */}
                <div className="flex items-center gap-1">
                    {aiGenerated && !userEdited && (
                        <span title="AI-extracted content">
                            <DiamondIcon className="w-3 h-3 text-[var(--color-accent-copper)]" />
                        </span>
                    )}
                    {lowConfidence && !userEdited && (
                        <span title="Low confidence - review suggested">
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
