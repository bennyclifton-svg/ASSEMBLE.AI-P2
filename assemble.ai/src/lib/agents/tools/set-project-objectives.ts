/**
 * set_project_objectives - propose replacing or appending project objectives.
 */

import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';
import {
    asObject,
    copyToolUseId,
    optionalEnum,
    optionalStringArray,
    type AwaitingApprovalOutput,
} from './_write-helpers';
import type { ObjectiveType } from '@/lib/db/objectives-schema';

const TOOL = 'set_project_objectives';
const OBJECTIVE_TYPES = ['planning', 'functional', 'quality', 'compliance'] as const;
const MODES = ['replace', 'append'] as const;

interface SetProjectObjectivesInput extends Record<string, unknown> {
    mode?: 'replace' | 'append';
    planning?: string[];
    functional?: string[];
    quality?: string[];
    compliance?: string[];
    _toolUseId?: string;
}

function sectionCount(input: SetProjectObjectivesInput): number {
    return OBJECTIVE_TYPES.reduce((count, type) => count + (input[type]?.length ?? 0), 0);
}

function formatObjectives(items: string[] | undefined): string {
    if (!items || items.length === 0) return '';
    return items.map((item) => `- ${item}`).join('\n');
}

const definition: AgentToolDefinition<SetProjectObjectivesInput, AwaitingApprovalOutput> = {
    spec: {
        name: TOOL,
        description:
            'Propose project objective rows for the Brief > Objectives area. Use this when the user asks to populate, generate, replace, append, redraft, or update planning, functional, quality, or compliance objectives. The objectives are not written until the user approves the inline approval card.',
        inputSchema: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    enum: [...MODES],
                    description:
                        'replace deletes current rows in each supplied section before inserting the new objectives; append keeps existing rows and adds these after them. Defaults to replace.',
                },
                planning: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Planning approval, council, authority, environmental, or DA objectives.',
                },
                functional: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Physical, spatial, operational, and user requirement objectives.',
                },
                quality: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Finish, performance, sustainability, and user experience objectives.',
                },
                compliance: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'NCC, BCA, Australian Standards, certification, and code objectives.',
                },
            },
        },
    },
    mutating: true,
    validate(input: unknown): SetProjectObjectivesInput {
        const obj = asObject(input, TOOL);
        const out: SetProjectObjectivesInput = {};
        const mode = optionalEnum(obj, 'mode', MODES, TOOL);
        if (mode) out.mode = mode;

        for (const type of OBJECTIVE_TYPES) {
            const objectives = optionalStringArray(obj, type, TOOL);
            if (objectives !== undefined) out[type] = objectives;
        }

        if (sectionCount(out) === 0) {
            throw new Error(`${TOOL}: at least one objective section with one objective is required`);
        }

        copyToolUseId(obj, out);
        return out;
    },
    async execute(ctx: ToolContext, input: SetProjectObjectivesInput): Promise<AwaitingApprovalOutput> {
        await assertProjectOrg(ctx);

        const mode = input.mode ?? 'replace';
        const changes: ProposedDiff['changes'] = [];
        for (const section of OBJECTIVE_TYPES) {
            const objectives = input[section];
            if (!objectives || objectives.length === 0) continue;
            changes.push({
                field: section,
                label: `${section[0].toUpperCase()}${section.slice(1)} objectives`,
                before: mode === 'replace' ? 'Current objectives in this section' : 'Existing objectives retained',
                after: formatObjectives(objectives),
            });
        }

        const sectionLabels = OBJECTIVE_TYPES.filter((type) => input[type]?.length).join(', ');
        const action = mode === 'append' ? 'Append' : 'Replace';
        const diff: ProposedDiff = {
            entity: 'project_objectives',
            entityId: null,
            summary: `${action} project objectives - ${sectionLabels}`,
            changes,
        };

        return (
            await proposeApproval({
                ctx,
                toolName: TOOL,
                toolUseId: input._toolUseId ?? '',
                input: { ...input, mode },
                proposedDiff: diff,
                expectedRowVersion: null,
            })
        ).toolResult;
    },
};

registerTool(definition);

export { definition as setProjectObjectivesTool };
export type { SetProjectObjectivesInput, ObjectiveType };
