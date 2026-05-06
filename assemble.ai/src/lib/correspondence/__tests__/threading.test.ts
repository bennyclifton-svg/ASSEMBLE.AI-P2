import {
    extractMessageIds,
    normalizeMessageId,
    normalizeSubject,
    parseAddress,
    parseAddressList,
} from '../threading';

describe('correspondence threading helpers', () => {
    it('normalizes reply and forward subject prefixes', () => {
        expect(normalizeSubject('Re: FW: Council RFI - Rooftop Plant Noise')).toBe(
            'council rfi - rooftop plant noise'
        );
        expect(normalizeSubject('  Fwd:   Tender Submission  ')).toBe('tender submission');
    });

    it('extracts normalized message ids from References headers', () => {
        expect(extractMessageIds('<A@example.com> <b@example.com> c@example.com')).toEqual([
            'a@example.com',
            'b@example.com',
            'c@example.com',
        ]);
    });

    it('normalizes angle-bracketed message ids', () => {
        expect(normalizeMessageId('<ABC@example.com>')).toBe('abc@example.com');
    });

    it('parses common email address forms', () => {
        expect(parseAddress('Jane Citizen <JANE@example.com>')).toEqual({
            name: 'Jane Citizen',
            email: 'jane@example.com',
        });

        expect(parseAddressList('a@example.com, Bob <b@example.com>')).toEqual([
            { name: null, email: 'a@example.com' },
            { name: 'Bob', email: 'b@example.com' },
        ]);
    });
});
