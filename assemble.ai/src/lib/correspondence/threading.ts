import type { CorrespondenceAddress } from '@/types/correspondence';

const SUBJECT_PREFIX = /^(?:(?:re|fw|fwd|aw|sv)\s*:\s*)+/i;
const WHITESPACE = /\s+/g;

export function normalizeSubject(subject: string | null | undefined): string {
    const trimmed = (subject || '(no subject)').trim();
    const withoutPrefixes = trimmed.replace(SUBJECT_PREFIX, '').trim();
    return (withoutPrefixes || '(no subject)').replace(WHITESPACE, ' ').toLowerCase();
}

export function normalizeMessageId(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.replace(/^<|>$/g, '').toLowerCase();
}

export function extractMessageIds(value: string | string[] | null | undefined): string[] {
    const text = Array.isArray(value) ? value.join(' ') : value;
    if (!text) return [];

    const matches = text.match(/<[^>]+>|[^\s<>]+@[^\s<>]+/g) || [];
    const ids = matches
        .map((match) => normalizeMessageId(match))
        .filter((id): id is string => Boolean(id));

    return Array.from(new Set(ids));
}

export function parseAddress(value: string | CorrespondenceAddress): CorrespondenceAddress {
    if (typeof value !== 'string') {
        return {
            email: value.email.trim().toLowerCase(),
            name: value.name?.trim() || null,
        };
    }

    const match = value.match(/^\s*(?:"?([^"<]*)"?)?\s*<([^>]+)>\s*$/);
    if (match) {
        return {
            name: match[1]?.trim() || null,
            email: match[2].trim().toLowerCase(),
        };
    }

    return {
        email: value.trim().toLowerCase(),
        name: null,
    };
}

export function parseAddressList(
    value: Array<string | CorrespondenceAddress> | string | null | undefined
): CorrespondenceAddress[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(parseAddress).filter((item) => item.email);

    return value
        .split(',')
        .map((part) => parseAddress(part))
        .filter((item) => item.email);
}

export function lowerHeaderMap(
    headers: Record<string, string | string[] | null | undefined> | null | undefined
): Record<string, string | string[]> {
    if (!headers) return {};

    return Object.fromEntries(
        Object.entries(headers)
            .filter((entry): entry is [string, string | string[]] => entry[1] !== null && entry[1] !== undefined)
            .map(([key, value]) => [key.toLowerCase(), value])
    );
}
