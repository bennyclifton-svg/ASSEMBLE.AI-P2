/**
 * SingleNotePanel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays a single note as a collapsible section with editable title in header.
 * Multiple instances can be rendered to show Note 1, Note 2, Note 3, etc.
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { Trash2, MoreHorizontal, MoreVertical, Star, Copy, Sparkles, Loader2 } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { NoteColorPicker } from './NoteColorPicker';
import { NoteContent } from './NoteContent';
import { cn } from '@/lib/utils';
import type { Note, NoteColor, GenerateNoteContentResponse } from '@/types/notes-meetings-reports';
import { NOTE_COLOR_MAP } from '@/types/notes-meetings-reports';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface SingleNotePanelProps {
    note: NoteWithCount;
    noteNumber: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (data: { title?: string; content?: string; isStarred?: boolean; color?: NoteColor }) => Promise<void>;
    onCopy: () => Promise<void>;
    onDelete: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function SingleNotePanel({
    note,
    noteNumber,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onCopy,
    onDelete,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: SingleNotePanelProps) {
    const [isMenuExpanded, setMenuExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(note.title || 'New Note');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync local title when note changes
    useEffect(() => {
        setLocalTitle(note.title || 'New Note');
    }, [note.id, note.title]);

    // Focus input/textarea when editing starts - place cursor at end, don't select all
    useEffect(() => {
        if (isEditingTitle) {
            const el = inputRef.current || textareaRef.current;
            if (el) {
                el.focus();
                const len = el.value.length;
                el.setSelectionRange(len, len);
            }
        }
    }, [isEditingTitle]);

    const handleTitleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingTitle(true);
    };

    const handleTitleBlur = async () => {
        setIsEditingTitle(false);
        if (localTitle !== note.title) {
            await onUpdate({ title: localTitle || 'New Note' });
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditingTitle(false);
            if (localTitle !== note.title) {
                onUpdate({ title: localTitle || 'New Note' });
            }
        } else if (e.key === 'Escape') {
            setLocalTitle(note.title || 'New Note');
            setIsEditingTitle(false);
        }
    };

    const handleDelete = useCallback(async () => {
        if (confirm('Delete this note? This will permanently delete this note and all its attachments. This action cannot be undone.')) {
            setIsDeleting(true);
            try {
                await onDelete();
            } finally {
                setIsDeleting(false);
            }
        }
    }, [onDelete]);

    const handleColorChange = useCallback(async (color: NoteColor) => {
        await onUpdate({ color });
    }, [onUpdate]);

    const handleStarToggle = useCallback(async () => {
        await onUpdate({ isStarred: !note.isStarred });
    }, [onUpdate, note.isStarred]);

    const handleCopy = useCallback(async () => {
        setIsCopying(true);
        try {
            await onCopy();
        } finally {
            setIsCopying(false);
        }
    }, [onCopy]);

    const handleGenerate = useCallback(async () => {
        try {
            setIsGenerating(true);

            const response = await fetch('/api/ai/generate-note-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noteId: note.id,
                    projectId: note.projectId,
                    existingContent: note.content || undefined,
                    existingTitle: note.title,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate content');
            }

            const result: GenerateNoteContentResponse = await response.json();
            await onUpdate({ content: result.content });
        } catch (error) {
            console.error('[SingleNotePanel] Failed to generate content:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [note.id, note.projectId, note.content, note.title, onUpdate]);

    // Get note color for header styling
    const noteColor = note.color || 'yellow';
    const colorStyles = NOTE_COLOR_MAP[noteColor];

    // Collapsed state: Square sticky note
    if (!isExpanded) {
        return (
            <div className={cn('', className)}>
                <div
                    className="relative w-[140px] h-[140px] pt-1 pr-1.5 pb-2 pl-1.5 shadow-sm flex flex-col"
                    style={{ backgroundColor: colorStyles.bg, borderColor: colorStyles.border, borderWidth: '1px', borderStyle: 'solid' }}
                >
                    {/* Top toolbar: Color dots, copy, delete, expand */}
                    <div className="flex items-center gap-1 mb-1">
                        {/* Color picker dots */}
                        <NoteColorPicker
                            selectedColor={noteColor}
                            onColorChange={handleColorChange}
                            className="flex-1"
                        />

                        {/* Copy button */}
                        <button
                            onClick={handleCopy}
                            disabled={isCopying}
                            className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
                            title="Copy note"
                        >
                            {isCopying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                        </button>

                        {/* Delete button */}
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-0.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete note"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Expand button */}
                        <button
                            onClick={onToggleExpand}
                            className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            title="Expand"
                        >
                            <CornerBracketIcon direction="left" className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Editable Title - fills remaining space */}
                    <div className="flex-1 overflow-hidden">
                        {isEditingTitle ? (
                            <textarea
                                ref={textareaRef}
                                value={localTitle}
                                onChange={(e) => setLocalTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-full text-xs font-medium bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none text-[var(--color-text-primary)] selection:bg-[var(--color-accent-copper)]/20 selection:text-[var(--color-text-primary)]"
                                style={{ boxShadow: 'none' }}
                                placeholder="New Note"
                            />
                        ) : (
                            <span
                                onClick={handleTitleClick}
                                className="block text-xs font-medium text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-copper)] line-clamp-6 transition-colors"
                                title="Click to edit title"
                            >
                                {localTitle || 'New Note'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Expanded state: Full note with header and content
    return (
        <div className={cn('', className)}>
            {/* Custom Header with Editable Title */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* Title segment with editable note name */}
                <div
                    className="flex items-center min-w-[220px] px-3 py-1.5 shadow-sm rounded-l-md"
                    style={{ backgroundColor: colorStyles.bg, borderColor: colorStyles.border, borderWidth: '1px', borderStyle: 'solid' }}
                >
                    {/* Editable Title */}
                    {isEditingTitle ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={handleTitleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none text-[var(--color-text-primary)] uppercase tracking-wide"
                            style={{ boxShadow: 'none' }}
                            placeholder="New Note"
                        />
                    ) : (
                        <span
                            onClick={handleTitleClick}
                            className="flex-1 min-w-0 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide cursor-pointer hover:text-[var(--color-accent-copper)] truncate transition-colors"
                            title="Click to edit title"
                        >
                            {localTitle || 'New Note'}
                        </span>
                    )}
                </div>

                {/* Corner bracket segment - expand/collapse toggle */}
                <button
                    onClick={onToggleExpand}
                    className="flex items-center justify-center p-2 shadow-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    style={{ backgroundColor: colorStyles.bg, borderColor: colorStyles.border, borderWidth: '1px', borderStyle: 'solid' }}
                    title="Collapse"
                >
                    <CornerBracketIcon direction="right" className="w-4 h-4" />
                </button>

                {/* Options menu segment */}
                <div
                    className="flex items-center shadow-sm rounded-r-md transition-all"
                    style={{ backgroundColor: colorStyles.bg, borderColor: colorStyles.border, borderWidth: '1px', borderStyle: 'solid' }}
                >
                    <button
                        onClick={() => setMenuExpanded(!isMenuExpanded)}
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
                    {isMenuExpanded && (
                        <>
                            <div className="ml-1 mr-2 h-5 w-px bg-[var(--color-border)]" />

                            {/* Color picker */}
                            <NoteColorPicker
                                selectedColor={noteColor}
                                onColorChange={handleColorChange}
                            />

                            {/* Star button */}
                            <button
                                onClick={handleStarToggle}
                                className={cn(
                                    'p-1.5 rounded transition-colors',
                                    note.isStarred
                                        ? 'text-yellow-500 hover:text-yellow-600'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                )}
                                title={note.isStarred ? 'Unstar note' : 'Star note'}
                            >
                                <Star className={cn('w-4 h-4', note.isStarred && 'fill-current')} />
                            </button>

                            {/* Generate button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
                                title="Generate content with AI"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                            </button>

                            {/* Copy button */}
                            <button
                                onClick={handleCopy}
                                disabled={isCopying}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
                                title="Copy note"
                            >
                                {isCopying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>

                            <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

                            {/* Delete button */}
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
                                title="Delete note"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="mx-2">
                <NoteContent
                    note={note}
                    onUpdate={onUpdate}
                    onCopy={onCopy}
                    onSaveTransmittal={onSaveTransmittal}
                    onLoadTransmittal={onLoadTransmittal}
                    hideTitle={true}
                    hideToolbar={true}
                />
            </div>
        </div>
    );
}

export default SingleNotePanel;
