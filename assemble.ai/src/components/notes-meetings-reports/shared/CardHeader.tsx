/**
 * Shared Card Header Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Collapsible header with chevron, editable title, and action icons.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Copy, Trash2, Star, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIGenerateButton } from './AIGenerateButton';

interface CardHeaderAction {
    id: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
}

interface CardHeaderProps {
    title: string;
    isExpanded: boolean;
    isStarred?: boolean;
    onToggleExpand: () => void;
    onTitleChange?: (newTitle: string) => void;
    onStarToggle?: () => void;
    onCopy?: () => void;
    onDelete?: () => void;
    onDownload?: () => void;
    onEmail?: () => void;
    onGenerate?: () => void;
    customActions?: CardHeaderAction[];
    showStar?: boolean;
    showCopy?: boolean;
    showDelete?: boolean;
    showDownload?: boolean;
    showEmail?: boolean;
    showGenerate?: boolean;
    isGenerating?: boolean;
    className?: string;
}

export function CardHeader({
    title,
    isExpanded,
    isStarred = false,
    onToggleExpand,
    onTitleChange,
    onStarToggle,
    onCopy,
    onDelete,
    onDownload,
    onEmail,
    onGenerate,
    customActions = [],
    showStar = false,
    showCopy = true,
    showDelete = true,
    showDownload = false,
    showEmail = false,
    showGenerate = false,
    isGenerating = false,
    className,
}: CardHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update edit value when title changes externally
    useEffect(() => {
        setEditValue(title);
    }, [title]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleTitleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onTitleChange) {
            setIsEditing(true);
        }
    };

    const handleTitleBlur = () => {
        setIsEditing(false);
        if (editValue.trim() && editValue !== title && onTitleChange) {
            onTitleChange(editValue.trim());
        } else {
            setEditValue(title);
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setEditValue(title);
            setIsEditing(false);
        }
    };

    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    // Icon size classes based on collapsed/expanded state
    const iconSize = isExpanded ? 'h-4 w-4' : 'h-5 w-5';
    const btnSize = isExpanded ? 'h-8 w-8' : 'h-9 w-9';

    return (
        <div
            className={cn(
                'border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] group-hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer',
                isExpanded
                    ? 'flex items-center justify-between px-4 py-3'
                    : 'flex flex-col px-4 py-3',
                className
            )}
            onClick={onToggleExpand}
        >
            {/* When collapsed: icons row across the top */}
            {!isExpanded && (
                <div className="flex items-center justify-between w-full mb-2" onClick={(e) => e.stopPropagation()}>
                    <ChevronIcon
                        className="h-5 w-5 text-[var(--color-text-muted)] flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                        style={{ cursor: 'pointer' }}
                    />

                    <div className="flex items-center gap-2">
                        {showGenerate && onGenerate && (
                            <AIGenerateButton
                                onClick={onGenerate}
                                isLoading={isGenerating}
                                tooltip="Generate content with AI"
                            />
                        )}

                        {showStar && onStarToggle && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onStarToggle}
                                title={isStarred ? 'Unstar' : 'Star'}
                            >
                                <Star
                                    className={cn(
                                        iconSize,
                                        isStarred
                                            ? 'fill-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
                                            : 'text-[var(--color-text-muted)]'
                                    )}
                                />
                            </Button>
                        )}

                        {showDownload && onDownload && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onDownload}
                                title="Download"
                            >
                                <Download className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}

                        {showEmail && onEmail && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onEmail}
                                title="Email"
                            >
                                <Mail className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}

                        {customActions.map((action) => (
                            <Button
                                key={action.id}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    btnSize,
                                    action.variant === 'destructive' && 'hover:text-red-500'
                                )}
                                onClick={action.onClick}
                                disabled={action.disabled}
                                title={action.label}
                            >
                                {action.icon}
                            </Button>
                        ))}

                        {showCopy && onCopy && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onCopy}
                                title="Copy"
                            >
                                <Copy className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}

                        {showDelete && onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(btnSize, 'hover:text-red-500')}
                                onClick={onDelete}
                                title="Delete"
                            >
                                <Trash2 className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* When collapsed: title centered below icons */}
            {!isExpanded && (
                <div className="flex justify-center w-full pt-1 pb-1">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={handleTitleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-center bg-transparent border-none text-[var(--color-text-primary)] font-medium focus:outline-none focus:ring-0"
                        />
                    ) : (
                        <span
                            className={cn(
                                'font-medium text-[var(--color-text-primary)] truncate text-center',
                                onTitleChange && 'hover:text-[var(--color-accent-primary)] cursor-text'
                            )}
                            onClick={handleTitleClick}
                        >
                            {title}
                        </span>
                    )}
                </div>
            )}

            {/* When expanded: original horizontal layout */}
            {isExpanded && (
                <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <ChevronIcon
                            className="h-5 w-5 text-[var(--color-text-muted)] flex-shrink-0"
                        />
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 min-w-0 bg-transparent border-none text-[var(--color-text-primary)] font-medium focus:outline-none focus:ring-0"
                            />
                        ) : (
                            <span
                                className={cn(
                                    'font-medium text-[var(--color-text-primary)] truncate',
                                    onTitleChange && 'hover:text-[var(--color-accent-primary)] cursor-text'
                                )}
                                onClick={handleTitleClick}
                            >
                                {title}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {showGenerate && onGenerate && (
                            <AIGenerateButton
                                onClick={onGenerate}
                                isLoading={isGenerating}
                                tooltip="Generate content with AI"
                            />
                        )}

                        {showStar && onStarToggle && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onStarToggle}
                                title={isStarred ? 'Unstar' : 'Star'}
                            >
                                <Star
                                    className={cn(
                                        iconSize,
                                        isStarred
                                            ? 'fill-[var(--color-accent-primary)] text-[var(--color-accent-primary)]'
                                            : 'text-[var(--color-text-muted)]'
                                    )}
                                />
                            </Button>
                        )}

                        {showDownload && onDownload && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onDownload}
                                title="Download"
                            >
                                <Download className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}

                        {showEmail && onEmail && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onEmail}
                                title="Email"
                            >
                                <Mail className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}

                        {customActions.map((action) => (
                            <Button
                                key={action.id}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    btnSize,
                                    action.variant === 'destructive' && 'hover:text-red-500'
                                )}
                                onClick={action.onClick}
                                disabled={action.disabled}
                                title={action.label}
                            >
                                {action.icon}
                            </Button>
                        ))}

                        {showCopy && onCopy && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={btnSize}
                                onClick={onCopy}
                                title="Copy"
                            >
                                <Copy className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}

                        {showDelete && onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(btnSize, 'hover:text-red-500')}
                                onClick={onDelete}
                                title="Delete"
                            >
                                <Trash2 className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default CardHeader;
