'use client';

import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { Check, Loader2, Trash, Upload } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { useNoteDropUpload } from '@/lib/hooks/use-notes';
import { cn } from '@/lib/utils';
import type { Note, NoteType, UpdateNoteRequest } from '@/types/notes-meetings-reports';
import {
    getNoteType,
} from '@/types/notes-meetings-reports';
import {
    getRecordTitleEditStyle,
    getRecordTypeAccent,
    getRecordTypeColor,
    getRecordTypeLabel,
    RECORD_TITLE_EDIT_INPUT_ACTIVE_CLASS,
    RECORD_TITLE_EDIT_INPUT_CLASS,
    RECORD_TYPE_ORDER,
} from './record-style';

interface NoteWithCount extends Note {
    transmittalCount: number;
}

interface NotesRowProps {
    note: NoteWithCount;
    projectId: string;
    isSelected: boolean;
    isActive: boolean;
    onSelect: (event: MouseEvent<HTMLTableRowElement>) => void;
    onUpdate: (data: UpdateNoteRequest) => Promise<void>;
    onDelete: () => void;
}

function formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function NotesRow({
    note,
    projectId,
    isSelected,
    isActive,
    onSelect,
    onUpdate,
    onDelete,
}: NotesRowProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');

    const noteType = getNoteType(note.type);
    const typeAccent = getRecordTypeAccent(noteType);
    const localDate = note.noteDate || '';

    const handleTypeChange = useCallback(async (type: NoteType) => {
        await onUpdate({ type, color: getRecordTypeColor(type) });
    }, [onUpdate]);

    const handleDateClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!dateInputRef.current) return;
        if (!localDate) {
            dateInputRef.current.value = new Date().toISOString().split('T')[0];
        }
        dateInputRef.current.showPicker?.();
    }, [localDate]);

    const handleDateChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        await onUpdate({ noteDate: value || null });
    }, [onUpdate]);

    const handleAutoTitle = useCallback(async (title: string) => {
        await onUpdate({ title });
    }, [onUpdate]);

    const handleTitleDoubleClick = useCallback((event: MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        setDraftTitle(note.title || '');
        setIsEditingTitle(true);
        requestAnimationFrame(() => {
            titleInputRef.current?.focus();
            const titleLength = titleInputRef.current?.value.length ?? 0;
            titleInputRef.current?.setSelectionRange(titleLength, titleLength);
        });
    }, [note.title]);

    const saveTitle = useCallback(async () => {
        const nextTitle = draftTitle.trim() || 'Untitled record';
        setIsEditingTitle(false);
        if (nextTitle !== note.title) {
            await onUpdate({ title: nextTitle });
        }
    }, [draftTitle, note.title, onUpdate]);

    const handleTitleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void saveTitle();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setIsEditingTitle(false);
            setDraftTitle(note.title || '');
        }
    }, [note.title, saveTitle]);

    const { isUploading, uploadProgress, isDragOver, getRootProps, getInputProps } = useNoteDropUpload(note.id, projectId, {
        currentTitle: note.title,
        onUpdateTitle: handleAutoTitle,
    });

    const rootProps = getRootProps();
    const visibleTitle = note.title || 'Untitled record';
    const displayDate = formatDate(localDate);
    const activeSubtleText = 'text-[rgba(232,228,218,0.72)]';

    return (
        <TableRow
            {...rootProps}
            onMouseDown={(event) => {
                if (event.shiftKey) event.preventDefault();
            }}
            onClick={onSelect}
            className={cn(
                'relative h-8 cursor-pointer select-none border-[var(--sw-rule-2)] border-l-2 transition-colors',
                isActive
                    ? 'border-l-4 bg-[var(--sw-ink)] text-[var(--sw-paper)] hover:bg-[var(--sw-ink)]'
                    : 'hover:bg-[var(--sw-paper-2)]',
                isSelected && !isActive && 'border-l-4 bg-[var(--sw-paper)] hover:bg-[var(--sw-paper)]',
                isDragOver && 'outline outline-1 outline-dashed outline-[var(--sw-ink)]'
            )}
            style={{ borderLeftColor: typeAccent }}
            aria-selected={isSelected}
        >
            <TableCell className="w-24 !px-3 !py-1">
                <input {...getInputProps()} />
                <div className="flex min-w-0 items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0"
                        style={{ background: typeAccent }}
                    />
                    <TypeSelect value={noteType} onChange={handleTypeChange} isActive={isActive} />
                    {isSelected && (
                        <Check
                            className={cn(
                                'ml-auto h-3 w-3 shrink-0',
                                isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-rose)]'
                            )}
                        />
                    )}
                </div>
            </TableCell>

            <TableCell className={cn('min-w-0 !px-2 !py-1', isActive ? 'text-[var(--sw-paper)]' : 'text-[var(--sw-ink)]')}>
                {isUploading ? (
                    <span className={cn('flex min-w-0 items-center gap-1.5', isActive ? activeSubtleText : 'text-[var(--sw-muted)]')}>
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        <span className="truncate">
                            Attaching{uploadProgress && uploadProgress.total > 1 ? ` ${uploadProgress.current}/${uploadProgress.total}` : ''}
                        </span>
                    </span>
                ) : isDragOver ? (
                    <span className="flex min-w-0 items-center gap-1.5 text-[var(--sw-ink)]">
                        <Upload className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Drop files</span>
                    </span>
                ) : isEditingTitle ? (
                    <input
                        ref={titleInputRef}
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onBlur={() => {
                            void saveTitle();
                        }}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={handleTitleKeyDown}
                        className={cn(
                            'h-6 w-full text-[11px]',
                            RECORD_TITLE_EDIT_INPUT_CLASS,
                            isActive && RECORD_TITLE_EDIT_INPUT_ACTIVE_CLASS
                        )}
                        style={getRecordTitleEditStyle(typeAccent, {
                            dark: isActive,
                            fontFamily: 'var(--sw-font-mono)',
                        })}
                    />
                ) : (
                    <span
                        className={cn('block truncate', (isSelected || isActive) && 'font-semibold')}
                        title={visibleTitle}
                        onDoubleClick={handleTitleDoubleClick}
                    >
                        {visibleTitle}
                    </span>
                )}
            </TableCell>

            <TableCell className="w-24 !px-3 !py-1 text-right text-[11px] text-[var(--sw-muted)]">
                <input
                    ref={dateInputRef}
                    type="date"
                    value={localDate}
                    onChange={handleDateChange}
                    onClick={(event) => event.stopPropagation()}
                    className="absolute h-0 w-0 opacity-0"
                    tabIndex={-1}
                />
                <button
                    type="button"
                    onClick={handleDateClick}
                    className={cn(
                        'max-w-full truncate transition-colors',
                        isActive ? `${activeSubtleText} hover:text-[var(--sw-paper)]` : 'text-[var(--sw-muted)] hover:text-[var(--sw-ink)]'
                    )}
                    title={displayDate ? 'Change date' : 'Set date'}
                >
                    {displayDate || '+ date'}
                </button>
            </TableCell>

            <TableCell className="w-8 !px-1 !py-1 text-right">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                    }}
                    className={cn(
                        'p-1 transition-colors',
                        isActive
                            ? 'text-[rgba(232,228,218,0.72)] hover:bg-[rgba(232,228,218,0.12)] hover:text-[var(--sw-paper)]'
                            : 'text-[var(--sw-muted)] hover:bg-[var(--sw-rose-tint)] hover:text-[var(--sw-rose-dk)]'
                    )}
                    title="Delete record"
                >
                    <Trash className="h-3.5 w-3.5" />
                </button>
            </TableCell>
        </TableRow>
    );
}

interface TypeSelectProps {
    value: NoteType;
    onChange: (type: NoteType) => Promise<void> | void;
    isActive?: boolean;
}

function TypeSelect({ value, onChange, isActive = false }: TypeSelectProps) {
    return (
        <select
            value={value}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
                void onChange(event.target.value as NoteType);
            }}
            className={cn(
                'h-6 min-w-0 max-w-[104px] appearance-none truncate bg-transparent pr-1 text-[10px] font-semibold outline-none transition-colors',
                isActive
                    ? 'text-[var(--sw-paper)] hover:text-[var(--sw-paper)] focus:text-[var(--sw-paper)]'
                    : 'text-[var(--sw-ink)] hover:text-[var(--sw-rose-dk)] focus:text-[var(--sw-rose-dk)]'
            )}
            style={{ fontFamily: 'var(--sw-font-mono)', letterSpacing: '0.02em' }}
            title="Type"
        >
            {RECORD_TYPE_ORDER.map((type) => (
                <option key={type} value={type} className="bg-white text-[var(--sw-ink)]">
                    {getRecordTypeLabel(type)}
                </option>
            ))}
        </select>
    );
}

export default NotesRow;
