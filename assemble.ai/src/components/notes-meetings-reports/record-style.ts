import type { CSSProperties } from 'react';
import type { NoteColor, NoteType } from '@/types/notes-meetings-reports';

export const RECORD_TYPE_ORDER: NoteType[] = [
    'note',
    'review',
    'rfi',
    'notice',
    'eot',
    'variation',
    'risk',
    'transmittal',
    'defect',
];

export const RECORD_TYPE_LABELS: Record<NoteType, string> = {
    rfi: 'RFI',
    notice: 'notice',
    eot: 'EOT',
    defect: 'defect',
    variation: 'variation',
    risk: 'risk',
    transmittal: 'transmittal',
    review: 'review',
    note: 'note',
};

export const RECORD_TYPE_ACCENTS: Record<NoteType, string> = {
    rfi: 'var(--sw-rose)',
    notice: 'var(--sw-cyan)',
    eot: 'var(--sw-peach)',
    defect: 'var(--sw-rose)',
    variation: 'var(--sw-lav)',
    risk: 'var(--sw-peach)',
    transmittal: 'var(--sw-cyan)',
    review: 'var(--sw-lav)',
    note: 'var(--sw-cyan)',
};

export const RECORD_TYPE_COLORS: Record<NoteType, NoteColor> = {
    rfi: 'pink',
    notice: 'blue',
    eot: 'orange',
    defect: 'pink',
    variation: 'purple',
    risk: 'orange',
    transmittal: 'blue',
    review: 'purple',
    note: 'blue',
};

export function getRecordTypeAccent(type: NoteType): string {
    return RECORD_TYPE_ACCENTS[type];
}

export function getRecordTypeLabel(type: NoteType): string {
    return RECORD_TYPE_LABELS[type];
}

export function getRecordTypeColor(type: NoteType): NoteColor {
    return RECORD_TYPE_COLORS[type];
}

export const RECORD_TITLE_EDIT_INPUT_CLASS = [
    'min-w-0 border-0 px-2 text-[var(--sw-ink)] outline-none',
    'transition-[background-color,box-shadow,color] duration-150',
    'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
    'selection:bg-[var(--sw-rose-tint)] selection:text-[var(--sw-ink)]',
].join(' ');

export const RECORD_TITLE_EDIT_INPUT_ACTIVE_CLASS = [
    'text-[var(--sw-paper)]',
    'selection:bg-[rgba(232,228,218,0.22)] selection:text-[var(--sw-paper)]',
].join(' ');

export function getRecordTitleEditStyle(
    accent: string,
    options: { dark?: boolean; fontFamily?: string } = {}
): CSSProperties {
    return {
        backgroundColor: options.dark
            ? 'rgba(232, 228, 218, 0.10)'
            : 'color-mix(in srgb, var(--record-title-edit-accent) 10%, white)',
        boxShadow: `inset 0 -2px 0 ${accent}`,
        fontFamily: options.fontFamily,
        '--record-title-edit-accent': accent,
    } as CSSProperties;
}
