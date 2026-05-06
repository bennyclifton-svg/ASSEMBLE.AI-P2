import {
    selectedDocumentIdsFromViewContext,
    type ChatViewContext,
} from '@/lib/chat/view-context';

const ADDENDUM_TERM = String.raw`(?:addendum|addenda|addendums?|addenumd|adenumd|adendum|addemdum)`;
const ADDENDUM_REQUEST_RE = new RegExp(
    String.raw`\b(create|add|issue|prepare|draft|attach|generate)\b[\s\S]{0,180}\b${ADDENDUM_TERM}\b|\b${ADDENDUM_TERM}\b[\s\S]{0,180}\b(attach|documents?|drawings?|files?|selection|selected set|transmittal|consultants?|contractors?|tenderers?)\b`,
    'i'
);
const TRANSMITTAL_REQUEST_RE =
    /\b(create|add|issue|prepare|draft|save|generate)\b[\s\S]{0,180}\b(transmittals?)\b|\b(transmittals?)\b[\s\S]{0,180}\b(create|add|issue|prepare|draft|save|generate|documents?|drawings?|files?)\b/i;
const NOTE_REQUEST_RE =
    /\b(create|add|record|update|change|edit|attach)\b[\s\S]{0,180}\b(notes?|decision record)\b|\b(notes?|decision record)\b[\s\S]{0,180}\b(attach|documents?|drawings?|files?|update|change|edit)\b/i;
const CURRENT_DOCUMENT_SELECTION_RE =
    /\b(?:with|from|using|use|for|of|to)\s+(?:the\s+)?(?:current\s+)?(?:selection|selected set)\b|\b(?:current|selected|the selected|these selected|those selected)\s+(?:documents?|docs?|drawings?|files?|set)\b/i;

const DOCUMENT_FILTER_FIELDS = [
    'categoryId',
    'subcategoryId',
    'categoryName',
    'subcategoryName',
    'disciplineOrTrade',
    'allProjectDocuments',
] as const;
const TRANSMITTAL_FILTER_FIELDS = [
    ...DOCUMENT_FILTER_FIELDS,
    'drawingNumber',
    'documentName',
] as const;
const DOCUMENT_DISCIPLINE_TERMS = [
    'architectural',
    'architecture',
    'structural',
    'electrical',
    'hydraulic',
    'mechanical',
    'civil',
    'fire',
    'bca',
    'town planner',
    'town planning',
    'surveyor',
    'survey',
    'landscape',
    'acoustic',
    'geotechnical',
] as const;

interface SelectionToolConfig {
    documentIdField: 'documentIds' | 'attachDocumentIds';
    requestPattern: RegExp;
    forbiddenFilterFields?: readonly string[];
    staleNameFields?: readonly string[];
    retryInstruction: string;
}

const TOOL_CONFIGS: Record<string, SelectionToolConfig> = {
    create_transmittal: {
        documentIdField: 'documentIds',
        requestPattern: TRANSMITTAL_REQUEST_RE,
        forbiddenFilterFields: TRANSMITTAL_FILTER_FIELDS,
        staleNameFields: ['name'],
        retryInstruction:
            'Call create_transmittal with destination="note", those documentIds, and omit document filters.',
    },
    create_addendum: {
        documentIdField: 'documentIds',
        requestPattern: ADDENDUM_REQUEST_RE,
        staleNameFields: ['content'],
        retryInstruction:
            'Resolve the addendum stakeholder from the latest request, then call create_addendum with that stakeholderId, the user-supplied content/name, and those documentIds.',
    },
    create_note: {
        documentIdField: 'documentIds',
        requestPattern: NOTE_REQUEST_RE,
        forbiddenFilterFields: DOCUMENT_FILTER_FIELDS,
        staleNameFields: ['title'],
        retryInstruction:
            'Call create_note with those documentIds and omit document filters.',
    },
    attach_documents_to_note: {
        documentIdField: 'documentIds',
        requestPattern: NOTE_REQUEST_RE,
        forbiddenFilterFields: DOCUMENT_FILTER_FIELDS,
        staleNameFields: ['noteTitle'],
        retryInstruction:
            'Call attach_documents_to_note with the resolved note and those documentIds, and omit document filters.',
    },
    update_note: {
        documentIdField: 'attachDocumentIds',
        requestPattern: NOTE_REQUEST_RE,
        staleNameFields: ['title'],
        retryInstruction:
            'Call update_note with attachDocumentIds set to those selected document ids.',
    },
};

function asInputRecord(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
}

function inputStringArray(input: Record<string, unknown>, field: string): string[] {
    const value = input[field];
    if (!Array.isArray(value)) return [];

    const ids: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim();
        if (trimmed && !ids.includes(trimmed)) ids.push(trimmed);
    }
    return ids;
}

function inputHasMeaningfulField(input: Record<string, unknown>, field: string): boolean {
    const value = input[field];
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
}

function sameStringSet(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((value) => rightSet.has(value));
}

function disciplineTermsIn(value: string): string[] {
    const lower = value.toLowerCase();
    return DOCUMENT_DISCIPLINE_TERMS.filter((term) => lower.includes(term));
}

function selectionToolError(
    selectedDocumentIds: string[],
    config: SelectionToolConfig
): Error {
    return new Error(
        'The latest request refers to the current document selection. ' +
            `Use exactly these current selected documentIds: ${selectedDocumentIds.join(', ')}. ` +
            'Do not reuse document IDs, filters, or discipline-based names from earlier chat turns. ' +
            config.retryInstruction
    );
}

export function guardToolAgainstCurrentDocumentSelection(args: {
    latestUserMessage: string;
    toolName: string;
    input: unknown;
    viewContext?: ChatViewContext | null;
}): void {
    if (!CURRENT_DOCUMENT_SELECTION_RE.test(args.latestUserMessage)) return;

    const config = TOOL_CONFIGS[args.toolName];
    if (!config || !config.requestPattern.test(args.latestUserMessage)) return;

    const selectedDocumentIds = selectedDocumentIdsFromViewContext(args.viewContext);
    if (selectedDocumentIds.length === 0) {
        throw new Error(
            'The latest request refers to the current document selection, but no selected document ids are available in the current app view. Ask the user to select the documents again, and do not create an approval card yet.'
        );
    }

    const input = asInputRecord(args.input);
    const inputDocumentIds = inputStringArray(input, config.documentIdField);
    const hasStaleFilter = (config.forbiddenFilterFields ?? []).some((field) =>
        inputHasMeaningfulField(input, field)
    );

    if (hasStaleFilter || !sameStringSet(inputDocumentIds, selectedDocumentIds)) {
        throw selectionToolError(selectedDocumentIds, config);
    }

    const latestLower = args.latestUserMessage.toLowerCase();
    const hasStaleDisciplineName = (config.staleNameFields ?? []).some((field) => {
        const value = input[field];
        if (typeof value !== 'string') return false;
        return disciplineTermsIn(value).some((term) => !latestLower.includes(term));
    });
    if (hasStaleDisciplineName) {
        throw selectionToolError(selectedDocumentIds, config);
    }
}
