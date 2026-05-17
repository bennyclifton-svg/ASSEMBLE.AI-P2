import type { EvaluationFirm, EvaluationRow } from '@/types/evaluation';
import {
    calculateTenderEvaluationTotals,
    generateAiStableKey,
    getAmountCellCents,
    parseEvaluationCellInput,
    validateAiEvaluationMutations,
} from '../tender-commercial';

const firms: EvaluationFirm[] = [
    { id: 'firm-a', companyName: 'Firm A', shortlisted: true },
    { id: 'firm-b', companyName: 'Firm B', shortlisted: true },
];

function row(partial: Partial<EvaluationRow>): EvaluationRow {
    return {
        id: partial.id ?? 'row-1',
        evaluationId: 'eval-1',
        tableType: partial.tableType ?? 'initial_price',
        description: partial.description ?? 'Design services',
        orderIndex: partial.orderIndex ?? 0,
        source: partial.source ?? 'manual',
        cells: partial.cells ?? [],
        ...partial,
    };
}

describe('tender commercial helpers', () => {
    it('keeps comparable totals separate from adopted VM totals', () => {
        const totals = calculateTenderEvaluationTotals([
            row({
                id: 'base',
                tableType: 'initial_price',
                cells: [
                    { id: 'c1', rowId: 'base', firmId: 'firm-a', firmType: 'consultant', amountCents: 100_000, source: 'manual' },
                    { id: 'c2', rowId: 'base', firmId: 'firm-b', firmType: 'consultant', amountCents: 120_000, source: 'manual' },
                ],
            }),
            row({
                id: 'adds',
                tableType: 'adds_subs',
                cells: [
                    { id: 'c3', rowId: 'adds', firmId: 'firm-a', firmType: 'consultant', amountCents: 10_000, source: 'manual' },
                    { id: 'c4', rowId: 'adds', firmId: 'firm-b', firmType: 'consultant', amountCents: -5_000, source: 'manual' },
                ],
            }),
            row({
                id: 'vm-adopted',
                tableType: 'value_management',
                vmAdoptionStatus: 'adopted',
                vmEmbeddedInBase: false,
                cells: [
                    { id: 'c5', rowId: 'vm-adopted', firmId: 'firm-a', firmType: 'consultant', amountCents: -15_000, source: 'manual' },
                ],
            }),
            row({
                id: 'vm-embedded',
                tableType: 'value_management',
                vmAdoptionStatus: 'adopted',
                vmEmbeddedInBase: true,
                cells: [
                    { id: 'c6', rowId: 'vm-embedded', firmId: 'firm-a', firmType: 'consultant', amountCents: -50_000, source: 'manual' },
                ],
            }),
            row({
                id: 'vm-tbd',
                tableType: 'value_management',
                vmAdoptionStatus: 'tbd',
                vmEmbeddedInBase: false,
                cells: [
                    { id: 'c7', rowId: 'vm-tbd', firmId: 'firm-b', firmType: 'consultant', amountCents: -20_000, source: 'manual' },
                ],
            }),
        ], firms);

        expect(totals.comparableTotals).toEqual({
            'firm-a': 110_000,
            'firm-b': 115_000,
        });
        expect(totals.valueManagementSubtotals).toEqual({
            'firm-a': -15_000,
            'firm-b': 0,
        });
        expect(totals.awardBasisTotals).toEqual({
            'firm-a': 95_000,
            'firm-b': 115_000,
        });
        expect(totals.grandTotals).toEqual(totals.comparableTotals);
    });

    it('does not let status cells contribute to totals', () => {
        expect(getAmountCellCents({
            amountCents: 99_999,
            valueType: 'included',
        })).toBe(0);
    });

    it('parses user-entered cell statuses and amounts', () => {
        expect(parseEvaluationCellInput('included')).toEqual({
            amountCents: 0,
            valueType: 'included',
        });
        expect(parseEvaluationCellInput('assumed included')).toEqual({
            amountCents: 0,
            valueType: 'assumed_included',
        });
        expect(parseEvaluationCellInput('($5,500)')).toEqual({
            amountCents: -550_000,
            valueType: 'amount',
        });
    });

    it('generates stable keys independent of source file ordering and punctuation', () => {
        const first = generateAiStableKey({
            tableType: 'adds_subs',
            category: 'Scope Gap',
            commercialIssue: 'Extra meetings / attendance!',
            packageId: 'pkg-a',
            firmId: 'firm-a',
            sourceFileAssetIds: ['file-2', 'file-1'],
        });

        const second = generateAiStableKey({
            tableType: 'adds_subs',
            category: 'scope gap',
            commercialIssue: 'extra meetings attendance',
            packageId: 'pkg-a',
            firmId: 'firm-a',
            sourceFileAssetIds: ['file-1', 'file-2'],
        });

        expect(first).toBe(second);
    });

    it('rejects AI mutations that lack evidence or touch user rows', () => {
        const existing = row({ id: 'manual-row', source: 'manual' });

        const result = validateAiEvaluationMutations([
            {
                kind: 'update',
                rowId: 'manual-row',
                patch: { description: 'Changed by AI' },
            },
            {
                kind: 'create',
                row: row({
                    id: 'ai-row',
                    source: 'ai',
                    aiStableKey: 'ai:adds_subs:abc',
                    tableType: 'adds_subs',
                }),
            },
        ], [existing]);

        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([
                'update:manual-row: user/system rows cannot be changed by AI',
                'ai-row: AI rows require a source document or file reference',
            ])
        );
    });

    it('allows AI updates to unlocked AI rows with source references', () => {
        const existing = row({
            id: 'ai-row',
            source: 'ai',
            aiStableKey: 'ai:adds_subs:abc',
            sourceFileAssetId: 'file-1',
        });

        const result = validateAiEvaluationMutations([
            {
                kind: 'update',
                rowId: 'ai-row',
                patch: { description: 'Updated AI row' },
            },
        ], [existing]);

        expect(result).toEqual({ ok: true, errors: [] });
    });
});
