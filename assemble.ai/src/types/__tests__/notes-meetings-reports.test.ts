import {
    DEFAULT_NOTE_COLOR,
    DEFAULT_NOTE_STATUS,
    DEFAULT_NOTE_TYPE,
    getNoteColor,
    getNoteColorStyles,
    getNoteStatus,
    getNoteStatusLabel,
    getNoteType,
    getNoteTypeLabel,
    NOTE_COLOR_MAP,
} from '../notes-meetings-reports';

describe('note color helpers', () => {
    it('falls back to the default color for invalid persisted values', () => {
        expect(getNoteColor(undefined)).toBe(DEFAULT_NOTE_COLOR);
        expect(getNoteColor(null)).toBe(DEFAULT_NOTE_COLOR);
        expect(getNoteColor('purple')).toBe(DEFAULT_NOTE_COLOR);
        expect(getNoteColorStyles('purple')).toBe(NOTE_COLOR_MAP[DEFAULT_NOTE_COLOR]);
    });

    it('returns configured styles for valid colors', () => {
        expect(getNoteColor('blue')).toBe('blue');
        expect(getNoteColorStyles('blue')).toBe(NOTE_COLOR_MAP.blue);
    });
});

describe('note metadata helpers', () => {
    it('falls back to defaults for invalid persisted values', () => {
        expect(getNoteType('unknown')).toBe(DEFAULT_NOTE_TYPE);
        expect(getNoteStatus('stale')).toBe(DEFAULT_NOTE_STATUS);
    });

    it('returns labels for valid note metadata', () => {
        expect(getNoteTypeLabel('eot')).toBe('EOT');
        expect(getNoteStatusLabel('closed')).toBe('Closed');
    });
});
