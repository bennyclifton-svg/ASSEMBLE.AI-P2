import type {
    Evaluation,
    EvaluationFirm,
    EvaluationRow,
    RecommendationState,
} from '@/types/evaluation';
import type { TRR } from '@/types/trr';
import { calculateTenderEvaluationTotals } from './tender-commercial';

export interface TrrEvaluationPriceCandidate {
    id: string;
    evaluationPriceNumber?: number | null;
    updatedAt?: string | Date | null;
    createdAt?: string | Date | null;
}

export interface SelectActiveTrrEvaluationPriceInput {
    selectedEvaluationPriceId?: string | null;
    activeEvaluationPriceId?: string | null;
    trrEvaluationPriceId?: string | null;
    priceInstances: TrrEvaluationPriceCandidate[];
}

export function selectActiveTrrEvaluationPrice({
    selectedEvaluationPriceId,
    activeEvaluationPriceId,
    trrEvaluationPriceId,
    priceInstances,
}: SelectActiveTrrEvaluationPriceInput): TrrEvaluationPriceCandidate | null {
    const byId = new Map(priceInstances.map((instance) => [instance.id, instance]));
    const explicit =
        (selectedEvaluationPriceId && byId.get(selectedEvaluationPriceId)) ||
        (activeEvaluationPriceId && byId.get(activeEvaluationPriceId)) ||
        (trrEvaluationPriceId && byId.get(trrEvaluationPriceId));

    if (explicit) return explicit;

    return [...priceInstances].sort((a, b) => {
        const aNumber = a.evaluationPriceNumber ?? 0;
        const bNumber = b.evaluationPriceNumber ?? 0;
        if (aNumber !== bNumber) return bNumber - aNumber;

        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
    })[0] ?? null;
}

export function createNewTrrFromLatest(
    latest: Pick<TRR, 'executiveSummary' | 'clarifications' | 'recommendation' | 'evaluationPriceId'> | null,
    overrides: Partial<TRR> = {}
): Partial<TRR> {
    return {
        executiveSummary: latest?.executiveSummary ?? null,
        clarifications: latest?.clarifications ?? null,
        recommendation: latest?.recommendation ?? null,
        evaluationPriceId: overrides.evaluationPriceId ?? latest?.evaluationPriceId ?? null,
        ...overrides,
        reportDate: null,
    };
}

export function clearReportDateOnAiRewrite<T extends Pick<TRR, 'reportDate'>>(
    trrRecord: T,
    update: Partial<Pick<TRR, 'executiveSummary' | 'clarifications' | 'recommendation' | 'reportDate'>>
): Partial<Pick<TRR, 'executiveSummary' | 'clarifications' | 'recommendation' | 'reportDate'>> {
    const rewritesContent =
        update.executiveSummary !== undefined ||
        update.clarifications !== undefined ||
        update.recommendation !== undefined;

    if (!rewritesContent || !trrRecord.reportDate) return update;
    return { ...update, reportDate: null };
}

export interface BuildIssueSnapshotInput {
    trr: Pick<TRR, 'id' | 'reportDate' | 'evaluationPriceId'>;
    evaluation: Pick<Evaluation, 'id' | 'projectId' | 'stakeholderId'>;
    activePriceInstance: TrrEvaluationPriceCandidate;
    recommendationState: RecommendationState;
    rows: EvaluationRow[];
    firms: EvaluationFirm[];
}

export interface IssueSnapshotPayload {
    kind: 'issue_snapshot';
    trrId: string;
    reportDate: string | null;
    evaluationId: string;
    projectId: string;
    stakeholderId?: string | null;
    selectedPriceBasis: {
        evaluationPriceId: string;
        evaluationPriceNumber?: number | null;
    };
    recommendationState: RecommendationState;
    totals: {
        comparableTotals: Record<string, number>;
        awardBasisTotals: Record<string, number>;
    };
    sourceReferences: Array<{
        rowId: string;
        aiStableKey?: string | null;
        sourceSubmissionId?: string | null;
        sourceDocumentId?: string | null;
        sourceFileAssetId?: string | null;
    }>;
    createdAt: string;
}

export function buildIssueSnapshot({
    trr,
    evaluation,
    activePriceInstance,
    recommendationState,
    rows,
    firms,
}: BuildIssueSnapshotInput): IssueSnapshotPayload {
    const totals = calculateTenderEvaluationTotals(rows, firms);
    const sourceReferences = rows
        .filter((row) => row.source === 'ai' || row.source === 'ai_parsed')
        .map((row) => ({
            rowId: row.id,
            aiStableKey: row.aiStableKey ?? null,
            sourceSubmissionId: row.sourceSubmissionId ?? null,
            sourceDocumentId: row.sourceDocumentId ?? null,
            sourceFileAssetId: row.sourceFileAssetId ?? null,
        }));

    return {
        kind: 'issue_snapshot',
        trrId: trr.id,
        reportDate: trr.reportDate ?? null,
        evaluationId: evaluation.id,
        projectId: evaluation.projectId,
        stakeholderId: evaluation.stakeholderId,
        selectedPriceBasis: {
            evaluationPriceId: activePriceInstance.id,
            evaluationPriceNumber: activePriceInstance.evaluationPriceNumber ?? null,
        },
        recommendationState,
        totals: {
            comparableTotals: totals.comparableTotals,
            awardBasisTotals: totals.awardBasisTotals,
        },
        sourceReferences,
        createdAt: new Date().toISOString(),
    };
}
