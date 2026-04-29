/**
 * @jest-environment node
 */
import {
    emitProjectEvent,
    registerProjectConnection,
    unregisterProjectConnection,
    type ProjectEvent,
} from '../project-events';

function makeController() {
    const enqueued: Uint8Array[] = [];
    const controller = {
        enqueue: (chunk: Uint8Array) => enqueued.push(chunk),
    } as unknown as ReadableStreamDefaultController;
    return { controller, enqueued };
}

function decode(chunks: Uint8Array[]): string {
    return chunks.map((c) => new TextDecoder().decode(c)).join('');
}

describe('project-events bus', () => {
    test('emits to a registered controller for the matching project', () => {
        const { controller, enqueued } = makeController();
        registerProjectConnection('proj-1', controller);

        const event: ProjectEvent = {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'cl-9',
        };
        emitProjectEvent('proj-1', event);

        expect(enqueued.length).toBe(1);
        const text = decode(enqueued);
        expect(text).toContain('event: entity_updated');
        expect(text).toContain('"id":"cl-9"');

        unregisterProjectConnection('proj-1', controller);
    });

    test('does not deliver events to a different project', () => {
        const { controller: a, enqueued: aOut } = makeController();
        const { controller: b, enqueued: bOut } = makeController();
        registerProjectConnection('proj-A', a);
        registerProjectConnection('proj-B', b);

        emitProjectEvent('proj-A', {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'updated',
            id: 'x',
        });

        expect(aOut.length).toBe(1);
        expect(bOut.length).toBe(0);

        unregisterProjectConnection('proj-A', a);
        unregisterProjectConnection('proj-B', b);
    });

    test('unregistering removes the controller from the set', () => {
        const { controller, enqueued } = makeController();
        registerProjectConnection('proj-X', controller);
        unregisterProjectConnection('proj-X', controller);

        emitProjectEvent('proj-X', {
            type: 'entity_updated',
            entity: 'cost_line',
            op: 'created',
            id: 'cl-1',
        });

        expect(enqueued.length).toBe(0);
    });
});
