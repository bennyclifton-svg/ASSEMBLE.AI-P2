/**
 * @jest-environment node
 */

import { buildAgentHistoryFromRows, buildVisibleChatRows } from '../history';

describe('buildAgentHistoryFromRows', () => {
    it('removes stale approval-card claims and duplicate retries of the latest prompt', () => {
        const prompt =
            'Client asked for extra acoustic treatment to meeting rooms. Please issue a variation for about $18,750.';

        const history = buildAgentHistoryFromRows([
            { role: 'user', content: prompt },
            {
                role: 'assistant',
                content: "I've put the proposed change in the approval card above.",
            },
            { role: 'user', content: prompt },
            {
                role: 'assistant',
                content: "I've put the proposed change in the approval card above.",
            },
            { role: 'user', content: prompt },
        ]);

        expect(history).toEqual([{ role: 'user', content: prompt }]);
    });

    it('keeps useful recent non-approval context within the history window', () => {
        const rows = Array.from({ length: 14 }, (_, index) => ({
            role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
            content: `message ${index}`,
        }));

        const history = buildAgentHistoryFromRows(rows);

        expect(history).toHaveLength(12);
        expect(history[0].content).toBe('message 2');
        expect(history[11].content).toBe('message 13');
    });

    it('drops empty assistant messages', () => {
        const history = buildAgentHistoryFromRows([
            { role: 'user', content: 'Create a note' },
            { role: 'assistant', content: '   ' },
        ]);

        expect(history).toEqual([{ role: 'user', content: 'Create a note' }]);
    });

    it('removes stale workflow failure replies before they can steer the next run', () => {
        const history = buildAgentHistoryFromRows([
            {
                role: 'assistant',
                content:
                    "I'm currently unable to issue the variation due to a technical error in the workflow process.\n\nShould I attempt to issue the variation again?",
            },
            { role: 'user', content: 'Please retry the variation' },
        ]);

        expect(history).toEqual([{ role: 'user', content: 'Please retry the variation' }]);
    });

    it('removes raw action audit database errors before they can steer the next run', () => {
        const history = buildAgentHistoryFromRows([
            {
                role: 'assistant',
                content:
                    'I could not create an approval card. Failed query: insert into "action_invocations" (...) params: secret-values',
            },
            { role: 'user', content: 'Please retry the variation' },
        ]);

        expect(history).toEqual([{ role: 'user', content: 'Please retry the variation' }]);
    });

    it('uses only the latest issue-variation workflow prompt so older test wording cannot bleed in', () => {
        const latest =
            'Client asked for extra air conditioning to meeting rooms. Please issue a variation for $9,999, link it to the right cost line/programme activity and add a short project note.';

        const history = buildAgentHistoryFromRows([
            {
                role: 'user',
                content:
                    'Client asked for extra acoustic treatment to meeting rooms. Please issue a variation for $18,750, link it to the right cost line/programme activity and add a short project note.',
            },
            {
                role: 'assistant',
                content: 'There is one open variation for extra acoustic treatment.',
            },
            { role: 'user', content: latest },
        ]);

        expect(history).toEqual([{ role: 'user', content: latest }]);
    });

    it('uses only the latest standalone variation prompt so prior invoice details cannot bleed in', () => {
        const invoicePrompt =
            'Add invoice number INV-123 for $30,000 allocated to Developer Expenses / Long Service Levy, today, status paid.';
        const latest =
            'Add a Principal variation for upgraded lobby finishes with forecast amount $5,000.';

        const history = buildAgentHistoryFromRows([
            { role: 'user', content: invoicePrompt },
            {
                role: 'assistant',
                content: "I've put the proposed change in the approval card above.",
            },
            { role: 'user', content: latest },
        ]);

        expect(history).toEqual([{ role: 'user', content: latest }]);
    });

    it('uses only the latest terse variation prompt after the exact paid-invoice chain', () => {
        const invoicePrompt =
            'add invoice of $888 to consultant acoustic design, dated 28/04/2026, noting paid.';
        const latest =
            'add variation of $1111 to architecture, detail design, approved.';

        const history = buildAgentHistoryFromRows([
            { role: 'user', content: invoicePrompt },
            {
                role: 'assistant',
                content: "I've put the proposed change in the approval card above.",
            },
            { role: 'assistant', content: 'Applied' },
            { role: 'user', content: latest },
        ]);

        expect(history).toEqual([{ role: 'user', content: latest }]);
    });

    it('uses only the latest invoice entry prompt so prior variation details cannot bleed in', () => {
        const variationPrompt =
            'Add a Principal variation for upgraded lobby finishes with forecast amount $5,000.';
        const latest =
            'Add invoice number INV-124 for $12,000 allocated to Developer Expenses / Long Service Levy.';

        const history = buildAgentHistoryFromRows([
            { role: 'user', content: variationPrompt },
            { role: 'assistant', content: 'There is one open variation.' },
            { role: 'user', content: latest },
        ]);

        expect(history).toEqual([{ role: 'user', content: latest }]);
    });

    it('keeps invoice register summaries as ordinary context-bearing read requests', () => {
        const previous = 'Add a Principal variation for upgraded lobby finishes.';
        const latest = 'I just want a log or record of all invoices for April 2026';

        const history = buildAgentHistoryFromRows([
            { role: 'user', content: previous },
            { role: 'assistant', content: 'Variation noted.' },
            { role: 'user', content: latest },
        ]);

        expect(history.map((row) => row.content)).toEqual([
            previous,
            'Variation noted.',
            latest,
        ]);
    });
});

describe('buildVisibleChatRows', () => {
    it('hides stale workflow chatter and collapses repeated retries in the dock transcript', () => {
        const prompt =
            'Client asked for extra acoustic treatment to meeting rooms. Please issue a variation for about $18,750.';

        const rows = buildVisibleChatRows([
            { role: 'assistant', content: 'Earlier useful answer' },
            { role: 'user', content: prompt, createdAt: '2026-05-02T01:00:00.000Z' },
            {
                role: 'assistant',
                content:
                    "I routed this to Finance Agent.\n\nI'm currently unable to issue the variation due to a technical error in the workflow process.",
            },
            {
                role: 'assistant',
                content:
                    'I could not create an approval card. Failed query: insert into "action_invocations" (...) params: secret-values',
            },
            { role: 'user', content: prompt, createdAt: '2026-05-02T01:02:00.000Z' },
            {
                role: 'assistant',
                content: "I've put the proposed change in the approval card above.",
            },
            { role: 'user', content: prompt, createdAt: '2026-05-02T01:04:00.000Z' },
            { role: 'assistant', content: 'Please review the approval card.' },
        ]);

        expect(rows.map((row) => row.content)).toEqual([
            'Earlier useful answer',
            prompt,
            'Please review the approval card.',
        ]);
    });

    it('keeps only the recent visible window after cleanup', () => {
        const rows = Array.from({ length: 12 }, (_, index) => ({
            role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
            content: `visible ${index}`,
        }));

        const visibleRows = buildVisibleChatRows(rows);

        expect(visibleRows).toHaveLength(10);
        expect(visibleRows[0].content).toBe('visible 2');
        expect(visibleRows[9].content).toBe('visible 11');
    });
});
