/**
 * Meeting Agenda Section Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A single agenda section with rich text editor and AI generation buttons.
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { hasInstructions } from '@/lib/editor/instruction-utils';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import type { MeetingSection } from '@/types/notes-meetings-reports';

interface MeetingAgendaSectionProps {
    section: MeetingSection;
    childSections?: MeetingSection[];
    onUpdateContent: (sectionId: string, content: string) => Promise<void>;
    onUpdateLabel?: (sectionId: string, label: string) => Promise<void>;
    onGenerate?: (sectionId: string) => void;
    onPolish?: (sectionId: string) => void;
    onExecuteInstruction?: (sectionId: string) => void;
    onEditorReady?: (sectionId: string, editor: Editor) => void;
    isGenerating?: boolean;
    isPolishing?: boolean;
    isExecuting?: boolean;
    accentColor?: string;
    level?: number;
    className?: string;
}

export function MeetingAgendaSection({
    section,
    childSections = [],
    onUpdateContent,
    onUpdateLabel,
    onGenerate,
    onPolish,
    onExecuteInstruction,
    onEditorReady,
    isGenerating = false,
    isPolishing = false,
    isExecuting = false,
    accentColor = 'var(--sw-cyan)',
    level = 0,
    className,
}: MeetingAgendaSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [hasInstruction, setHasInstruction] = useState(false);
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [editLabel, setEditLabel] = useState(section.sectionLabel);
    const labelInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        debouncedSave(newContent);
    }, [debouncedSave]);

    const handleEditorReady = useCallback((editor: Editor) => {
        onEditorReady?.(section.id, editor);
        setHasInstruction(hasInstructions(editor.state));
        editor.on('update', () => {
            setHasInstruction(hasInstructions(editor.state));
        });
    }, [section.id, onEditorReady]);

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
    const hasContent = (section.content || '').trim().length > 0;
    const isParent = level === 0;

    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    const accent = isParent ? accentColor : 'var(--sw-cyan)';

    return (
        <div className={cn('border-b border-[var(--sw-rule-2)] last:border-b-0', className)}>
            {/* Section Header */}
            <div
                className={cn(
                    'flex items-center justify-between border-l-2 px-3 py-2',
                    isParent ? 'bg-[var(--sw-paper)]' : 'bg-transparent',
                    hasChildren && 'cursor-pointer'
                )}
                onClick={hasChildren ? () => setIsExpanded(!isExpanded) : undefined}
                style={{ paddingLeft: `${12 + level * 16}px`, borderLeftColor: accent }}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {hasChildren && (
                        <ChevronIcon className="h-4 w-4 text-[var(--sw-muted)] flex-shrink-0" />
                    )}
                    <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0"
                        style={{ background: accent }}
                    />
                    {isEditingLabel ? (
                        <input
                            ref={labelInputRef}
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onBlur={handleLabelBlur}
                            onKeyDown={handleLabelKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-0 flex-1 border-b bg-transparent text-sm font-medium text-[var(--sw-ink)] focus:outline-none"
                            style={{ borderBottomColor: accent }}
                        />
                    ) : (
                        <span
                            className={cn(
                                'truncate text-sm font-medium',
                                isParent ? 'text-[var(--sw-ink)]' : 'text-[var(--sw-muted)]',
                                onUpdateLabel && 'cursor-text hover:text-[var(--sw-rose-dk)]'
                            )}
                            style={{ fontFamily: isParent ? 'var(--sw-font-mono)' : undefined }}
                            onDoubleClick={handleLabelDoubleClick}
                        >
                            {section.sectionLabel}
                        </span>
                    )}
                </div>

                {/* AI Execute/Generate/Polish buttons */}
                {!hasChildren && (
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {onExecuteInstruction && hasInstruction && (
                            <button
                                onClick={() => onExecuteInstruction(section.id)}
                                disabled={isExecuting || isGenerating || isPolishing}
                                className={cn(
                                    'flex items-center gap-1.5 text-sm font-medium transition-all',
                                    isExecuting
                                        ? 'text-[var(--sw-rose-dk)] cursor-wait'
                                        : (isGenerating || isPolishing)
                                            ? 'text-[var(--sw-muted)] cursor-not-allowed opacity-50'
                                            : 'text-[var(--sw-rose-dk)] hover:opacity-80'
                                )}
                                title="Execute // instruction"
                            >
                                <DiamondIcon
                                    className={cn('w-4 h-4', isExecuting && 'animate-diamond-spin')}
                                    variant="empty"
                                />
                                <span className={isExecuting ? 'animate-text-aurora' : ''}>
                                    {isExecuting ? 'Executing...' : 'Execute'}
                                </span>
                            </button>
                        )}
                        {onGenerate && (
                            <button
                                onClick={() => onGenerate(section.id)}
                                disabled={isGenerating || isPolishing || isExecuting}
                                className={cn(
                                    'flex items-center gap-1.5 text-sm font-medium transition-all',
                                    isGenerating
                                        ? 'text-[var(--sw-rose-dk)] cursor-wait'
                                        : (isPolishing || isExecuting)
                                            ? 'text-[var(--sw-muted)] cursor-not-allowed opacity-50'
                                            : 'text-[var(--sw-rose-dk)] hover:opacity-80'
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
                                disabled={isGenerating || isPolishing || isExecuting}
                                className={cn(
                                    'flex items-center gap-1.5 text-sm font-medium transition-all',
                                    isPolishing
                                        ? 'text-[var(--sw-rose-dk)] cursor-wait'
                                        : (isGenerating || isExecuting)
                                            ? 'text-[var(--sw-muted)] cursor-not-allowed opacity-50'
                                            : 'text-[var(--sw-rose-dk)] hover:opacity-80'
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
                        content={section.content || ''}
                        onChange={handleContentChange}
                        onEditorReady={handleEditorReady}
                        placeholder="Enter content..."
                        variant="mini"
                        toolbarVariant="mini"
                        transparentBg
                        className="border-0 rounded-none"
                        editorClassName="bg-white hover:bg-[var(--sw-paper)] transition-colors"
                    />
                </div>
            )}

            {/* Child Sections */}
            {isExpanded && hasChildren && (
                <div className="pl-4">
                    {childSections.map((child) => (
                        <MeetingAgendaSection
                            key={child.id}
                            section={child}
                            childSections={[]}
                            onUpdateContent={onUpdateContent}
                            onUpdateLabel={onUpdateLabel}
                            onGenerate={onGenerate}
                            onPolish={onPolish}
                            onExecuteInstruction={onExecuteInstruction}
                            onEditorReady={onEditorReady}
                            isGenerating={isGenerating}
                            isPolishing={isPolishing}
                            isExecuting={isExecuting}
                            accentColor={accentColor}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default MeetingAgendaSection;
