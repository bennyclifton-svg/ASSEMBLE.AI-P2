import type {
    EvaluationCell,
    EvaluationCellValueType,
    EvaluationFirm,
    EvaluationRow,
    EvaluationTableType,
    EvaluationTotals,
} from '@/types/evaluation';

const STATUS_CELL_TYPES = new Set<EvaluationCellValueType>([
    'included',
    'assumed_included',
    'excluded',
    'tbc',
    'na',
    'blank',
]);

export function getAmountCellCents(cell: Pick<EvaluationCell, 'amountCents' | 'valueType'> | undefined): number {
    if (!cell) return 0;
    const valueType = cell.valueType ?? 'amount';
    return valueType === 'amount' ? cell.amountCents || 0 : 0;
}

export function isStatusCell(cell: Pick<EvaluationCell, 'valueType'> | undefined): boolean {
    return !!cell?.valueType && STATUS_CELL_TYPES.has(cell.valueType);
}

export interface ParsedEvaluationCellInput {
    amountCents: number;
    valueType: EvaluationCellValueType;
}

export function parseEvaluationCellInput(input: string): ParsedEvaluationCellInput {
    const trimmed = input.trim();
    const normalised = trimmed.toLowerCase().replace(/[.\s_-]+/g, ' ');
    const compact = normalised.replace(/\s+/g, '');

    if (!trimmed || compact === '-' || compact === 'blank') {
        return { amountCents: 0, valueType: 'blank' };
    }

    if (['incl', 'inc', 'included'].includes(compact)) {
        return { amountCents: 0, valueType: 'included' };
    }

    if (['assumed', 'assumedincl', 'assumedinc', 'assumedincluded'].includes(compact)) {
        return { amountCents: 0, valueType: 'assumed_included' };
    }

    if (['excl', 'excluded', 'notincluded', 'omitted'].includes(compact)) {
        return { amountCents: 0, valueType: 'excluded' };
    }

    if (['tbc', 'tbd', 'toconfirm', 'tobeconfirmed', 'tobedetermined'].includes(compact)) {
        return { amountCents: 0, valueType: 'tbc' };
    }

    if (['na', 'n/a', 'notapplicable'].includes(compact)) {
        return { amountCents: 0, valueType: 'na' };
    }

    const isAccountingNegative = /^\(.*\)$/.test(trimmed);
    const cleaned = trimmed
        .replace(/[,$\s]/g, '')
        .replace(/^\((.*)\)$/, '$1');
    const parsed = Number.parseFloat(cleaned);

    if (!Number.isFinite(parsed)) {
        return { amountCents: 0, valueType: 'blank' };
    }

    return {
        amountCents: Math.round(parsed * 100) * (isAccountingNegative ? -1 : 1),
        valueType: 'amount',
    };
}

function createZeroTotals(firms: EvaluationFirm[]): Record<string, number> {
    return Object.fromEntries(firms.map((firm) => [firm.id, 0]));
}

function addRowCellsToTotal(total: Record<string, number>, row: EvaluationRow): void {
    for (const cell of row.cells ?? []) {
        if (total[cell.firmId] === undefined) continue;
        total[cell.firmId] += getAmountCellCents(cell);
    }
}

function getVmAdoptionStatus(row: EvaluationRow): EvaluationRow['vmAdoptionStatus'] {
    return row.vmAdoptionStatus ?? (row.source === 'manual' ? 'adopted' : 'tbd');
}

export function calculateTenderEvaluationTotals(
    rows: EvaluationRow[],
    firms: EvaluationFirm[]
): EvaluationTotals {
    const initialPriceSubtotals = createZeroTotals(firms);
    const addSubsSubtotals = createZeroTotals(firms);
    const valueManagementSubtotals = createZeroTotals(firms);
    const comparableTotals = createZeroTotals(firms);
    const awardBasisTotals = createZeroTotals(firms);
    const grandTotals = createZeroTotals(firms);

    for (const row of rows) {
        if (row.tableType === 'initial_price') {
            addRowCellsToTotal(initialPriceSubtotals, row);
            continue;
        }

        if (row.tableType === 'adds_subs') {
            addRowCellsToTotal(addSubsSubtotals, row);
            continue;
        }

        if (
            row.tableType === 'value_management' &&
            getVmAdoptionStatus(row) === 'adopted' &&
            !row.vmEmbeddedInBase
        ) {
            addRowCellsToTotal(valueManagementSubtotals, row);
        }
    }

    for (const firm of firms) {
        comparableTotals[firm.id] =
            (initialPriceSubtotals[firm.id] || 0) + (addSubsSubtotals[firm.id] || 0);
        grandTotals[firm.id] = comparableTotals[firm.id];
        awardBasisTotals[firm.id] =
            comparableTotals[firm.id] + (valueManagementSubtotals[firm.id] || 0);
    }

    return {
        initialPriceSubtotals,
        addSubsSubtotals,
        valueManagementSubtotals,
        comparableTotals,
        awardBasisTotals,
        grandTotals,
    };
}

function normaliseKeyPart(value: string | null | undefined): string {
    return (value ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function hashString(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).padStart(7, '0');
}

export interface AiStableKeyInput {
    tableType: EvaluationTableType;
    category?: string | null;
    commercialIssue: string;
    packageId?: string | null;
    firmId?: string | null;
    sourceFileAssetIds?: string[];
}

export function generateAiStableKey(input: AiStableKeyInput): string {
    const sourceIds = [...(input.sourceFileAssetIds ?? [])].sort().join(',');
    const parts = [
        input.tableType,
        normaliseKeyPart(input.category),
        normaliseKeyPart(input.commercialIssue),
        normaliseKeyPart(input.packageId),
        normaliseKeyPart(input.firmId),
        sourceIds,
    ];

    return `ai:${input.tableType}:${hashString(parts.join('|'))}`;
}

export type ProposedEvaluationRowMutation =
    | {
        kind: 'create';
        row: EvaluationRow;
    }
    | {
        kind: 'update';
        rowId: string;
        patch: Partial<EvaluationRow>;
    }
    | {
        kind: 'delete';
        rowId: string;
    };

export interface ValidationResult {
    ok: boolean;
    errors: string[];
}

const VALID_TABLE_TYPES = new Set<EvaluationTableType>([
    'initial_price',
    'adds_subs',
    'value_management',
]);

const VALID_CELL_TYPES = new Set<EvaluationCellValueType>([
    'amount',
    'included',
    'assumed_included',
    'excluded',
    'tbc',
    'na',
    'blank',
]);

function isAiOwned(row: EvaluationRow): boolean {
    return row.source === 'ai' || row.source === 'ai_parsed';
}

export function validateAiEvaluationMutations(
    mutations: ProposedEvaluationRowMutation[],
    existingRows: EvaluationRow[] = []
): ValidationResult {
    const errors: string[] = [];
    const existingById = new Map(existingRows.map((row) => [row.id, row]));

    for (const mutation of mutations) {
        const row = mutation.kind === 'create'
            ? mutation.row
            : existingById.get(mutation.rowId);

        if (!row && mutation.kind !== 'create') {
            errors.push(`${mutation.kind}:${mutation.rowId}: row does not exist`);
            continue;
        }

        if (mutation.kind !== 'create' && row?.isLocked) {
            errors.push(`${mutation.kind}:${mutation.rowId}: locked rows cannot be changed by AI`);
        }

        if (mutation.kind !== 'create' && row && !isAiOwned(row)) {
            errors.push(`${mutation.kind}:${mutation.rowId}: user/system rows cannot be changed by AI`);
        }

        if (mutation.kind === 'delete') continue;

        const candidate = mutation.kind === 'create'
            ? mutation.row
            : ({ ...row, ...mutation.patch } as EvaluationRow);

        if (!VALID_TABLE_TYPES.has(candidate.tableType)) {
            errors.push(`${candidate.id}: invalid table type`);
        }

        if (isAiOwned(candidate) && !candidate.sourceDocumentId && !candidate.sourceFileAssetId) {
            errors.push(`${candidate.id}: AI rows require a source document or file reference`);
        }

        if (isAiOwned(candidate) && !candidate.aiStableKey) {
            errors.push(`${candidate.id}: AI rows require an aiStableKey`);
        }

        for (const cell of candidate.cells ?? []) {
            const valueType = cell.valueType ?? 'amount';
            if (!VALID_CELL_TYPES.has(valueType)) {
                errors.push(`${candidate.id}:${cell.firmId}: invalid cell value type`);
            }

            if (valueType === 'amount' && !Number.isFinite(cell.amountCents)) {
                errors.push(`${candidate.id}:${cell.firmId}: amount cells require a finite amount`);
            }

            if (valueType !== 'amount' && (cell.amountCents || 0) !== 0) {
                errors.push(`${candidate.id}:${cell.firmId}: status cells cannot contribute to totals`);
            }
        }
    }

    return {
        ok: errors.length === 0,
        errors,
    };
}
