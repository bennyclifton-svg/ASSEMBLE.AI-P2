import type {
    ClarificationMateriality,
    ClarificationStatus,
    EvaluationCell,
    EvaluationCellValueType,
    EvaluationRow,
    EvaluationTableType,
    RecommendationState,
    VmAdoptionStatus,
    VmOrigin,
} from '@/types/evaluation';
import {
    generateAiStableKey,
    validateAiEvaluationMutations,
    type ProposedEvaluationRowMutation,
} from './tender-commercial';
import {
    applyRecommendationEvent,
    hasUnresolvedHighMaterialityClarification,
} from './recommendation-state';

export interface RefreshEvaluationInput {
    projectId: string;
    stakeholderId: string;
    evaluationId: string;
    evaluationPriceId?: string | null;
    modelId?: string | null;
    promptHash?: string | null;
}

export interface RefreshEvaluationPackageFile {
    id: string;
    packageId: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    fileAssetId?: string | null;
    documentId?: string | null;
    versionId?: string | null;
    hash?: string | null;
}

export interface RefreshEvaluationPackage {
    id: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    files: RefreshEvaluationPackageFile[];
}

export interface RefreshEvaluationState {
    recommendationState: RecommendationState;
    rows: EvaluationRow[];
    packages: RefreshEvaluationPackage[];
    clarifications?: Array<{
        materiality: ClarificationMateriality;
        status: ClarificationStatus;
    }>;
}

export interface AiEvaluationRowProposal {
    tableType: EvaluationTableType;
    description: string;
    firmId: string;
    firmType: 'consultant' | 'contractor';
    amountCents?: number;
    valueType?: EvaluationCellValueType;
    confidence?: number | null;
    category?: string | null;
    packageId?: string | null;
    sourceSubmissionId?: string | null;
    sourceDocumentId?: string | null;
    sourceFileAssetId?: string | null;
    sourceFileAssetIds?: string[];
    aiStableKey?: string | null;
    vmAdoptionStatus?: VmAdoptionStatus | null;
    vmEmbeddedInBase?: boolean | null;
    vmOrigin?: VmOrigin | null;
}

export interface AiClarificationProposal {
    firmId: string;
    firmType: 'consultant' | 'contractor';
    questionText: string;
    category?: string | null;
    materiality: ClarificationMateriality;
    linkedRowIds?: string[];
    sourceAiArtefactId?: string | null;
}

export interface RefreshEvaluationAdapters {
    loadState: (input: RefreshEvaluationInput) => Promise<RefreshEvaluationState>;
    loadBasis?: (input: RefreshEvaluationInput, state: RefreshEvaluationState) => Promise<unknown>;
    ingestMissingPackageFiles?: (
        input: RefreshEvaluationInput,
        state: RefreshEvaluationState
    ) => Promise<{ artefactIds?: string[]; inputArtefactHashes?: string[] } | void>;
    buildPackageInterpretations?: (
        input: RefreshEvaluationInput,
        state: RefreshEvaluationState
    ) => Promise<{ artefactIds?: string[]; inputArtefactHashes?: string[] } | void>;
    generateRowProposals: (
        input: RefreshEvaluationInput,
        state: RefreshEvaluationState
    ) => Promise<AiEvaluationRowProposal[]>;
    generateClarificationProposals?: (
        input: RefreshEvaluationInput,
        state: RefreshEvaluationState
    ) => Promise<AiClarificationProposal[]>;
    applyMutations: (
        input: RefreshEvaluationInput,
        mutations: ProposedEvaluationRowMutation[]
    ) => Promise<void>;
    updateRecommendationState?: (
        input: RefreshEvaluationInput,
        state: RecommendationState
    ) => Promise<void>;
    recordAction?: (
        input: RefreshEvaluationInput,
        audit: RefreshEvaluationAudit
    ) => Promise<string | null | void>;
}

export interface RefreshEvaluationAudit {
    actionId: 'evaluation.refresh';
    actorKind: 'ai';
    modelId: string | null;
    promptHash: string | null;
    inputArtefactHashes: string[];
    artefactIds: string[];
    before: RefreshEvaluationSummary;
    after: RefreshEvaluationSummary;
    diffs: RefreshEvaluationDiff[];
    validationErrors: string[];
}

export interface RefreshEvaluationSummary {
    created: Record<EvaluationTableType, number>;
    updated: Record<EvaluationTableType, number>;
    removed: Record<EvaluationTableType, number>;
}

export interface RefreshEvaluationDiff {
    kind: ProposedEvaluationRowMutation['kind'];
    rowId: string;
    tableType?: EvaluationTableType;
    aiStableKey?: string | null;
    description?: string;
}

export interface RefreshEvaluationResult {
    ok: boolean;
    summary: RefreshEvaluationSummary;
    diffs: RefreshEvaluationDiff[];
    validationErrors: string[];
    clarificationCandidates: AiClarificationProposal[];
    recommendationStateBefore: RecommendationState;
    recommendationStateAfter: RecommendationState;
    actionInvocationId?: string | null;
}

type ArtefactStepResult = { artefactIds?: string[]; inputArtefactHashes?: string[] } | void;

const TABLE_TYPES: EvaluationTableType[] = ['initial_price', 'adds_subs', 'value_management'];

function defaultIdFactory(): string {
    return globalThis.crypto?.randomUUID?.() ?? `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function zeroSummary(): RefreshEvaluationSummary {
    return {
        created: { initial_price: 0, adds_subs: 0, value_management: 0 },
        updated: { initial_price: 0, adds_subs: 0, value_management: 0 },
        removed: { initial_price: 0, adds_subs: 0, value_management: 0 },
    };
}

function cloneSummary(summary: RefreshEvaluationSummary): RefreshEvaluationSummary {
    return {
        created: { ...summary.created },
        updated: { ...summary.updated },
        removed: { ...summary.removed },
    };
}

function collectArtefactStepResult(
    result: ArtefactStepResult,
    artefactIds: string[],
    inputArtefactHashes: string[]
): void {
    if (!result) return;
    artefactIds.push(...(result.artefactIds ?? []));
    inputArtefactHashes.push(...(result.inputArtefactHashes ?? []));
}

function isAiOwned(row: EvaluationRow): boolean {
    return row.source === 'ai' || row.source === 'ai_parsed';
}

function getCandidateStableKey(proposal: AiEvaluationRowProposal): string {
    return proposal.aiStableKey ?? generateAiStableKey({
        tableType: proposal.tableType,
        category: proposal.category,
        commercialIssue: proposal.description,
        packageId: proposal.packageId,
        firmId: proposal.firmId,
        sourceFileAssetIds: proposal.sourceFileAssetIds ?? (
            proposal.sourceFileAssetId ? [proposal.sourceFileAssetId] : []
        ),
    });
}

function makeCell(rowId: string, proposal: AiEvaluationRowProposal): EvaluationCell {
    return {
        id: `${rowId}:${proposal.firmId}`,
        rowId,
        firmId: proposal.firmId,
        firmType: proposal.firmType,
        amountCents: proposal.amountCents ?? 0,
        valueType: proposal.valueType ?? 'amount',
        source: 'ai',
        confidence: proposal.confidence ?? null,
    };
}

function rowPatchForProposal(
    existing: EvaluationRow,
    proposal: AiEvaluationRowProposal,
    aiStableKey: string
): Partial<EvaluationRow> {
    const cell = makeCell(existing.id, proposal);
    const cells = [
        ...(existing.cells ?? []).filter((existingCell) => existingCell.firmId !== proposal.firmId),
        cell,
    ].sort((a, b) => a.firmId.localeCompare(b.firmId));

    return {
        tableType: proposal.tableType,
        description: proposal.description,
        source: 'ai',
        sourceSubmissionId: proposal.sourceSubmissionId ?? existing.sourceSubmissionId ?? null,
        aiStableKey,
        category: proposal.category ?? null,
        sourceDocumentId: proposal.sourceDocumentId ?? null,
        sourceFileAssetId: proposal.sourceFileAssetId ?? null,
        vmAdoptionStatus: proposal.tableType === 'value_management'
            ? proposal.vmAdoptionStatus ?? existing.vmAdoptionStatus ?? 'tbd'
            : null,
        vmEmbeddedInBase: proposal.tableType === 'value_management'
            ? proposal.vmEmbeddedInBase ?? existing.vmEmbeddedInBase ?? false
            : null,
        vmOrigin: proposal.tableType === 'value_management'
            ? proposal.vmOrigin ?? existing.vmOrigin ?? 'ai_identified'
            : null,
        cells,
    };
}

function serialiseComparableRow(row: EvaluationRow): string {
    return JSON.stringify({
        tableType: row.tableType,
        description: row.description,
        sourceSubmissionId: row.sourceSubmissionId ?? null,
        aiStableKey: row.aiStableKey ?? null,
        category: row.category ?? null,
        sourceDocumentId: row.sourceDocumentId ?? null,
        sourceFileAssetId: row.sourceFileAssetId ?? null,
        vmAdoptionStatus: row.vmAdoptionStatus ?? null,
        vmEmbeddedInBase: row.vmEmbeddedInBase ?? null,
        vmOrigin: row.vmOrigin ?? null,
        cells: [...(row.cells ?? [])]
            .map((cell) => ({
                firmId: cell.firmId,
                firmType: cell.firmType,
                amountCents: cell.amountCents ?? 0,
                valueType: cell.valueType ?? 'amount',
                source: cell.source,
                confidence: cell.confidence ?? null,
            }))
            .sort((a, b) => a.firmId.localeCompare(b.firmId)),
    });
}

function hasPatchChanged(existing: EvaluationRow, patch: Partial<EvaluationRow>): boolean {
    const candidate = { ...existing, ...patch } as EvaluationRow;
    return serialiseComparableRow(existing) !== serialiseComparableRow(candidate);
}

function nextOrderIndexByTable(rows: EvaluationRow[]): Map<EvaluationTableType, number> {
    const next = new Map<EvaluationTableType, number>();
    for (const tableType of TABLE_TYPES) {
        const max = rows
            .filter((row) => row.tableType === tableType)
            .reduce((highest, row) => Math.max(highest, row.orderIndex ?? -1), -1);
        next.set(tableType, max + 1);
    }
    return next;
}

export function buildAiEvaluationMutations(
    input: RefreshEvaluationInput,
    rows: EvaluationRow[],
    proposals: AiEvaluationRowProposal[],
    idFactory: () => string = defaultIdFactory
): ProposedEvaluationRowMutation[] {
    const existingByStableKey = new Map(
        rows
            .filter((row) => isAiOwned(row) && row.aiStableKey)
            .map((row) => [row.aiStableKey as string, row])
    );
    const nextOrder = nextOrderIndexByTable(rows);
    const seenStableKeys = new Set<string>();
    const mutations: ProposedEvaluationRowMutation[] = [];

    for (const proposal of proposals) {
        const aiStableKey = getCandidateStableKey(proposal);
        seenStableKeys.add(aiStableKey);
        const existing = existingByStableKey.get(aiStableKey);

        if (existing) {
            if (existing.isLocked) continue;
            const patch = rowPatchForProposal(existing, proposal, aiStableKey);
            if (hasPatchChanged(existing, patch)) {
                mutations.push({
                    kind: 'update',
                    rowId: existing.id,
                    patch,
                });
            }
            continue;
        }

        const rowId = idFactory();
        const orderIndex = nextOrder.get(proposal.tableType) ?? 0;
        nextOrder.set(proposal.tableType, orderIndex + 1);

        mutations.push({
            kind: 'create',
            row: {
                id: rowId,
                evaluationId: input.evaluationId,
                tableType: proposal.tableType,
                description: proposal.description,
                orderIndex,
                source: 'ai',
                sourceSubmissionId: proposal.sourceSubmissionId ?? null,
                aiStableKey,
                category: proposal.category ?? null,
                sourceDocumentId: proposal.sourceDocumentId ?? null,
                sourceFileAssetId: proposal.sourceFileAssetId ?? null,
                vmAdoptionStatus: proposal.tableType === 'value_management'
                    ? proposal.vmAdoptionStatus ?? 'tbd'
                    : null,
                vmEmbeddedInBase: proposal.tableType === 'value_management'
                    ? proposal.vmEmbeddedInBase ?? false
                    : null,
                vmOrigin: proposal.tableType === 'value_management'
                    ? proposal.vmOrigin ?? 'ai_identified'
                    : null,
                cells: [makeCell(rowId, proposal)],
            },
        });
    }

    for (const row of existingByStableKey.values()) {
        if (row.isLocked || !row.aiStableKey || seenStableKeys.has(row.aiStableKey)) continue;
        mutations.push({
            kind: 'delete',
            rowId: row.id,
        });
    }

    return mutations;
}

export function summariseMutations(
    mutations: ProposedEvaluationRowMutation[],
    existingRows: EvaluationRow[]
): { summary: RefreshEvaluationSummary; diffs: RefreshEvaluationDiff[] } {
    const summary = zeroSummary();
    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    const diffs: RefreshEvaluationDiff[] = [];

    for (const mutation of mutations) {
        const row = mutation.kind === 'create'
            ? mutation.row
            : existingById.get(mutation.rowId);
        const tableType = mutation.kind === 'update'
            ? (mutation.patch.tableType ?? row?.tableType)
            : row?.tableType;

        if (tableType) {
            if (mutation.kind === 'create') summary.created[tableType] += 1;
            if (mutation.kind === 'update') summary.updated[tableType] += 1;
            if (mutation.kind === 'delete') summary.removed[tableType] += 1;
        }

        diffs.push({
            kind: mutation.kind,
            rowId: mutation.kind === 'create' ? mutation.row.id : mutation.rowId,
            tableType,
            aiStableKey: mutation.kind === 'create'
                ? mutation.row.aiStableKey
                : mutation.kind === 'update'
                    ? (mutation.patch.aiStableKey ?? row?.aiStableKey)
                    : row?.aiStableKey,
            description: mutation.kind === 'create'
                ? mutation.row.description
                : mutation.kind === 'update'
                    ? (mutation.patch.description ?? row?.description)
                    : row?.description,
        });
    }

    return { summary, diffs };
}

export async function runRefreshEvaluationPipeline(
    input: RefreshEvaluationInput,
    adapters: RefreshEvaluationAdapters
): Promise<RefreshEvaluationResult> {
    const state = await adapters.loadState(input);
    await adapters.loadBasis?.(input, state);

    const artefactIds: string[] = [];
    const inputArtefactHashes: string[] = [];

    const ingestResult = await adapters.ingestMissingPackageFiles?.(input, state);
    collectArtefactStepResult(ingestResult, artefactIds, inputArtefactHashes);

    const interpretationResult = await adapters.buildPackageInterpretations?.(input, state);
    collectArtefactStepResult(interpretationResult, artefactIds, inputArtefactHashes);

    const rowProposals = await adapters.generateRowProposals(input, state);
    const clarificationCandidates = await adapters.generateClarificationProposals?.(input, state) ?? [];
    const mutations = buildAiEvaluationMutations(input, state.rows, rowProposals);
    const validation = validateAiEvaluationMutations(mutations, state.rows);
    const { summary, diffs } = summariseMutations(mutations, state.rows);

    let recommendationStateAfter = applyRecommendationEvent(
        state.recommendationState,
        'refresh_applied'
    );

    if (
        hasUnresolvedHighMaterialityClarification(state.clarifications ?? []) ||
        clarificationCandidates.some((candidate) => candidate.materiality === 'high')
    ) {
        recommendationStateAfter = applyRecommendationEvent(
            recommendationStateAfter,
            'high_materiality_clarification_raised'
        );
    }

    if (validation.ok) {
        await adapters.applyMutations(input, mutations);
        await adapters.updateRecommendationState?.(input, recommendationStateAfter);
    }

    const recordedActionInvocationId = await adapters.recordAction?.(input, {
        actionId: 'evaluation.refresh',
        actorKind: 'ai',
        modelId: input.modelId ?? null,
        promptHash: input.promptHash ?? null,
        inputArtefactHashes: [...new Set(inputArtefactHashes)],
        artefactIds: [...new Set(artefactIds)],
        before: zeroSummary(),
        after: cloneSummary(summary),
        diffs,
        validationErrors: validation.errors,
    });
    const actionInvocationId = typeof recordedActionInvocationId === 'string'
        ? recordedActionInvocationId
        : null;

    return {
        ok: validation.ok,
        summary,
        diffs,
        validationErrors: validation.errors,
        clarificationCandidates,
        recommendationStateBefore: state.recommendationState,
        recommendationStateAfter,
        actionInvocationId,
    };
}
