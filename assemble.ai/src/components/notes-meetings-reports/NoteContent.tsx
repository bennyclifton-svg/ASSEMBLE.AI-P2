/**
 * NoteContent Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays the content of an active note with title editing, content editor,
 * AI generation, and attachment section. Used within the NotesPanel.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Star, Copy, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NoteEditor } from './NoteEditor';
import { NoteColorPicker } from './NoteColorPicker';
import { AttachmentSection } from './shared/AttachmentSection';
import { useNoteTransmittal } from '@/lib/hooks/use-notes';
import type { Note, NoteColor, GenerateNoteContentResponse } from '@/types/notes-meetings-reports';
import { NOTE_COLOR_MAP } from '@/types/notes-meetings-reports';
import { cn } from '@/lib/utils';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface NoteContentProps {
    note: NoteWithCount;
    onUpdate: (data: { title?: string; content?: string; isStarred?: boolean; color?: NoteColor }) => Promise<void>;
    onCopy: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    /** Hide the title row (when title is shown in header instead) */
    hideTitle?: boolean;
    /** Hide the toolbar icons (when shown in header instead) */
    hideToolbar?: boolean;
    className?: string;
}

export function NoteContent({
    note,
    onUpdate,
    onCopy,
    onSaveTransmittal,
    onLoadTransmittal,
    hideTitle = false,
    hideToolbar = false,
    className,
}: NoteContentProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(note.title);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const { documents, isLoading: transmittalLoading } = useNoteTransmittal(note.id);

    // Reset local title when note changes
    React.useEffect(() => {
        setLocalTitle(note.title);
    }, [note.id, note.title]);

    const handleTitleClick = () => {
        setIsEditingTitle(true);
    };

    const handleTitleBlur = async () => {
        setIsEditingTitle(false);
        if (localTitle !== note.title) {
            await onUpdate({ title: localTitle });
        }
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditingTitle(false);
            if (localTitle !== note.title) {
                onUpdate({ title: localTitle });
            }
        } else if (e.key === 'Escape') {
            setLocalTitle(note.title);
            setIsEditingTitle(false);
        }
    };

    const handleStarToggle = async () => {
        await onUpdate({ isStarred: !note.isStarred });
    };

    const handleColorChange = async (color: NoteColor) => {
        await onUpdate({ color });
    };

    const handleContentChange = async (content: string) => {
        await onUpdate({ content });
    };

    const handleCopy = async () => {
        setIsCopying(true);
        try {
            await onCopy();
        } finally {
            setIsCopying(false);
        }
    };

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

            // Update the note content with generated content
            await onUpdate({ content: result.content });

            console.log(`[NoteContent] Generated content using ${result.sourcesUsed.attachedDocs} attached docs and ${result.sourcesUsed.ragChunks} RAG chunks`);

        } catch (error) {
            console.error('[NoteContent] Failed to generate content:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [note.id, note.projectId, note.content, note.title, onUpdate]);

    const noteColor = note.color || 'yellow';
    const colorStyles = NOTE_COLOR_MAP[noteColor];

    return (
        <div
            className={cn('space-y-4 px-4 pt-2 pb-4 transition-colors', className)}
            style={{
                backgroundColor: colorStyles.bg,
            }}
        >
            {/* Toolbar with title, color picker, and actions (hidden when both hideTitle and hideToolbar are true) */}
            {(!hideTitle || !hideToolbar) && (
                <div className="flex items-center justify-between gap-4">
                    {/* Title - click to edit (hidden when hideTitle is true) */}
                    {!hideTitle && (
                        <div className="flex-1 min-w-0">
                            {isEditingTitle ? (
                                <Input
                                    value={localTitle}
                                    onChange={(e) => setLocalTitle(e.target.value)}
                                    onBlur={handleTitleBlur}
                                    onKeyDown={handleTitleKeyDown}
                                    autoFocus
                                    className="h-8 text-lg font-semibold bg-transparent border-[var(--color-border)] focus:border-[var(--color-accent-copper)]"
                                />
                            ) : (
                                <h2
                                    onClick={handleTitleClick}
                                    className="text-lg font-semibold text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent-copper)] truncate"
                                    title="Click to edit title"
                                >
                                    {note.title}
                                </h2>
                            )}
                        </div>
                    )}

                    {/* Color picker and action buttons (hidden when hideToolbar is true) */}
                    {!hideToolbar && (
                        <div className={cn("flex items-center gap-3", hideTitle && "flex-1 justify-end")}>
                            {/* Color picker */}
                            <NoteColorPicker
                                selectedColor={noteColor}
                                onColorChange={handleColorChange}
                            />

                            {/* Divider */}
                            <div className="h-5 w-px bg-[var(--color-border)]" />

                            {/* Star button */}
                            <button
                                onClick={handleStarToggle}
                                className={cn(
                                    'p-1 rounded transition-colors',
                                    note.isStarred
                                        ? 'text-yellow-500 hover:text-yellow-600'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                )}
                                title={note.isStarred ? 'Unstar note' : 'Star note'}
                            >
                                <Star className={cn('w-4 h-4', note.isStarred && 'fill-current')} />
                            </button>

                            {/* Generate button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="h-8 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                                title="Generate content with AI"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                            </Button>

                            {/* Copy button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                disabled={isCopying}
                                className="h-8 px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                                title="Copy note"
                            >
                                {isCopying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Content editor - borderless to match RFT */}
            <NoteEditor
                content={note.content || ''}
                onContentChange={handleContentChange}
                transparentBg={true}
            />

            {/* Attachment section - compact for notes */}
            <AttachmentSection
                documents={documents}
                isLoading={transmittalLoading}
                onSave={onSaveTransmittal}
                onLoad={onLoadTransmittal}
                compact={true}
            />
        </div>
    );
}

export default NoteContent;
