/**
 * useProjectEvents — subscribes to /api/projects/[projectId]/events and
 * invokes a callback for each entity_updated event.
 *
 * Callback-style (not state) so consumers can call refetch() in their own
 * data hooks without forcing a re-render on every event. Mirrors the
 * shape of use-chat-stream.ts but minimal — there is only one event type
 * to handle today.
 */

import { useEffect, useRef } from 'react';

export type EntityUpdatedEvent = {
    type: 'entity_updated';
    entity:
        | 'cost_line'
        | 'invoice'
        | 'note'
        | 'risk'
        | 'variation'
        | 'meeting'
        | 'objective'
        | 'program_activity'
        | 'program_milestone'
        | 'stakeholder';
    op: 'created' | 'updated' | 'deleted';
    id: string;
};

export type DocumentSelectionChangedEvent = {
    type: 'document_selection_changed';
    mode: 'replace' | 'add' | 'remove' | 'clear';
    documentIds: string[];
};

export type ProjectEvent = EntityUpdatedEvent | DocumentSelectionChangedEvent;

export function useProjectEvents(
    projectId: string | null,
    onEvent: (event: ProjectEvent) => void
): void {
    const onEventRef = useRef(onEvent);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        if (!projectId) return;
        const source = new EventSource(`/api/projects/${projectId}/events`);

        const handle = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                onEventRef.current(data as ProjectEvent);
            } catch (err) {
                console.error('[useProjectEvents] failed to parse event', err);
            }
        };
        source.addEventListener('entity_updated', handle as EventListener);
        source.addEventListener('document_selection_changed', handle as EventListener);

        return () => {
            source.removeEventListener('entity_updated', handle as EventListener);
            source.removeEventListener('document_selection_changed', handle as EventListener);
            source.close();
        };
    }, [projectId]);
}
