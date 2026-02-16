/**
 * SingleNotePanel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays a single note as a collapsible section with editable title in header.
 * Multiple instances can be rendered to show Note 1, Note 2, Note 3, etc.
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { Trash, Star, Copy, Loader2 } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { NoteColorPicker } from './NoteColorPicker';
import { NoteContent } from './NoteContent';
import { cn } from '@/lib/utils';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import type { Note, NoteColor } from '@/types/notes-meetings-reports';
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(note.title || 'New Note');
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

    const handleDeleteClick = useCallback(() => {
        setDeleteDialogOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
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

    // Get note color for header styling
    const noteColor = note.color || 'yellow';
    const colorStyles = NOTE_COLOR_MAP[noteColor];

    // Collapsed state: Square sticky note
    if (!isExpanded) {
        return (
            <>
                <div className={cn('', className)}>
                    <div
                        className="relative w-[140px] h-[140px] pt-1 pr-1.5 pb-2 pl-1.5 shadow-md flex flex-col"
                        style={{ backgroundColor: colorStyles.bg, color: colorStyles.text }}
                    >
                        {/* Top toolbar: Color dot, copy, delete, expand */}
                        <div className="flex items-center justify-end gap-2 mb-1">
                            {/* Color picker - compact mode */}
                            <NoteColorPicker
                                selectedColor={noteColor}
                                onColorChange={handleColorChange}
                                compact={true}
                            />

                            {/* Copy button */}
                            <button
                                onClick={handleCopy}
                                disabled={isCopying}
                                className="p-0.5 opacity-60 hover:opacity-100 transition-colors disabled:opacity-50"
                                title="Copy note"
                            >
                                {isCopying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                            </button>

                            {/* Delete button */}
                            <button
                                onClick={handleDeleteClick}
                                disabled={isDeleting}
                                className="p-0.5 opacity-60 hover:text-red-500 hover:opacity-100 transition-colors disabled:opacity-50"
                                title="Delete note"
                            >
                                <Trash className="w-3 h-3" />
                            </button>

                            {/* Expand button */}
                            <button
                                onClick={onToggleExpand}
                                className="p-0.5 -mt-0.5 opacity-60 hover:opacity-100 transition-colors"
                                title="Expand"
                            >
                                <CornerBracketIcon direction="left" className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Editable Title - fills remaining space, entire area clickable */}
                        <div
                            className="flex-1 overflow-hidden cursor-pointer"
                            onClick={!isEditingTitle ? handleTitleClick : undefined}
                            title={!isEditingTitle ? "Click to edit title" : undefined}
                        >
                            {isEditingTitle ? (
                                <textarea
                                    ref={textareaRef}
                                    value={localTitle}
                                    onChange={(e) => setLocalTitle(e.target.value)}
                                    onBlur={handleTitleBlur}
                                    onKeyDown={handleTitleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full h-full text-xs font-medium bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none text-inherit selection:bg-[var(--color-accent-copper)]/20 selection:text-inherit"
                                    style={{ boxShadow: 'none' }}
                                    placeholder="New Note"
                                />
                            ) : (
                                <span className="block text-xs font-medium text-inherit hover:text-[var(--color-accent-copper)] line-clamp-6 transition-colors">
                                    {localTitle || 'New Note'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                <AuroraConfirmDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={handleConfirmDelete}
                    title="Delete this note?"
                    description="This will permanently delete this note and all its attachments."
                />
            </>
        );
    }

    // Expanded state: Full note with header and content (spans full grid width)
    return (
        <div className={cn('w-full col-span-2 flex flex-col', className)}>
            {/* Custom Header with Editable Title */}
            <div className="flex items-stretch gap-0.5 p-2">
                {/* Title segment with editable note name */}
                <div
                    className="flex items-center flex-1 min-w-0 px-3 py-3 border border-[var(--color-border)] shadow-sm rounded-l-md"
                    style={{ backgroundColor: colorStyles.bg, color: colorStyles.text }}
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
                            className="flex-1 min-w-0 h-5 leading-5 text-sm font-semibold bg-transparent text-inherit p-0 m-0"
                            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                            placeholder="New Note"
                        />
                    ) : (
                        <span
                            onClick={handleTitleClick}
                            className="flex-1 min-w-0 h-5 leading-5 text-sm font-semibold text-inherit cursor-pointer hover:text-[var(--color-accent-copper)] truncate transition-colors"
                            title="Click to edit title"
                        >
                            {localTitle || 'New Note'}
                        </span>
                    )}
                </div>

                {/* Corner bracket segment - expand/collapse toggle */}
                <button
                    onClick={onToggleExpand}
                    className="flex items-center justify-center aspect-square px-3 border border-[var(--color-border)] shadow-sm opacity-60 hover:opacity-100 transition-colors"
                    style={{ backgroundColor: colorStyles.bg, color: colorStyles.text }}
                    title="Collapse"
                >
                    <CornerBracketIcon direction="right" className="w-3.5 h-3.5" />
                </button>

                {/* Tools segment - always visible */}
                <div
                    className="flex items-center gap-1.5 px-2 border border-[var(--color-border)] shadow-sm rounded-r-md"
                    style={{ backgroundColor: colorStyles.bg, color: colorStyles.text }}
                >
                    {/* Star button */}
                    <button
                        onClick={handleStarToggle}
                        className={cn(
                            'p-1.5 rounded transition-colors',
                            note.isStarred
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'opacity-60 hover:opacity-100'
                        )}
                        title={note.isStarred ? 'Unstar note' : 'Star note'}
                    >
                        <Star className={cn('w-3.5 h-3.5', note.isStarred && 'fill-current')} />
                    </button>

                    {/* Copy button */}
                    <button
                        onClick={handleCopy}
                        disabled={isCopying}
                        className="p-1.5 opacity-60 hover:opacity-100 transition-colors disabled:opacity-50"
                        title="Copy note"
                    >
                        {isCopying ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Copy className="w-3.5 h-3.5" />
                        )}
                    </button>

                    {/* Color picker */}
                    <NoteColorPicker
                        selectedColor={noteColor}
                        onColorChange={handleColorChange}
                    />

                    <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />

                    {/* Delete button */}
                    <button
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                        className="p-1.5 opacity-60 hover:text-red-500 hover:opacity-100 transition-colors disabled:opacity-50"
                        title="Delete note"
                    >
                        <Trash className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AuroraConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                title="Delete this note?"
                description="This will permanently delete this note and all its attachments."
            />

            {/* Content Area */}
            <div className="mx-2 -mt-px">
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
