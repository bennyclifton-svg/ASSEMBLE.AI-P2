import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projectStakeholders } from '@/lib/db/pg-schema';

const ADDENDUM_TERM = String.raw`(?:addendum|addenda|addendums?|addenumd|adenumd|adendum|addemdum)`;
const ADDENDUM_REQUEST_RE = new RegExp(
    String.raw`\b(create|add|issue|prepare|draft|attach|generate)\b[\s\S]{0,180}\b${ADDENDUM_TERM}\b|\b${ADDENDUM_TERM}\b[\s\S]{0,180}\b(attach|documents?|drawings?|files?|selection|selected set|transmittal|consultants?|contractors?|tenderers?)\b`,
    'i'
);

const DISCIPLINE_TERMS = [
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

type StakeholderGroup = 'client' | 'authority' | 'consultant' | 'contractor' | string;

interface StakeholderIntentRow {
    id: string;
    name: string;
    stakeholderGroup: StakeholderGroup;
    role: string | null;
    disciplineOrTrade: string | null;
}

interface AddendumRecipientIntent {
    phrase: string;
    group?: 'consultant' | 'contractor';
    disciplineTerms: string[];
    generalContractor: boolean;
}

function asInputRecord(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
}

function cleanText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

function stringField(input: Record<string, unknown>, field: string): string | null {
    const value = input[field];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function recipientPhraseFromMessage(message: string): string | null {
    const match = message.match(
        /\b(?:for|to|issued to|send to|sent to|addressed to)\s+(?:the\s+)?([\s\S]{1,100}?)(?=,|\.|\band\b|\bwith\b|\battach(?:ed|ing)?\b|\busing\b|\bfrom\b|$)/i
    );
    return match?.[1] ? cleanText(match[1]) : null;
}

function disciplineTermsIn(value: string): string[] {
    const lower = value.toLowerCase();
    return DISCIPLINE_TERMS.filter((term) => lower.includes(term));
}

function stakeholderLabel(stakeholder: StakeholderIntentRow): string {
    const discipline = stakeholder.disciplineOrTrade ? ` - ${stakeholder.disciplineOrTrade}` : '';
    return `${stakeholder.name} (${stakeholder.stakeholderGroup}${discipline})`;
}

function stakeholderSearchText(stakeholder: StakeholderIntentRow): string {
    return [stakeholder.name, stakeholder.stakeholderGroup, stakeholder.role, stakeholder.disciplineOrTrade]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function stakeholderMatchesDiscipline(stakeholder: StakeholderIntentRow, terms: string[]): boolean {
    const haystack = stakeholderSearchText(stakeholder);
    return terms.some((term) => haystack.includes(term));
}

function addendumRecipientIntentFromMessage(message: string): AddendumRecipientIntent | null {
    if (!ADDENDUM_REQUEST_RE.test(message)) return null;

    const directGeneralContractor = message.match(/\b(?:general|head|main|principal)\s+contractor\b/i)?.[0];
    const phrase = recipientPhraseFromMessage(message) ?? directGeneralContractor;
    if (!phrase) return null;

    const lower = phrase.toLowerCase();
    const group = /\b(contractor|builder|tenderer|tenderers)\b/i.test(phrase)
        ? 'contractor'
        : /\b(consultant|engineer|architect|planner|surveyor)\b/i.test(phrase)
            ? 'consultant'
            : undefined;
    const generalContractor = /\b(?:general|head|main|principal)\s+contractor\b/i.test(phrase);
    const disciplineTerms =
        group === 'consultant' || /\b(contractor|builder)\b/.test(lower)
            ? disciplineTermsIn(phrase)
            : [];

    if (!group && disciplineTerms.length === 0 && !generalContractor) return null;
    return { phrase, group, disciplineTerms, generalContractor };
}

function staleAddendumContentTerms(input: Record<string, unknown>, latestUserMessage: string): string[] {
    const content = stringField(input, 'content');
    if (!content) return [];
    const latestLower = latestUserMessage.toLowerCase();
    return disciplineTermsIn(content).filter((term) => !latestLower.includes(term));
}

function createRecipientError(args: {
    latestUserMessage: string;
    input: Record<string, unknown>;
    stakeholder: StakeholderIntentRow;
    intent?: AddendumRecipientIntent | null;
    reason: string;
}): Error {
    const intentText = args.intent?.phrase ? ` The latest recipient phrase is "${args.intent.phrase}".` : '';
    const staleTerms = staleAddendumContentTerms(args.input, args.latestUserMessage);
    const contentText =
        staleTerms.length > 0
            ? ` The proposed content includes stale discipline wording (${staleTerms.join(', ')}).`
            : '';

    return new Error(
        `${args.reason}${intentText} The proposed addendum is targeting ${stakeholderLabel(args.stakeholder)}.${contentText} ` +
            'Do not reuse the prior addendum recipient or content. Re-run list_stakeholders with the latest recipient group, then call create_addendum with the matching stakeholderId.'
    );
}

export function assertAddendumStakeholderMatchesLatestRequest(args: {
    latestUserMessage: string;
    toolName: string;
    input: unknown;
    stakeholder: StakeholderIntentRow;
}): void {
    if (args.toolName !== 'create_addendum') return;
    const input = asInputRecord(args.input);
    const intent = addendumRecipientIntentFromMessage(args.latestUserMessage);
    const staleTerms = staleAddendumContentTerms(input, args.latestUserMessage);

    if (staleTerms.length > 0) {
        throw createRecipientError({
            latestUserMessage: args.latestUserMessage,
            input,
            stakeholder: args.stakeholder,
            intent,
            reason: 'The latest addendum request does not include that discipline wording.',
        });
    }

    if (!intent) return;

    if (intent.group && args.stakeholder.stakeholderGroup !== intent.group) {
        throw createRecipientError({
            latestUserMessage: args.latestUserMessage,
            input,
            stakeholder: args.stakeholder,
            intent,
            reason: `The latest addendum request names a ${intent.group} recipient.`,
        });
    }

    if (
        intent.generalContractor &&
        args.stakeholder.stakeholderGroup === 'contractor' &&
        disciplineTermsIn(stakeholderSearchText(args.stakeholder)).length > 0
    ) {
        throw createRecipientError({
            latestUserMessage: args.latestUserMessage,
            input,
            stakeholder: args.stakeholder,
            intent,
            reason: 'The latest addendum request names the general contractor, not a trade-specific contractor.',
        });
    }

    if (
        intent.disciplineTerms.length > 0 &&
        !stakeholderMatchesDiscipline(args.stakeholder, intent.disciplineTerms)
    ) {
        throw createRecipientError({
            latestUserMessage: args.latestUserMessage,
            input,
            stakeholder: args.stakeholder,
            intent,
            reason: `The latest addendum request names ${intent.disciplineTerms.join(', ')}.`,
        });
    }
}

export async function guardAddendumStakeholderAgainstLatestRequest(args: {
    latestUserMessage: string;
    toolName: string;
    input: unknown;
    projectId: string;
}): Promise<void> {
    if (args.toolName !== 'create_addendum') return;

    const input = asInputRecord(args.input);
    const stakeholderId = stringField(input, 'stakeholderId');
    if (!stakeholderId) return;

    const [stakeholder] = await db
        .select({
            id: projectStakeholders.id,
            name: projectStakeholders.name,
            stakeholderGroup: projectStakeholders.stakeholderGroup,
            role: projectStakeholders.role,
            disciplineOrTrade: projectStakeholders.disciplineOrTrade,
        })
        .from(projectStakeholders)
        .where(
            and(
                eq(projectStakeholders.id, stakeholderId),
                eq(projectStakeholders.projectId, args.projectId),
                isNull(projectStakeholders.deletedAt)
            )
        )
        .limit(1);

    if (!stakeholder) return;

    assertAddendumStakeholderMatchesLatestRequest({
        latestUserMessage: args.latestUserMessage,
        toolName: args.toolName,
        input: args.input,
        stakeholder,
    });
}
