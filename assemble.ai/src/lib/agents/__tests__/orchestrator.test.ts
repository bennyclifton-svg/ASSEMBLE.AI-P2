/**
 * @jest-environment node
 */

jest.mock('../runner', () => ({ runAgent: jest.fn() }));

import { formatOrchestratorFinalText, routeAgents } from '../orchestrator';

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

    test('routes issue-variation workflow requests to finance even when they mention programme and notes', () => {
        expect(
            routeAgents(
                'Client asked for extra acoustic treatment to meeting rooms. Please issue a variation for about $18,750, link it to the right cost line/programme activity if you can tell, and add a short project note. Treat this as test data and ask only if the mapping is unclear.'
            )
        ).toEqual(['finance']);
    });

    test('routes standalone issue variation requests to finance', () => {
        expect(routeAgents('Please issue a Principal variation for about $18,750')).toEqual(['finance']);
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

    test('routes meeting creation to design', () => {
        expect(routeAgents('create a new meeting called Pre-DA Meeting')).toEqual(['design']);
    });

    test('routes generic note creation to design instead of falling back to finance', () => {
        expect(routeAgents('create a new note titled Site access delay')).toEqual(['design']);
    });

    test('routes programme-specific note creation to program', () => {
        expect(routeAgents('create a programme note about the EOT delay')).toEqual(['program']);
    });

    test('routes consultant addendum creation to design', () => {
        expect(
            routeAgents(
                'create a new addendum for the Mechanical Consultant, attach all mechanical documents'
            )
        ).toEqual(['design']);
    });

    test('routes document selection to design', () => {
        expect(routeAgents('select all mech docs')).toEqual(['design']);
    });

    test('routes RFT brief creation to design', () => {
        expect(
            routeAgents('Create the Architectural Services Brief within the Architectural RFT.')
        ).toEqual(['design']);
    });

    test('routes project objective population to design', () => {
        expect(routeAgents('populate the objectives')).toEqual(['design']);
    });
});

describe('formatOrchestratorFinalText', () => {
    test('uses one project-manager voice for single specialist results', () => {
        expect(
            formatOrchestratorFinalText([
                {
                    agentName: 'finance',
                    text: "I've put the proposed changes in the approval cards above.",
                },
            ])
        ).toBe("I've put the proposed changes in the approval cards above.");
    });

    test('does not expose specialist routing on single specialist errors', () => {
        expect(
            formatOrchestratorFinalText([
                {
                    agentName: 'finance',
                    text: 'workflow schema error',
                    isError: true,
                },
            ])
        ).toBe("I couldn't complete that project check: workflow schema error");
    });

    test('uses domain sections for multi-domain checks', () => {
        expect(
            formatOrchestratorFinalText([
                { agentName: 'finance', text: 'Cost position is stable.' },
                { agentName: 'program', text: 'Programme has one watch item.' },
            ])
        ).toContain('**Programme:**');
    });
});
