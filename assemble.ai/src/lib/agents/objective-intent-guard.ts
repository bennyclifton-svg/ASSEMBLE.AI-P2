const OBJECTIVE_TYPES = ['planning', 'functional', 'quality', 'compliance'] as const;

const OBJECTIVE_REQUEST_RE =
    /\b(objectives?|project objectives?|brief objectives?)\b/i;
const GENERATIVE_OBJECTIVE_REQUEST_RE =
    /\b(populate|generate|draft|redraft|write|prepare|suggest|create)\b[\s\S]{0,80}\b(objectives?|project objectives?|brief objectives?)\b/i;

const STOP_WORDS = new Set([
    'a',
    'about',
    'add',
    'also',
    'an',
    'and',
    'append',
    'are',
    'as',
    'be',
    'brief',
    'by',
    'change',
    'changes',
    'for',
    'from',
    'include',
    'includes',
    'including',
    'into',
    'it',
    'make',
    'new',
    'objective',
    'objectives',
    'of',
    'on',
    'project',
    'put',
    'replace',
    'set',
    'specify',
    'that',
    'the',
    'these',
    'this',
    'to',
    'update',
    'with',
]);

function asInputRecord(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
}

function objectiveItems(input: Record<string, unknown>): string[] {
    const items: string[] = [];
    for (const section of OBJECTIVE_TYPES) {
        const sectionItems = input[section];
        if (!Array.isArray(sectionItems)) continue;
        for (const item of sectionItems) {
            if (typeof item !== 'string') continue;
            const trimmed = item.trim();
            if (trimmed) items.push(trimmed);
        }
    }
    return items;
}

function significantTerms(value: string): string[] {
    const normalized = value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ');
    const terms = normalized
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
    return Array.from(new Set(terms));
}

function isExplicitObjectivePayload(message: string): boolean {
    if (!OBJECTIVE_REQUEST_RE.test(message)) return false;
    if (!GENERATIVE_OBJECTIVE_REQUEST_RE.test(message)) return true;

    const terms = significantTerms(message);
    return terms.length >= 5 || /[,;]/.test(message);
}

function overlappingTerms(left: string[], right: string[]): string[] {
    const rightSet = new Set(right);
    return left.filter((term) => rightSet.has(term));
}

function staleObjectiveError(staleItems: string[]): Error {
    return new Error(
        'The latest request gives explicit objective wording. Do not reuse objective text from earlier chat turns. ' +
            `These proposed objective item(s) do not match the latest request: ${staleItems.join(' | ')}. ` +
            'Call set_project_objectives again using only the objective items requested in the latest user message.'
    );
}

export function guardProjectObjectivesAgainstLatestRequest(args: {
    latestUserMessage: string;
    toolName: string;
    input: unknown;
}): void {
    if (args.toolName !== 'set_project_objectives') return;
    if (!isExplicitObjectivePayload(args.latestUserMessage)) return;

    const input = asInputRecord(args.input);
    const items = objectiveItems(input);
    if (items.length === 0) return;

    const latestTerms = significantTerms(args.latestUserMessage);
    if (latestTerms.length === 0) return;

    const staleItems = items.filter((item) => {
        const itemTerms = significantTerms(item);
        if (itemTerms.length === 0) return false;
        return overlappingTerms(itemTerms, latestTerms).length === 0;
    });

    if (staleItems.length > 0) {
        throw staleObjectiveError(staleItems);
    }
}
