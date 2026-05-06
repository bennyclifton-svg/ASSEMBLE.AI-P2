import type { AgentMessage } from './completion';

type FirmType = 'consultant' | 'contractor';

interface TenderFirmPanelIntent {
    firmType: FirmType;
    disciplineOrTrade: string;
    sourceText: string;
}

const TENDER_FIRM_WRITE_RE =
    /\b(add|record|create|enter|post|log|update|change|set|populate|append)\b[\s\S]{0,180}\b(firms?|companies|tenderers?|builders?|contractors?|consultants?)\b[\s\S]{0,180}\b(tender|panel|list)\b|\b(tender|panel|list)\b[\s\S]{0,180}\b(add|record|create|enter|post|log|update|change|set|populate|append|firms?|companies|tenderers?|builders?|contractors?|consultants?)\b/i;
const FIRM_CONTACT_LIST_RE =
    /(?=[\s\S]*\b(?:email|e-mail)\b)(?=[\s\S]*\bphone\b)(?=[\s\S]*\baddress\b)(?=[\s\S]*(?:^\s*\d+\.|\b(?:services|contractors|consultants|mechanical|hvac|builders|pty|ltd)\b))/im;
const PRIOR_FIRM_REFERENCE_RE =
    /\b(?:same|previous|prior|earlier|above|those|these|them|that list|the list)\b[\s\S]{0,60}\b(?:firms?|companies|tenderers?|contractors?|consultants?)\b|\b(?:firms?|companies|tenderers?|contractors?|consultants?)\b[\s\S]{0,60}\b(?:same|previous|prior|earlier|above|those|these|them|that list|the list)\b/i;

const DISCIPLINE_ALIASES: Array<{ label: string; aliases: RegExp[] }> = [
    { label: 'Architecture', aliases: [/\barchitectural\b/i, /\barchitecture\b/i, /\barchitects?\b/i] },
    { label: 'Structural', aliases: [/\bstructural\b/i] },
    { label: 'Electrical', aliases: [/\belectrical\b/i] },
    { label: 'Hydraulic', aliases: [/\bhydraulic\b/i] },
    { label: 'Mechanical', aliases: [/\bmechanical\b/i, /\bhvac\b/i] },
    { label: 'Civil', aliases: [/\bcivil\b/i] },
    { label: 'Fire', aliases: [/\bfire\b/i] },
    { label: 'BCA', aliases: [/\bbca\b/i] },
    { label: 'Town Planner', aliases: [/\btown planner\b/i, /\btown planning\b/i] },
    { label: 'Surveyor', aliases: [/\bsurveyor\b/i, /\bsurvey\b/i] },
    { label: 'Landscape', aliases: [/\blandscape\b/i] },
    { label: 'Acoustic', aliases: [/\bacoustic\b/i] },
    { label: 'Geotechnical', aliases: [/\bgeotechnical\b/i, /\bgeotech\b/i] },
    {
        label: 'General Contractor',
        aliases: [/\bgeneral contractor\b/i, /\bhead contractor\b/i, /\bmain contractor\b/i, /\bprincipal contractor\b/i],
    },
];

function asInputRecord(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
}

function stringField(input: Record<string, unknown>, field: string): string | null {
    const value = input[field];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function originalUserRequest(text: string): string {
    const marker = 'Original user request:';
    const index = text.lastIndexOf(marker);
    if (index === -1) return text;
    return text.slice(index + marker.length).trim();
}

function messageText(message: AgentMessage): string | null {
    if (message.role !== 'user') return null;
    return typeof message.content === 'string' ? originalUserRequest(message.content) : null;
}

function normalizedText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function firmTypeFromText(text: string): FirmType | null {
    if (/\b(contractors?|builders?|tenderers?|trades?|general contractor|head contractor|main contractor|principal contractor)\b/i.test(text)) {
        return 'contractor';
    }
    if (/\b(consultants?|engineers?|architects?|planners?|surveyors?|designers?)\b/i.test(text)) {
        return 'consultant';
    }
    return null;
}

function disciplineFromText(text: string): string | null {
    for (const item of DISCIPLINE_ALIASES) {
        if (item.aliases.some((alias) => alias.test(text))) return item.label;
    }
    return null;
}

function canonicalPanelName(value: string): string {
    const fromAlias = disciplineFromText(value);
    return normalizedText(fromAlias ?? value);
}

function extractTenderFirmPanelIntent(text: string): TenderFirmPanelIntent | null {
    if (!TENDER_FIRM_WRITE_RE.test(text)) return null;
    const firmType = firmTypeFromText(text);
    const disciplineOrTrade = disciplineFromText(text);
    if (!firmType || !disciplineOrTrade) return null;
    return { firmType, disciplineOrTrade, sourceText: text };
}

function latestPriorTenderFirmPanelIntent(history: AgentMessage[]): TenderFirmPanelIntent | null {
    for (let index = history.length - 2; index >= 0; index--) {
        const text = messageText(history[index]);
        if (!text) continue;
        const intent = extractTenderFirmPanelIntent(text);
        if (intent) return intent;
    }
    return null;
}

function inputFirmNames(input: Record<string, unknown>): string[] {
    const firms = input.firms;
    if (!Array.isArray(firms)) return [];
    return firms
        .map((firm) =>
            firm && typeof firm === 'object'
                ? stringField(firm as Record<string, unknown>, 'companyName')
                : null
        )
        .filter((name): name is string => Boolean(name));
}

function firmNameAppearsInLatestMessage(companyName: string, latestUserMessage: string): boolean {
    const normalizedLatest = normalizedText(latestUserMessage);
    const normalizedCompany = normalizedText(companyName);
    return normalizedCompany.length > 0 && normalizedLatest.includes(normalizedCompany);
}

function createPanelMismatchError(args: {
    intent: TenderFirmPanelIntent;
    inputFirmType: string | null;
    inputDisciplineOrTrade: string | null;
}): Error {
    return new Error(
        `The latest tender-panel context is ${args.intent.disciplineOrTrade} ${args.intent.firmType}. ` +
            `The proposed add_tender_firms input targets ${args.inputDisciplineOrTrade ?? '(missing)'} ${args.inputFirmType ?? '(missing)'}. ` +
            'Do not reuse a prior tender-panel type or discipline. Re-call add_tender_firms with the current panel context and the latest firm list.'
    );
}

function createStaleFirmNameError(args: {
    staleFirmNames: string[];
    latestUserMessageHasPanelIntent: boolean;
}): Error {
    const latestRequestText = args.latestUserMessageHasPanelIntent
        ? 'The latest message names a tender panel, but it does not supply those firm names.'
        : 'The latest message is a firm contact list.';

    return new Error(
        `${latestRequestText} The proposed add_tender_firms input includes firm names not present in the latest user message: ${args.staleFirmNames.join(', ')}. ` +
            'Do not reuse firms from earlier chat turns unless the latest request explicitly says to use the same/previous firms. Ask for the firm names/details instead of creating an approval card.'
    );
}

export function guardTenderFirmAgainstLatestRequest(args: {
    latestUserMessage: string;
    toolName: string;
    input: unknown;
    history: AgentMessage[];
}): void {
    if (args.toolName !== 'add_tender_firms') return;

    const latestUserMessage = originalUserRequest(args.latestUserMessage);
    const input = asInputRecord(args.input);
    const inputFirmType = stringField(input, 'firmType');
    const inputDisciplineOrTrade = stringField(input, 'disciplineOrTrade');
    const latestIntent = extractTenderFirmPanelIntent(latestUserMessage);
    const isFollowUpFirmList = FIRM_CONTACT_LIST_RE.test(latestUserMessage) && !latestIntent;
    const intent = latestIntent ?? (isFollowUpFirmList ? latestPriorTenderFirmPanelIntent(args.history) : null);
    const staleFirmNames = inputFirmNames(input).filter(
        (companyName) => !firmNameAppearsInLatestMessage(companyName, latestUserMessage)
    );
    const allowsPriorFirmReuse = PRIOR_FIRM_REFERENCE_RE.test(latestUserMessage);

    if (!intent) {
        if (isFollowUpFirmList) {
            throw new Error(
                'The latest message is a firm contact list, but no earlier tender-panel request was found in the chat history. ' +
                    'Ask one concise question for the tender panel, such as "Should these firms be added to the Mechanical consultant or contractor tender panel?"'
            );
        }
        return;
    }

    if (
        inputFirmType !== intent.firmType ||
        !inputDisciplineOrTrade ||
        canonicalPanelName(inputDisciplineOrTrade) !== canonicalPanelName(intent.disciplineOrTrade)
    ) {
        throw createPanelMismatchError({
            intent,
            inputFirmType,
            inputDisciplineOrTrade,
        });
    }

    if (isFollowUpFirmList) {
        if (staleFirmNames.length > 0) {
            throw createStaleFirmNameError({
                staleFirmNames,
                latestUserMessageHasPanelIntent: false,
            });
        }
    } else if (latestIntent && staleFirmNames.length > 0 && !allowsPriorFirmReuse) {
        throw createStaleFirmNameError({
            staleFirmNames,
            latestUserMessageHasPanelIntent: true,
        });
    }
}
