import type { EvaluationFirm, EvaluationRow } from '@/types/evaluation';
import {
    buildIssueSnapshot,
    clearReportDateOnAiRewrite,
    createNewTrrFromLatest,
    selectActiveTrrEvaluationPrice,
} from '../trr-linkage';

describe('TRR linkage helpers', () => {
    it('selects the user-selected price first and otherwise avoids accidental first-row fallback', () => {
        const priceInstances = [
            { id: 'price-1', evaluationPriceNumber: 1 },
            { id: 'price-3', evaluationPriceNumber: 3 },
            { id: 'price-2', evaluationPriceNumber: 2 },
        ];

        expect(selectActiveTrrEvaluationPrice({
            selectedEvaluationPriceId: 'price-2',
            activeEvaluationPriceId: 'price-3',
            priceInstances,
        })?.id).toBe('price-2');

        expect(selectActiveTrrEvaluationPrice({
            activeEvaluationPriceId: 'price-3',
            priceInstances,
        })?.id).toBe('price-3');

        expect(selectActiveTrrEvaluationPrice({
            priceInstances,
        })?.id).toBe('price-3');
    });

    it('copies latest TRR prose while clearing reportDate', () => {
        expect(createNewTrrFromLatest({
            executiveSummary: 'Summary',
            clarifications: 'Clarifications',
            recommendation: 'Recommendation',
            evaluationPriceId: 'price-1',
        })).toEqual({
            executiveSummary: 'Summary',
            clarifications: 'Clarifications',
            recommendation: 'Recommendation',
            evaluationPriceId: 'price-1',
            reportDate: null,
        });
    });

    it('clears reportDate at the AI rewrite boundary', () => {
        expect(clearReportDateOnAiRewrite(
            { reportDate: '2026-05-12' },
            { recommendation: 'Updated recommendation' }
        )).toEqual({
            recommendation: 'Updated recommendation',
            reportDate: null,
        });
    });

    it('builds an A-light issue snapshot with totals and AI source references', () => {
        const firms: EvaluationFirm[] = [
            { id: 'firm-a', companyName: 'Firm A', shortlisted: true },
        ];
        const rows: EvaluationRow[] = [
            {
                id: 'base',
                evaluationId: 'eval-1',
                tableType: 'initial_price',
                description: 'Base price',
                orderIndex: 0,
                source: 'manual',
                cells: [
                    { id: 'cell-1', rowId: 'base', firmId: 'firm-a', firmType: 'consultant', amountCents: 100_000, source: 'manual' },
                ],
            },
            {
                id: 'ai-vm',
                evaluationId: 'eval-1',
                tableType: 'value_management',
                description: 'Alternative finish',
                orderIndex: 0,
                source: 'ai',
                aiStableKey: 'ai:value_management:123',
                sourceFileAssetId: 'file-1',
                vmAdoptionStatus: 'adopted',
                cells: [
                    { id: 'cell-2', rowId: 'ai-vm', firmId: 'firm-a', firmType: 'consultant', amountCents: -10_000, source: 'ai' },
                ],
            },
        ];

        const snapshot = buildIssueSnapshot({
            trr: { id: 'trr-1', reportDate: '2026-05-12', evaluationPriceId: 'price-1' },
            evaluation: { id: 'eval-1', projectId: 'project-1', stakeholderId: 'stakeholder-1' },
            activePriceInstance: { id: 'price-1', evaluationPriceNumber: 1 },
            recommendationState: 'conditional',
            rows,
            firms,
        });

        expect(snapshot.totals.comparableTotals['firm-a']).toBe(100_000);
        expect(snapshot.totals.awardBasisTotals['firm-a']).toBe(90_000);
        expect(snapshot.selectedPriceBasis.evaluationPriceId).toBe('price-1');
        expect(snapshot.recommendationState).toBe('conditional');
        expect(snapshot.sourceReferences).toEqual([
            expect.objectContaining({
                rowId: 'ai-vm',
                aiStableKey: 'ai:value_management:123',
                sourceFileAssetId: 'file-1',
            }),
        ]);
    });
});
