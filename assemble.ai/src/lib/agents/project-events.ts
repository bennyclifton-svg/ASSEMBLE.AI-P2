/**
 * Per-project SSE event bus.
 *
 * Mirrors the chat event bus (./events.ts) but keyed by projectId so any
 * project-scoped UI surface (cost-plan tab, variations panel, etc.) can
 * subscribe and react to entity changes — most importantly, mutations
 * applied via the agent approval gate.
 *
 * In-process Map, pinned to globalThis for the same reason as the chat bus
 * (Next.js dev hot-reload would otherwise produce multiple Map instances and
 * silently drop events). Phase 6 swaps this for Redis pub/sub.
 */

declare global {
    var __assembleProjectConnections:
        | Map<string, Set<ReadableStreamDefaultController>>
        | undefined;
}

const connections: Map<string, Set<ReadableStreamDefaultController>> =
    globalThis.__assembleProjectConnections ??
    (globalThis.__assembleProjectConnections = new Map());
const encoder = new TextEncoder();

export type ProjectEntity =
    | 'addendum'
    | 'cost_line'
    | 'invoice'
    | 'note'
    | 'risk'
    | 'variation'
    | 'meeting'
    | 'report'
    | 'objective'
    | 'program_activity'
    | 'program_milestone'
    | 'stakeholder';
export type ProjectEntityOp = 'created' | 'updated' | 'deleted';

export type EntityUpdatedEvent = {
    type: 'entity_updated';
    entity: ProjectEntity;
    op: ProjectEntityOp;
    id: string;
};

export type DocumentSelectionChangedEvent = {
    type: 'document_selection_changed';
    mode: 'replace' | 'add' | 'remove' | 'clear';
    documentIds: string[];
};

export type ProjectEvent = EntityUpdatedEvent | DocumentSelectionChangedEvent;

export function registerProjectConnection(
    projectId: string,
    controller: ReadableStreamDefaultController
): void {
    if (!connections.has(projectId)) connections.set(projectId, new Set());
    connections.get(projectId)!.add(controller);
}

export function unregisterProjectConnection(
    projectId: string,
    controller: ReadableStreamDefaultController
): void {
    const set = connections.get(projectId);
    if (!set) return;
    set.delete(controller);
    if (set.size === 0) connections.delete(projectId);
}

export function emitProjectEvent(projectId: string, event: ProjectEvent): void {
    const set = connections.get(projectId);
    if (!set) return;
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    const bytes = encoder.encode(message);
    for (const controller of set) {
        try {
            controller.enqueue(bytes);
        } catch {
            // controller closed; cleanup happens via the cancel() callback
        }
    }
}
