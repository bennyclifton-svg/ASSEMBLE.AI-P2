/**
 * SingleNotePanel Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays a single note as a collapsible section with editable title in header.
 * Multiple instances can be rendered to show Note 1, Note 2, Note 3, etc.
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { Trash, Star, Copy, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PdfIcon, DocxIcon } from '@/components/ui/file-type-icons';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
import { NoteColorPicker } from './NoteColorPicker';
import { NoteContent } from './NoteContent';
import { cn } from '@/lib/utils';
import { AuroraConfirmDialog } from '@/components/ui/aurora-confirm-dialog';
import { useNoteDropUpload, useNoteExport, type ExportFormat } from '@/lib/hooks/use-notes';
import type { Note, NoteColor } from '@/types/notes-meetings-reports';
import { NOTE_COLOR_MAP } from '@/types/notes-meetings-reports';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface SingleNotePanelProps {
    note: NoteWithCount;
    noteNumber: number;
    projectId: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (data: { title?: string; content?: string; isStarred?: boolean; color?: NoteColor; noteDate?: string | null }) => Promise<void>;
    onCopy: () => Promise<void>;
    onDelete: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function SingleNotePanel({
    note,
    noteNumber,
    projectId,
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
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [localDate, setLocalDate] = useState<string>(note.noteDate || '');

    // Sync local title when note changes
    useEffect(() => {
        setLocalTitle(note.title || 'New Note');
    }, [note.id, note.title]);

    // Sync local date when note changes
    useEffect(() => {
        setLocalDate(note.noteDate || '');
    }, [note.id, note.noteDate]);

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

    const formatNoteDate = (iso: string) => {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleDateClick = () => {
        if (!dateInputRef.current) return;
        if (!localDate) {
            dateInputRef.current.value = new Date().toISOString().split('T')[0];
        }
        dateInputRef.current.showPicker?.();
    };

    const handleDateChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalDate(val);
        await onUpdate({ noteDate: val || null });
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

    // Drop upload - auto-names note from filename when title is still default
    const handleAutoTitle = useCallback(async (title: string) => {
        setLocalTitle(title);
        await onUpdate({ title });
    }, [onUpdate]);

    const { isUploading, uploadProgress, isDragOver, getRootProps, getInputProps } = useNoteDropUpload(note.id, projectId, {
        currentTitle: note.title,
        onUpdateTitle: handleAutoTitle,
    });

    // Export note to PDF / DOCX
    const { exportNote } = useNoteExport(note.id);
    const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

    const handleExport = useCallback(async (format: ExportFormat) => {
        setExportingFormat(format);
        try {
            await exportNote(format);
        } catch (error) {
            console.error('[SingleNotePanel] Failed to export note:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to export note');
        } finally {
            setExportingFormat(null);
        }
    }, [exportNote]);

    // Get note color for header styling
    const noteColor = note.color || 'yellow';
    const colorStyles = NOTE_COLOR_MAP[noteColor];

    // Collapsed state: Square sticky note
    if (!isExpanded) {
        return (
            <>
                <div {...getRootProps()} className={cn('', className)}>
                    <input {...getInputProps()} />
                    <div
                        className={cn(
                            'relative w-[140px] h-[140px] pt-1 pr-1.5 pb-2 pl-1.5 shadow-md flex flex-col transition-all duration-150',
                            isDragOver && 'border-2 border-dashed border-[var(--color-accent-copper)] scale-105 opacity-80',
                        )}
                        style={{ backgroundColor: colorStyles.bg, color: colorStyles.text }}
                    >
                        {/* Drag-over overlay */}
                        {isDragOver && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10 pointer-events-none">
                                <Upload className="w-6 h-6 opacity-60" />
                            </div>
                        )}

                        {/* Upload progress overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10 pointer-events-none">
                                <div className="flex flex-col items-center gap-1">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {uploadProgress && uploadProgress.total > 1 && (
                                        <span className="text-[10px] font-medium">{uploadProgress.current}/{uploadProgress.total}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Top toolbar: Color dot, copy, delete, expand */}
                        <div className="flex items-center justify-between mb-1">
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
                                {isCopying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete button */}
                            <button
                                onClick={handleDeleteClick}
                                disabled={isDeleting}
                                className="p-0.5 opacity-60 hover:text-red-500 hover:opacity-100 transition-colors disabled:opacity-50"
                                title="Delete note"
                            >
                                <Trash className="w-3.5 h-3.5" />
                            </button>

                            {/* Expand button */}
                            <button
                                onClick={onToggleExpand}
                                className="p-0.5 opacity-60 hover:opacity-100 transition-colors"
                                title="Expand"
                            >
                                <CornerBracketIcon direction="left" className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Editable Title - fills remaining space, centered and lowered */}
                        <div
                            className="flex-1 overflow-hidden cursor-pointer pt-2 text-center"
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
                                    className="w-full h-full text-xs font-medium bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none text-inherit text-center selection:bg-[var(--color-accent-copper)]/20 selection:text-inherit"
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
        <div {...getRootProps()} className={cn(
            'w-full col-span-2 flex flex-col transition-all duration-150',
            isDragOver && 'border-2 border-dashed border-[var(--color-accent-copper)]',
            className,
        )}>
            <input {...getInputProps()} />
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

                    {/* Date — hidden native picker triggered by click */}
                    <input
                        ref={dateInputRef}
                        type="date"
                        value={localDate}
                        onChange={handleDateChange}
                        className="absolute opacity-0 pointer-events-none w-0 h-0"
                        tabIndex={-1}
                    />
                    {localDate ? (
                        <span
                            onClick={handleDateClick}
                            className="ml-3 shrink-0 text-xs font-medium opacity-70 hover:opacity-100 cursor-pointer transition-opacity whitespace-nowrap"
                            title="Click to change date"
                        >
                            {formatNoteDate(localDate)}
                        </span>
                    ) : (
                        <span
                            onClick={handleDateClick}
                            className="ml-3 shrink-0 text-xs opacity-40 hover:opacity-70 cursor-pointer transition-opacity whitespace-nowrap"
                            title="Set date"
                        >
                            + date
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

                    {/* Export to PDF */}
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={exportingFormat !== null}
                        className="p-1.5 opacity-60 hover:opacity-100 transition-colors disabled:opacity-50"
                        title="Export PDF"
                    >
                        {exportingFormat === 'pdf' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <PdfIcon size={20} />
                        )}
                    </button>

                    {/* Export to Word (DOCX) */}
                    <button
                        onClick={() => handleExport('docx')}
                        disabled={exportingFormat !== null}
                        className="p-1.5 opacity-60 hover:opacity-100 transition-colors disabled:opacity-50"
                        title="Export Word"
                    >
                        {exportingFormat === 'docx' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <DocxIcon size={20} />
                        )}
                    </button>

                    {/* Delete button */}
                    <button
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                        className="p-1.5 opacity-60 hover:text-red-500 hover:opacity-100 transition-colors disabled:opacity-50"
                        title="Delete note"
                    >
                        <Trash className="w-3.5 h-3.5" />
                    </button>

                    {/* Upload progress indicator */}
                    {isUploading && (
                        <>
                            <div className="mx-0.5 h-4 w-px bg-[var(--color-border)]" />
                            <div className="flex items-center gap-1 p-1.5 opacity-80">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {uploadProgress && uploadProgress.total > 1 && (
                                    <span className="text-[10px] font-medium">{uploadProgress.current}/{uploadProgress.total}</span>
                                )}
                            </div>
                        </>
                    )}
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
