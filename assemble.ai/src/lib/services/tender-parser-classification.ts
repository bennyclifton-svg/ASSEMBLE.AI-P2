import type {
    EvaluationTableType,
    ParsedLineItem,
    TenderItemType,
    VmAdoptionStatus,
    VmOrigin,
} from '@/types/evaluation';

const VALID_TABLE_TYPES = new Set<EvaluationTableType>([
    'initial_price',
    'adds_subs',
    'value_management',
]);

const VALID_ITEM_TYPES = new Set<TenderItemType>([
    'deliverable',
    'total',
    'unit_rate',
    'allowance',
    'commercial_adjustment',
    'value_management',
]);

const VALID_VM_STATUSES = new Set<VmAdoptionStatus>(['adopted', 'tbd', 'not_adopted']);
const VALID_VM_ORIGINS = new Set<VmOrigin>([
    'tenderer_proposed',
    'pm_client_proposed',
    'ai_identified',
    'tender_wide_option',
]);

export function normaliseTenderItemType(value: unknown): TenderItemType {
    return typeof value === 'string' && VALID_ITEM_TYPES.has(value as TenderItemType)
        ? value as TenderItemType
        : 'deliverable';
}

export function normaliseVmStatus(value: unknown): VmAdoptionStatus {
    return typeof value === 'string' && VALID_VM_STATUSES.has(value as VmAdoptionStatus)
        ? value as VmAdoptionStatus
        : 'tbd';
}

export function normaliseVmOrigin(value: unknown): VmOrigin {
    return typeof value === 'string' && VALID_VM_ORIGINS.has(value as VmOrigin)
        ? value as VmOrigin
        : 'tenderer_proposed';
}

export function cleanOptionalText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export function normaliseTenderLineItemTableType(
    item: Pick<ParsedLineItem, 'description' | 'amountCents' | 'itemType' | 'tableType' | 'category' | 'sourceSection'>
): EvaluationTableType {
    if (item.tableType && VALID_TABLE_TYPES.has(item.tableType)) {
        return item.tableType;
    }

    const text = [
        item.sourceSection,
        item.category,
        item.itemType,
        item.description,
    ].filter(Boolean).join(' ').toLowerCase();

    if (
        /value\s*management|\bvm\b|value\s*engineering|scope\s*alternative|alternative\s*proposal|cost\s*sav|saving\s*option/.test(text) ||
        ((item.amountCents ?? 0) < 0 && /saving|reduce|omit|rationali[sz]e|alternative|optimis[ez]e|substitut|option/.test(text))
    ) {
        return 'value_management';
    }

    if (
        /adds?\s*(?:and|&)\s*subs?|commercial\s*adjust|normalis(?:a|e)tion|normalization|clarification\s*adjust|adjustment\s*(?:schedule|item)?|scope\s*gap|exclusion|qualification|deduct|additional|extra|if\s+required|if\s+requested|optional\s+add|^add\b|^deduct\b|^include\s+formal\b/.test(text)
    ) {
        return 'adds_subs';
    }

    if (item.itemType === 'commercial_adjustment') {
        return 'adds_subs';
    }

    if (item.itemType === 'value_management') {
        return 'value_management';
    }

    return 'initial_price';
}
