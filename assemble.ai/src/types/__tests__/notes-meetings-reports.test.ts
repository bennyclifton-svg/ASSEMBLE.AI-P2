import {
    DEFAULT_NOTE_COLOR,
    getNoteColor,
    getNoteColorStyles,
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
