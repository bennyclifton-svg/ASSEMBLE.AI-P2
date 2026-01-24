/**
 * Note Card Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A collapsible card for displaying and editing a note.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CardHeader } from './shared/CardHeader';
import { NoteEditor } from './NoteEditor';
import { AttachmentSection } from './shared/AttachmentSection';
import { useNoteTransmittal } from '@/lib/hooks/use-notes';
import type { Note } from '@/types/notes-meetings-reports';
import { cn } from '@/lib/utils';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface NoteCardProps {
    note: NoteWithCount;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    onUpdate: (data: { title?: string; content?: string; isStarred?: boolean }) => Promise<void>;
    onCopy: () => Promise<void>;
    onDelete: () => Promise<void>;
    onSaveTransmittal?: () => void;
    onLoadTransmittal?: () => void;
    className?: string;
}

export function NoteCard({
    note,
    isExpanded = false,
    onToggleExpand,
    onUpdate,
    onCopy,
    onDelete,
    onSaveTransmittal,
    onLoadTransmittal,
    className,
}: NoteCardProps) {
    const [localExpanded, setLocalExpanded] = useState(isExpanded);
    const expanded = onToggleExpand ? isExpanded : localExpanded;

    const { documents, isLoading: transmittalLoading } = useNoteTransmittal(
        expanded ? note.id : null
    );

    const handleToggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalExpanded(!localExpanded);
        }
    };

    const handleTitleChange = async (newTitle: string) => {
        await onUpdate({ title: newTitle });
    };

    const handleStarToggle = async () => {
        await onUpdate({ isStarred: !note.isStarred });
    };

    const handleContentChange = async (content: string) => {
        await onUpdate({ content });
    };

    return (
        <Card
            variant="translucent"
            className={cn('overflow-hidden', className)}
        >
            <CardHeader
                title={note.title}
                isExpanded={expanded}
                isStarred={note.isStarred}
                onToggleExpand={handleToggleExpand}
                onTitleChange={handleTitleChange}
                onStarToggle={handleStarToggle}
                onCopy={onCopy}
                onDelete={onDelete}
                showStar={true}
                showCopy={true}
                showDelete={true}
            />

            {expanded && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <NoteEditor
                        content={note.content || ''}
                        onContentChange={handleContentChange}
                    />

                    <AttachmentSection
                        documents={documents}
                        isLoading={transmittalLoading}
                        onSave={onSaveTransmittal}
                        onLoad={onLoadTransmittal}
                    />
                </div>
            )}
        </Card>
    );
}

export default NoteCard;
