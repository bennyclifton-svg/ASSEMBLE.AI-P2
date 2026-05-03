/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/rag/retrieval', () => ({ retrieve: jest.fn(), retrieveFromDomains: jest.fn() }));
jest.mock('@/lib/agents/events', () => ({ emitChatEvent: jest.fn() }));
jest.mock('@/lib/agents/project-events', () => ({ emitProjectEvent: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'test-id' }));

import '@/lib/agents/tools';
import { getActionByToolName } from '@/lib/actions/registry';
import { getTool } from '../tools/catalog';
import design from '../specialists/design';
import finance from '../specialists/finance';
import program from '../specialists/program';

const TRACER_TOOLS = [
    {
        friendly: 'create_note',
        alias: 'action_correspondence_note_create',
        actionId: 'correspondence.note.create',
        agents: [finance, program, design],
    },
    {
        friendly: 'update_note',
        alias: 'action_correspondence_note_update',
        actionId: 'correspondence.note.update',
        agents: [finance, program, design],
    },
    {
        friendly: 'attach_documents_to_note',
        alias: 'action_correspondence_note_attach_documents',
        actionId: 'correspondence.note.attach_documents',
        agents: [finance, program, design],
    },
    {
        friendly: 'create_transmittal',
        alias: 'action_correspondence_transmittal_create',
        actionId: 'correspondence.transmittal.create',
        agents: [design],
    },
    {
        friendly: 'update_cost_line',
        alias: 'action_finance_cost_plan_update_line',
        actionId: 'finance.cost_plan.update_line',
        agents: [finance],
    },
    {
        friendly: 'create_variation',
        alias: 'action_finance_variations_create',
        actionId: 'finance.variations.create',
        agents: [finance],
    },
    {
        friendly: 'create_program_activity',
        alias: 'action_program_activity_create',
        actionId: 'program.activity.create',
        agents: [program],
    },
    {
        friendly: 'update_program_activity',
        alias: 'action_program_activity_update',
        actionId: 'program.activity.update',
        agents: [program],
    },
    {
        friendly: 'create_program_milestone',
        alias: 'action_program_milestone_create',
        actionId: 'program.milestone.create',
        agents: [program],
    },
    {
        friendly: 'update_program_milestone',
        alias: 'action_program_milestone_update',
        actionId: 'program.milestone.update',
        agents: [program],
    },
    {
        friendly: 'set_project_objectives',
        alias: 'action_planning_objectives_set',
        actionId: 'planning.objectives.set',
        agents: [design],
    },
] as const;

describe('action-backed tracer tool cutover', () => {
    it('exposes friendly tool names without generated action aliases', () => {
        for (const tracer of TRACER_TOOLS) {
            expect(getTool(tracer.alias)).toBeUndefined();
            for (const agent of tracer.agents) {
                expect(agent.allowedTools).toContain(tracer.friendly);
                expect(agent.allowedTools).not.toContain(tracer.alias);
            }
        }
    });

    it('resolves each friendly tracer tool through the action registry', () => {
        for (const tracer of TRACER_TOOLS) {
            const action = getActionByToolName(tracer.friendly);
            const tool = getTool(tracer.friendly);

            expect(action?.id).toBe(tracer.actionId);
            expect(tool).toBeDefined();
            expect(tool?.spec.name).toBe(tracer.friendly);
            expect(tool?.spec.description).toBe(action?.description);
        }
    });
});
