import {
    COST_LINE_MATCH_THRESHOLD,
    rankCostLineMatches,
    textScore,
    type CostLineMatchRow,
} from '../cost-line-matching';

const rows: CostLineMatchRow[] = [
    {
        id: 'cl-lsl',
        section: 'FEES',
        costCode: '1.04',
        activity: 'Long Service Levy',
        reference: null,
        stakeholderName: null,
        disciplineOrTrade: null,
    },
    {
        id: 'cl-fire',
        section: 'SERVICES',
        costCode: '4.20',
        activity: 'Fire services + fire engineering',
        reference: null,
        stakeholderName: null,
        disciplineOrTrade: 'Fire',
    },
    {
        id: 'cl-mech',
        section: 'SERVICES',
        costCode: '4.10',
        activity: 'Mechanical services',
        reference: 'HVAC',
        stakeholderName: null,
        disciplineOrTrade: 'Mechanical',
    },
];

describe('cost-line matching', () => {
    it('matches typoed partial labels to a longer cost-line activity', () => {
        const matches = rankCostLineMatches(rows, { reference: 'Fire Servcies' });

        expect(matches[0]).toEqual(
            expect.objectContaining({
                row: expect.objectContaining({ id: 'cl-fire' }),
                score: expect.any(Number),
            })
        );
        expect(matches[0].score).toBeGreaterThanOrEqual(COST_LINE_MATCH_THRESHOLD);
    });

    it('scores transposed service typos as close matches', () => {
        expect(textScore('Fire Servcies', 'Fire services + fire engineering')).toBeGreaterThan(0.8);
    });

    it('uses the supplied cost category and line item to resolve developer expense invoices', () => {
        const matches = rankCostLineMatches(rows, {
            category: 'Developer Expenses',
            reference: 'Long Service Levy',
        });

        expect(matches[0]).toEqual(
            expect.objectContaining({
                row: expect.objectContaining({ id: 'cl-lsl' }),
                score: expect.any(Number),
            })
        );
        expect(matches[0].score).toBeGreaterThanOrEqual(COST_LINE_MATCH_THRESHOLD);
    });

    it('treats developer expense supplied as an owner label as the fees category', () => {
        const matches = rankCostLineMatches(rows, {
            discipline: 'Developer Expense',
            reference: 'Long Service Levy',
        });

        expect(matches[0]?.row.id).toBe('cl-lsl');
    });
});
