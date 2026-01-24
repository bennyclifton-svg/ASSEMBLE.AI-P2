/**
 * Note Editor Component
 * Feature 021 - Notes, Meetings & Reports
 *
 * A simple text editor for note content with auto-save.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
    content: string;
    onContentChange: (content: string) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
}

export function NoteEditor({
    content,
    onContentChange,
    placeholder = 'Type your notes here...',
    debounceMs = 500,
    className,
}: NoteEditorProps) {
    const [localContent, setLocalContent] = useState(content);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef(content);

    // Sync local content when external content changes
    useEffect(() => {
        if (content !== lastSavedRef.current) {
            setLocalContent(content);
            lastSavedRef.current = content;
        }
    }, [content]);

    const debouncedSave = useCallback((newContent: string) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Don't save if content hasn't actually changed
        if (newContent === lastSavedRef.current) {
            return;
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await onContentChange(newContent);
                lastSavedRef.current = newContent;
            } finally {
                setIsSaving(false);
            }
        }, debounceMs);
    }, [onContentChange, debounceMs]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalContent(newContent);
        debouncedSave(newContent);
    };

    // Save immediately on blur
    const handleBlur = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        if (localContent !== lastSavedRef.current) {
            setIsSaving(true);
            onContentChange(localContent);
            lastSavedRef.current = localContent;
            setIsSaving(false);
        }
    };

    return (
        <div className={cn('relative', className)}>
            <textarea
                value={localContent}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={cn(
                    'w-full min-h-[200px] p-4 bg-transparent',
                    'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                    'resize-y focus:outline-none',
                    'border-none'
                )}
                style={{
                    fontFamily: 'inherit',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                }}
            />

            {/* Saving indicator */}
            {isSaving && (
                <div className="absolute bottom-2 right-2 text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-[var(--color-accent-primary)]" />
                    Saving...
                </div>
            )}
        </div>
    );
}

export default NoteEditor;
