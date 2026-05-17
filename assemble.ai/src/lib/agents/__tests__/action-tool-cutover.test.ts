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
        friendly: 'create_report',
        alias: 'action_correspondence_report_create',
        actionId: 'correspondence.report.create',
        agents: [design],
    },
    {
        friendly: 'create_weekly_report_draft',
        alias: 'action_correspondence_weekly_report_create_draft',
        actionId: 'correspondence.weekly_report.create_draft',
        agents: [design],
    },
    {
        friendly: 'create_rfi',
        alias: 'action_correspondence_rfi_create',
        actionId: 'correspondence.rfi.create',
        agents: [design],
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
        friendly: 'create_meeting',
        alias: 'action_correspondence_meeting_create',
        actionId: 'correspondence.meeting.create',
        agents: [design],
    },
    {
        friendly: 'create_addendum',
        alias: 'action_correspondence_addendum_create',
        actionId: 'correspondence.addendum.create',
        agents: [design],
    },
    {
        friendly: 'create_cost_line',
        alias: 'action_finance_cost_plan_create_line',
        actionId: 'finance.cost_plan.create_line',
        agents: [finance],
    },
    {
        friendly: 'update_cost_line',
        alias: 'action_finance_cost_plan_update_line',
        actionId: 'finance.cost_plan.update_line',
        agents: [finance],
    },
    {
        friendly: 'record_invoice',
        alias: 'action_finance_invoices_record',
        actionId: 'finance.invoices.record',
        agents: [finance],
    },
    {
        friendly: 'create_variation',
        alias: 'action_finance_variations_create',
        actionId: 'finance.variations.create',
        agents: [finance],
    },
    {
        friendly: 'update_variation',
        alias: 'action_finance_variations_update',
        actionId: 'finance.variations.update',
        agents: [finance],
    },
    {
        friendly: 'create_risk',
        alias: 'action_risk_create',
        actionId: 'risk.create',
        agents: [finance, program],
    },
    {
        friendly: 'update_risk',
        alias: 'action_risk_update',
        actionId: 'risk.update',
        agents: [finance, program],
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
        friendly: 'replace_program',
        alias: 'action_program_replace',
        actionId: 'program.replace',
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
    {
        friendly: 'add_tender_firms',
        alias: 'action_procurement_tender_firms_add',
        actionId: 'procurement.tender_firms.add',
        agents: [design],
    },
    {
        friendly: 'update_stakeholder',
        alias: 'action_procurement_stakeholder_update',
        actionId: 'procurement.stakeholder.update',
        agents: [design],
    },
    {
        friendly: 'update_rft_brief',
        alias: 'action_procurement_rft_brief_update',
        actionId: 'procurement.rft_brief.update',
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
