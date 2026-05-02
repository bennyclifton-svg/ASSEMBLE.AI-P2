/**
 * create_meeting - propose a new meeting record with default agenda sections.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    copyToolUseId,
    createDiffChanges,
    optionalEnum,
    optionalIsoDate,
    optionalString,
    requiredString,
    asObject,
    type AwaitingApprovalOutput,
} from './_write-helpers';

interface CreateMeetingInput extends Record<string, unknown> {
    title: string;
    meetingDate?: string;
    agendaType?: 'standard' | 'detailed' | 'custom';
    groupId?: string;
    _toolUseId?: string;
}

const TOOL = 'create_meeting';
const AGENDA_TYPES = ['standard', 'detailed', 'custom'] as const;

const definition: AgentToolDefinition<CreateMeetingInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose a new project meeting record. Use this for design-team, consultant, authority, DA/pre-DA, planning, progress, or other project meetings. If no date is supplied, create the meeting without a date. The meeting is not created until the user approves the inline approval card.',
        inputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Meeting title, for example "Pre-DA Meeting".',
                },
                meetingDate: {
                    type: 'string',
                    description: 'Optional meeting date in YYYY-MM-DD format.',
                },
                agendaType: {
                    type: 'string',
                    enum: [...AGENDA_TYPES],
                    description: 'Agenda template to apply. Defaults to standard.',
                },
                groupId: {
                    type: 'string',
                    description: 'Optional meeting group id if the user names an existing group.',
                },
            },
            required: ['title'],
        },
    },
    mutating: true,
    validate(input: unknown): CreateMeetingInput {
        const obj = asObject(input, TOOL);
        const out: CreateMeetingInput = { title: requiredString(obj, 'title', TOOL) };

        const meetingDate = optionalIsoDate(obj, 'meetingDate', TOOL);
        if (meetingDate !== undefined) out.meetingDate = meetingDate;

        const agendaType = optionalEnum(obj, 'agendaType', AGENDA_TYPES, TOOL);
        if (agendaType !== undefined) out.agendaType = agendaType;

        const groupId = optionalString(obj, 'groupId', TOOL);
        if (groupId) out.groupId = groupId;

        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: CreateMeetingInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const changes = createDiffChanges(
            {
                ...input,
                agendaType: input.agendaType ?? 'standard',
                meetingDate: input.meetingDate ?? null,
            },
            [
                { key: 'title', label: 'Title' },
                { key: 'meetingDate', label: 'Meeting date' },
                { key: 'agendaType', label: 'Agenda type' },
                { key: 'groupId', label: 'Meeting group' },
            ]
        );

        const diff: ProposedDiff = {
            entity: 'meeting',
            entityId: null,
            summary: `Create meeting - ${input.title}`,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input,
                proposedDiff: diff,
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as createMeetingTool };
