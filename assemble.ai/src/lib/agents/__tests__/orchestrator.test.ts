/**
 * @jest-environment node
 */

import { routeAgents } from '../orchestrator';

describe('routeAgents', () => {
    test('fans out broad status requests', () => {
        expect(routeAgents('Give me a project status briefing')).toEqual([
            'finance',
            'program',
            'design',
        ]);
    });

    test('routes single-domain finance requests', () => {
        expect(routeAgents('What is the current budget variance?')).toEqual(['finance']);
    });

    test('routes invoice creation to finance even when the cost line has design words', () => {
        expect(
            routeAgents('add 3 invoices, each value at 15000 to architect scheme design')
        ).toEqual(['finance']);
    });

    test('routes multi-domain impact requests', () => {
        expect(routeAgents('What does this delay mean for completion and cost?')).toEqual([
            'finance',
            'program',
        ]);
    });

    test('routes design and approvals language to design', () => {
        expect(routeAgents('Are the DA conditions reflected in the drawings?')).toEqual(['design']);
    });
});
