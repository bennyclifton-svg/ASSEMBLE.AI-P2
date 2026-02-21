/**
 * NoteContent Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * Displays the content of an active note with title editing, content editor,
 * AI generation, and attachment section. Used within the NotesPanel.
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Star, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { NoteEditor } from './NoteEditor';
import { NoteColorPicker } from './NoteColorPicker';
import { AttachmentSection } from './shared/AttachmentSection';
import { useNoteTransmittal } from '@/lib/hooks/use-notes';
import {
    findFirstInstruction,
    refindInstruction,
    replaceInstructionWithContent,
    validateInstruction,
    extractSurroundingContent,
    hasInstructions,
} from '@/lib/editor/instruction-utils';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
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
    const [isExecuting, setIsExecuting] = useState(false);
    const [hasInstruction, setHasInstruction] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const editorRef = useRef<Editor | null>(null);

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

    const handleEditorReady = useCallback((editor: Editor) => {
        editorRef.current = editor;
        setHasInstruction(hasInstructions(editor.state));

        // Track instruction presence on every editor update
        const updateHandler = () => {
            setHasInstruction(hasInstructions(editor.state));
        };
        editor.on('update', updateHandler);
    }, []);

    const handleExecuteInstruction = useCallback(async () => {
        if (!editorRef.current) return;

        const match = findFirstInstruction(editorRef.current.state);
        if (!match) return;

        const validation = validateInstruction(match.instruction);
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        try {
            setIsExecuting(true);

            const response = await fetch('/api/ai/execute-instruction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: note.projectId,
                    instruction: match.instruction,
                    contextType: 'note',
                    contextId: note.id,
                    existingContent: extractSurroundingContent(editorRef.current),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to execute instruction');
            }

            const result = await response.json();

            // Re-find the instruction (may have moved if user typed during request)
            const updatedMatch = refindInstruction(editorRef.current.state, match.instruction);
            if (!updatedMatch) {
                toast.error('Could not find the instruction. It may have been modified.');
                return;
            }

            const success = replaceInstructionWithContent(
                editorRef.current,
                updatedMatch,
                result.content
            );

            if (!success) {
                toast.error('Failed to insert AI content');
            }

        } catch (error) {
            console.error('[NoteContent] Failed to execute instruction:', error);
            toast.error('Failed to execute instruction');
        } finally {
            setIsExecuting(false);
        }
    }, [note.id, note.projectId]);

    const noteColor = note.color || 'yellow';
    const colorStyles = NOTE_COLOR_MAP[noteColor];

    return (
        <div
            className={cn('px-4 pb-4 transition-colors note-colored-scrollbar note-dark-text', hideTitle && hideToolbar ? 'pt-0' : 'pt-2', className)}
            style={{
                backgroundColor: colorStyles.bg,
                color: colorStyles.text,
                '--note-scrollbar-thumb': colorStyles.scrollbar,
                '--note-scrollbar-track': colorStyles.bg,
            } as React.CSSProperties}
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
                                    className="text-lg font-semibold text-inherit cursor-pointer hover:text-[var(--color-accent-copper)] truncate"
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
                                        : 'opacity-60 hover:opacity-100'
                                )}
                                title={note.isStarred ? 'Unstar note' : 'Star note'}
                            >
                                <Star className={cn('w-4 h-4', note.isStarred && 'fill-current')} />
                            </button>

                            {/* Copy button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                disabled={isCopying}
                                className="h-8 px-2 opacity-60 hover:opacity-100 hover:bg-[var(--color-border)]"
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
            <div className={cn('flex-1 min-h-0', (!hideTitle || !hideToolbar) && 'mt-4')}>
                <NoteEditor
                    content={note.content || ''}
                    onContentChange={handleContentChange}
                    onEditorReady={handleEditorReady}
                    transparentBg={true}
                    className="h-full"
                    toolbarExtra={
                        <div className="flex items-center gap-3">
                            {hasInstruction && (
                                <button
                                    onClick={handleExecuteInstruction}
                                    disabled={isExecuting || isGenerating}
                                    className={cn(
                                        'flex items-center gap-1.5 text-sm font-medium transition-all',
                                        isExecuting
                                            ? 'text-[var(--color-accent-copper)] cursor-wait'
                                            : isGenerating
                                                ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                                : 'text-[var(--color-accent-copper)] hover:opacity-80'
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
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || isExecuting}
                                className={cn(
                                    'flex items-center gap-1.5 text-sm font-medium transition-all',
                                    isGenerating
                                        ? 'text-[var(--color-accent-copper)] cursor-wait'
                                        : isExecuting
                                            ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
                                            : 'text-[var(--color-accent-copper)] hover:opacity-80'
                                )}
                                title="Generate content with AI"
                            >
                                <DiamondIcon
                                    className={cn('w-4 h-4', isGenerating && 'animate-diamond-spin')}
                                    variant="empty"
                                />
                                <span className={isGenerating ? 'animate-text-aurora' : ''}>
                                    {isGenerating ? 'Generating...' : 'Generate'}
                                </span>
                            </button>
                        </div>
                    }
                />
            </div>

            {/* Attachment section - compact for notes */}
            <div className="mt-4 shrink-0">
                <AttachmentSection
                    documents={documents}
                    isLoading={transmittalLoading}
                    onSave={onSaveTransmittal}
                    onLoad={onLoadTransmittal}
                    compact={true}
                />
            </div>
        </div>
    );
}

export default NoteContent;
