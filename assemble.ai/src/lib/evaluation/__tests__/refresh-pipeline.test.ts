import type { EvaluationRow } from '@/types/evaluation';
import {
    runRefreshEvaluationPipeline,
    type RefreshEvaluationAdapters,
    type RefreshEvaluationInput,
} from '../refresh-pipeline';
import type { ProposedEvaluationRowMutation } from '../tender-commercial';

const input: RefreshEvaluationInput = {
    projectId: 'project-1',
    stakeholderId: 'stakeholder-1',
    evaluationId: 'eval-1',
    evaluationPriceId: 'price-1',
    modelId: 'stub-model',
    promptHash: 'prompt-hash',
};

function row(partial: Partial<EvaluationRow>): EvaluationRow {
    return {
        id: partial.id ?? 'row-1',
        evaluationId: 'eval-1',
        evaluationPriceId: 'price-1',
        tableType: partial.tableType ?? 'adds_subs',
        description: partial.description ?? 'Scope gap',
        orderIndex: partial.orderIndex ?? 0,
        source: partial.source ?? 'ai',
        sourceFileAssetId: partial.sourceFileAssetId ?? 'file-1',
        aiStableKey: partial.aiStableKey ?? 'ai:adds_subs:stable',
        cells: partial.cells ?? [],
        ...partial,
    };
}

function makeAdapters(rowsRef: { rows: EvaluationRow[] }, recorded: unknown[] = []): RefreshEvaluationAdapters {
    const applyMutations = async (_input: RefreshEvaluationInput, mutations: ProposedEvaluationRowMutation[]) => {
        for (const mutation of mutations) {
            if (mutation.kind === 'create') {
                rowsRef.rows = [...rowsRef.rows, mutation.row];
            } else if (mutation.kind === 'update') {
                rowsRef.rows = rowsRef.rows.map((existing) =>
                    existing.id === mutation.rowId
                        ? ({ ...existing, ...mutation.patch } as EvaluationRow)
                        : existing
                );
            } else {
                rowsRef.rows = rowsRef.rows.filter((existing) => existing.id !== mutation.rowId);
            }
        }
    };

    return {
        loadState: async () => ({
            recommendationState: 'draft',
            rows: rowsRef.rows,
            packages: [],
        }),
        generateRowProposals: async () => [
            {
                tableType: 'adds_subs',
                description: 'Scope gap',
                firmId: 'firm-a',
                firmType: 'consultant',
                amountCents: 12_000,
                category: 'scope',
                packageId: 'package-1',
                sourceFileAssetId: 'file-1',
                sourceFileAssetIds: ['file-1'],
                aiStableKey: 'ai:adds_subs:stable',
            },
        ],
        applyMutations,
        recordAction: async (_input, audit) => {
            recorded.push(audit);
            return `action-${recorded.length}`;
        },
    };
}

describe('refresh evaluation pipeline', () => {
    it('is idempotent for unchanged proposal inputs', async () => {
        const rowsRef = { rows: [] as EvaluationRow[] };
        const recorded: unknown[] = [];
        const adapters = makeAdapters(rowsRef, recorded);

        const first = await runRefreshEvaluationPipeline(input, adapters);
        const second = await runRefreshEvaluationPipeline(input, adapters);

        expect(first.summary.created.adds_subs).toBe(1);
        expect(second.summary).toEqual({
            created: { initial_price: 0, adds_subs: 0, value_management: 0 },
            updated: { initial_price: 0, adds_subs: 0, value_management: 0 },
            removed: { initial_price: 0, adds_subs: 0, value_management: 0 },
        });
        expect(recorded).toHaveLength(2);
        expect(second.actionInvocationId).toBe('action-2');
    });

    it('does not touch locked AI rows', async () => {
        const rowsRef = {
            rows: [
                row({
                    id: 'locked-ai',
                    isLocked: true,
                    description: 'Locked wording',
                    cells: [
                        { id: 'cell-1', rowId: 'locked-ai', firmId: 'firm-a', firmType: 'consultant', amountCents: 1, source: 'ai' },
                    ],
                }),
            ],
        };

        const result = await runRefreshEvaluationPipeline(input, makeAdapters(rowsRef));

        expect(result.summary.updated.adds_subs).toBe(0);
        expect(rowsRef.rows[0].description).toBe('Locked wording');
        expect(rowsRef.rows[0].cells?.[0].amountCents).toBe(1);
    });

    it('does not mutate user-created rows even when the proposal has similar content', async () => {
        const rowsRef = {
            rows: [
                row({
                    id: 'manual-row',
                    source: 'manual',
                    aiStableKey: null,
                    description: 'Scope gap',
                    sourceFileAssetId: null,
                    cells: [
                        { id: 'manual-cell', rowId: 'manual-row', firmId: 'firm-a', firmType: 'consultant', amountCents: 5_000, source: 'manual' },
                    ],
                }),
            ],
        };

        const result = await runRefreshEvaluationPipeline(input, makeAdapters(rowsRef));

        expect(result.summary.created.adds_subs).toBe(1);
        expect(rowsRef.rows.find((candidate) => candidate.id === 'manual-row')?.cells?.[0].amountCents).toBe(5_000);
    });
});
