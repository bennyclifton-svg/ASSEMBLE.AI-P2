export const AI_MEMORY_CATEGORIES = [
    'preference',
    'recurring_context',
    'assumption',
    'style',
    'reporting',
] as const;

export type AiMemoryCategory = typeof AI_MEMORY_CATEGORIES[number];

export const AI_MEMORY_CATEGORY_LABELS: Record<AiMemoryCategory, string> = {
    preference: 'Preference',
    recurring_context: 'Recurring context',
    assumption: 'Assumption',
    style: 'Style',
    reporting: 'Reporting',
};

export const AI_MEMORY_STATUSES = ['active', 'inactive'] as const;
export type AiMemoryStatus = typeof AI_MEMORY_STATUSES[number];

export const AI_MEMORY_SOURCES = ['manual', 'agent', 'workflow'] as const;
export type AiMemorySource = typeof AI_MEMORY_SOURCES[number];

export interface AiMemoryEntry {
    id: string;
    projectId: string;
    organizationId: string;
    category: AiMemoryCategory;
    title: string;
    content: string;
    status: AiMemoryStatus;
    source: AiMemorySource;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface AiMemoryListResponse {
    entries: AiMemoryEntry[];
    activeCount: number;
}

export interface CreateAiMemoryEntryRequest {
    category?: AiMemoryCategory;
    title: string;
    content: string;
    status?: AiMemoryStatus;
}

export interface UpdateAiMemoryEntryRequest {
    category?: AiMemoryCategory;
    title?: string;
    content?: string;
    status?: AiMemoryStatus;
}

export function isAiMemoryCategory(value: unknown): value is AiMemoryCategory {
    return typeof value === 'string' && (AI_MEMORY_CATEGORIES as readonly string[]).includes(value);
}

export function isAiMemoryStatus(value: unknown): value is AiMemoryStatus {
    return typeof value === 'string' && (AI_MEMORY_STATUSES as readonly string[]).includes(value);
}

export function isAiMemorySource(value: unknown): value is AiMemorySource {
    return typeof value === 'string' && (AI_MEMORY_SOURCES as readonly string[]).includes(value);
}
