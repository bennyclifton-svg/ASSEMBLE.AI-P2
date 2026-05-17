import { z } from 'zod';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyCreateMeeting } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const AGENDA_TYPES = ['standard', 'detailed', 'custom'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const inputSchema = z.object({
    title: z.string().trim().min(1),
    meetingDate: z.string().regex(ISO_DATE).optional(),
    agendaType: z.enum(AGENDA_TYPES).optional(),
    groupId: z.string().trim().min(1).optional(),
    _toolUseId: z.string().optional(),
});

export type CreateMeetingInput = z.infer<typeof inputSchema>;

const FIELDS: Array<{ key: keyof CreateMeetingInput; label: string }> = [
    { key: 'title', label: 'Title' },
    { key: 'meetingDate', label: 'Meeting date' },
    { key: 'agendaType', label: 'Agenda type' },
    { key: 'groupId', label: 'Meeting group' },
];

export const createMeetingAction = defineAction<CreateMeetingInput, Record<string, unknown>>({
    id: 'correspondence.meeting.create',
    toolName: 'create_meeting',
    domain: 'correspondence',
    description: 'Create a project meeting record. The meeting is proposed for approval before it is inserted.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design', 'orchestrator'],
    emits: [{ entity: 'meeting', op: 'created' }],
    uiTarget: { tab: 'meetings', focusEntity: 'meeting' },
    prepareProposal(_ctx, input) {
        const proposalInput = {
            ...input,
            agendaType: input.agendaType ?? 'standard',
            meetingDate: input.meetingDate ?? null,
        };
        const changes: ProposedDiff['changes'] = FIELDS.filter((field) => proposalInput[field.key] !== undefined).map(
            (field) => ({
                field: field.key,
                label: field.label,
                before: '-',
                after: proposalInput[field.key],
            })
        );
        return {
            proposedDiff: {
                entity: 'meeting',
                entityId: null,
                summary: `Create meeting - ${input.title}`,
                changes,
            },
            expectedRowVersion: null,
            input: proposalInput,
        };
    },
    applyResult(ctx, input) {
        return applyCreateMeeting(input, ctx);
    },
});
