import type { ProposedDiff } from '../approvals';

export interface AwaitingApprovalOutput {
    status: 'awaiting_approval';
    approvalId: string;
    toolName: string;
    summary: string;
}

export type DiffField<T extends Record<string, unknown>> = {
    key: keyof T & string;
    label: string;
    format?: (value: unknown) => unknown;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function asObject(input: unknown, toolName: string): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error(`${toolName}: input must be an object`);
    }
    return input as Record<string, unknown>;
}

export function requiredString(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string {
    const value = obj[key];
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`${toolName}: "${key}" is required and must be a non-empty string`);
    }
    return value.trim();
}

export function optionalString(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
        throw new Error(`${toolName}: "${key}" must be a string`);
    }
    return value.trim();
}

export function optionalNullableString(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string | null | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') {
        throw new Error(`${toolName}: "${key}" must be a string or null`);
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function optionalBoolean(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): boolean | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'boolean') {
        throw new Error(`${toolName}: "${key}" must be a boolean`);
    }
    return value;
}

export function optionalStringArray(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string[] | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) {
        throw new Error(`${toolName}: "${key}" must be an array of strings`);
    }
    const out: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || !item.trim()) {
            throw new Error(`${toolName}: "${key}" must contain only non-empty strings`);
        }
        const trimmed = item.trim();
        if (!out.includes(trimmed)) out.push(trimmed);
    }
    return out;
}

export function optionalNonNegativeInteger(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): number | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new Error(`${toolName}: "${key}" must be a non-negative integer`);
    }
    return value;
}

export function optionalInteger(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): number | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new Error(`${toolName}: "${key}" must be an integer`);
    }
    return value;
}

export function optionalEnum<T extends readonly string[]>(
    obj: Record<string, unknown>,
    key: string,
    values: T,
    toolName: string
): T[number] | undefined {
    const value = obj[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !(values as readonly string[]).includes(value)) {
        throw new Error(`${toolName}: "${key}" must be one of ${values.join(', ')}`);
    }
    return value as T[number];
}

export function requiredIsoDate(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string {
    const value = requiredString(obj, key, toolName);
    return normaliseIsoDate(value, `${toolName}: "${key}" must be YYYY-MM-DD`);
}

export function optionalIsoDate(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string | undefined {
    const value = optionalString(obj, key, toolName);
    if (value === undefined) return undefined;
    return normaliseIsoDate(value, `${toolName}: "${key}" must be YYYY-MM-DD`);
}

export function optionalNullableIsoDate(
    obj: Record<string, unknown>,
    key: string,
    toolName: string
): string | null | undefined {
    const value = optionalNullableString(obj, key, toolName);
    if (value === undefined || value === null) return value;
    return normaliseIsoDate(value, `${toolName}: "${key}" must be YYYY-MM-DD or null`);
}

export function normaliseIsoDate(value: string, errorMessage: string): string {
    const trimmed = value.trim();
    if (!ISO_DATE.test(trimmed)) throw new Error(errorMessage);
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
    if (!valid) throw new Error(errorMessage);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function moneyValue(cents: unknown): string {
    const n = typeof cents === 'number' ? cents : Number(cents ?? 0);
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(n / 100);
}

export function createDiffChanges<T extends Record<string, unknown>>(
    input: T,
    fields: Array<DiffField<T>>
): ProposedDiff['changes'] {
    const changes: ProposedDiff['changes'] = [];
    for (const field of fields) {
        const value = input[field.key];
        if (value === undefined) continue;
        changes.push({
            field: field.key,
            label: field.label,
            before: '-',
            after: field.format ? field.format(value) : value,
        });
    }
    return changes;
}

export function updateDiffChanges<T extends Record<string, unknown>>(
    input: T,
    current: Record<string, unknown>,
    fields: Array<DiffField<T>>
): ProposedDiff['changes'] {
    const changes: ProposedDiff['changes'] = [];
    for (const field of fields) {
        const value = input[field.key];
        if (value === undefined) continue;
        const before = current[field.key];
        if (before === value) continue;
        changes.push({
            field: field.key,
            label: field.label,
            before: field.format ? field.format(before) : before,
            after: field.format ? field.format(value) : value,
        });
    }
    return changes;
}

export function ensureAtLeastOneDefined(
    input: Record<string, unknown>,
    keys: string[],
    toolName: string
): void {
    if (!keys.some((key) => input[key] !== undefined)) {
        throw new Error(`${toolName}: at least one field to change is required`);
    }
}

export function copyToolUseId(
    obj: Record<string, unknown>,
    out: { _toolUseId?: string }
): void {
    if (typeof obj._toolUseId === 'string') out._toolUseId = obj._toolUseId;
}
