/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useProjectEvents, type ProjectEvent } from '../use-project-events';

class MockEventSource {
    static instances: MockEventSource[] = [];
    listeners = new Map<string, ((e: MessageEvent) => void)[]>();
    onerror: ((e: Event) => void) | null = null;
    closed = false;

    constructor(public url: string) {
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, fn: (e: MessageEvent) => void) {
        const arr = this.listeners.get(type) ?? [];
        arr.push(fn);
        this.listeners.set(type, arr);
    }

    removeEventListener(type: string, fn: (e: MessageEvent) => void) {
        const arr = this.listeners.get(type) ?? [];
        this.listeners.set(
            type,
            arr.filter((f) => f !== fn)
        );
    }

    close() {
        this.closed = true;
    }

    fire(type: string, data: unknown) {
        const arr = this.listeners.get(type) ?? [];
        const ev = { data: JSON.stringify(data) } as MessageEvent;
        for (const fn of arr) fn(ev);
    }
}

beforeEach(() => {
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource =
        MockEventSource;
});

describe('useProjectEvents', () => {
    test('opens an EventSource at /api/projects/:id/events', () => {
        renderHook(() => useProjectEvents('proj-1', () => {}));
        expect(MockEventSource.instances).toHaveLength(1);
        expect(MockEventSource.instances[0].url).toBe('/api/projects/proj-1/events');
    });

    test('invokes the callback when entity_updated fires', () => {
        const onEvent = jest.fn();
        renderHook(() => useProjectEvents('proj-1', onEvent));

        const ev: ProjectEvent = {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'cl-9',
        };
        MockEventSource.instances[0].fire('entity_updated', ev);

        expect(onEvent).toHaveBeenCalledWith(ev);
    });

    test('invokes the callback when document_selection_changed fires', () => {
        const onEvent = jest.fn();
        renderHook(() => useProjectEvents('proj-1', onEvent));

        const ev: ProjectEvent = {
            type: 'document_selection_changed',
            mode: 'replace',
            documentIds: ['doc-1', 'doc-2'],
        };
        MockEventSource.instances[0].fire('document_selection_changed', ev);

        expect(onEvent).toHaveBeenCalledWith(ev);
    });

    test('does not open a connection when projectId is null', () => {
        renderHook(() => useProjectEvents(null, () => {}));
        expect(MockEventSource.instances).toHaveLength(0);
    });

    test('closes the EventSource on unmount', () => {
        const { unmount } = renderHook(() => useProjectEvents('proj-1', () => {}));
        const src = MockEventSource.instances[0];
        unmount();
        expect(src.closed).toBe(true);
    });
});
