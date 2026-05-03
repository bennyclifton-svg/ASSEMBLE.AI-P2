export interface ChatFocusedEntity {
    kind: string;
    id: string;
}

export interface ChatViewContext {
    projectId: string;
    route: string;
    tab?: string;
    sub?: string;
    focusedEntity?: ChatFocusedEntity;
    pendingApprovalIds: string[];
    recentlyViewedIds: string[];
    selectedEntityIds?: Record<string, string[]>;
}

function normaliseSelectionKind(kind: string): string {
    return kind.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isDocumentSelectionKind(kind: string): boolean {
    return ['document', 'documents', 'doc', 'docs', 'projectdocument', 'projectdocuments'].includes(
        normaliseSelectionKind(kind)
    );
}

export function selectedDocumentIdsFromViewContext(
    context: ChatViewContext | null | undefined
): string[] {
    const selected = context?.selectedEntityIds;
    if (!selected) return [];

    const ids: string[] = [];
    for (const [kind, kindIds] of Object.entries(selected)) {
        if (!isDocumentSelectionKind(kind)) continue;
        for (const id of kindIds) {
            if (!ids.includes(id)) ids.push(id);
        }
    }
    return ids;
}

function cleanString(value: unknown, maxLength = 200): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, maxLength);
}

function cleanStringArray(value: unknown, maxItems = 25): string[] {
    if (!Array.isArray(value)) return [];
    const out: string[] = [];
    for (const item of value) {
        const clean = cleanString(item, 200);
        if (!clean || out.includes(clean)) continue;
        out.push(clean);
        if (out.length >= maxItems) break;
    }
    return out;
}

function cleanSelectedEntityIds(value: unknown): Record<string, string[]> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const out: Record<string, string[]> = {};
    for (const [rawKind, rawIds] of Object.entries(value as Record<string, unknown>)) {
        const kind = cleanString(rawKind, 80);
        if (!kind) continue;
        const ids = cleanStringArray(rawIds, isDocumentSelectionKind(kind) ? 500 : 25);
        if (ids.length > 0) out[kind] = ids;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeChatViewContext(
    value: unknown,
    fallbackProjectId: string
): ChatViewContext {
    const obj =
        value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    const focused =
        obj.focusedEntity && typeof obj.focusedEntity === 'object' && !Array.isArray(obj.focusedEntity)
            ? (obj.focusedEntity as Record<string, unknown>)
            : null;
    const focusedKind = focused ? cleanString(focused.kind, 80) : undefined;
    const focusedId = focused ? cleanString(focused.id, 200) : undefined;

    return {
        projectId: cleanString(obj.projectId, 200) ?? fallbackProjectId,
        route: cleanString(obj.route, 500) ?? `/projects/${fallbackProjectId}`,
        tab: cleanString(obj.tab, 100),
        sub: cleanString(obj.sub, 100),
        focusedEntity:
            focusedKind && focusedId ? { kind: focusedKind, id: focusedId } : undefined,
        pendingApprovalIds: cleanStringArray(obj.pendingApprovalIds),
        recentlyViewedIds: cleanStringArray(obj.recentlyViewedIds),
        selectedEntityIds: cleanSelectedEntityIds(obj.selectedEntityIds),
    };
}

export function formatChatViewContextForPrompt(context: ChatViewContext | null | undefined): string {
    if (!context) return '';
    const lines = [
        '## Current app view',
        `Project: ${context.projectId}`,
        `Route: ${context.route}`,
    ];
    if (context.tab) lines.push(`Tab: ${context.tab}`);
    if (context.sub) lines.push(`Sub-view: ${context.sub}`);
    if (context.focusedEntity) {
        lines.push(`Focused entity: ${context.focusedEntity.kind}:${context.focusedEntity.id}`);
    }
    if (context.pendingApprovalIds.length > 0) {
        lines.push(`Pending approvals: ${context.pendingApprovalIds.join(', ')}`);
    }
    if (context.recentlyViewedIds.length > 0) {
        lines.push(`Recently viewed ids: ${context.recentlyViewedIds.join(', ')}`);
    }
    const selectedDocumentIds = selectedDocumentIdsFromViewContext(context);
    if (selectedDocumentIds.length > 0) {
        lines.push(
            `Current selected document ids (authoritative for "selection", "selected set", or "selected documents"; use these before older chat context): ${selectedDocumentIds.join(', ')}`
        );
    }
    if (context.selectedEntityIds) {
        for (const [kind, ids] of Object.entries(context.selectedEntityIds)) {
            if (isDocumentSelectionKind(kind)) continue;
            lines.push(`Selected ${kind} ids: ${ids.join(', ')}`);
        }
    }
    return lines.join('\n');
}
