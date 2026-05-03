import { z } from 'zod';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applySetProjectObjectives } from '@/lib/agents/applicators';
import { defineAction } from '../define';

const OBJECTIVE_TYPES = ['planning', 'functional', 'quality', 'compliance'] as const;
const MODES = ['replace', 'append'] as const;

const inputSchema = z
    .object({
        mode: z.enum(MODES).optional(),
        planning: z.array(z.string().trim().min(1)).optional(),
        functional: z.array(z.string().trim().min(1)).optional(),
        quality: z.array(z.string().trim().min(1)).optional(),
        compliance: z.array(z.string().trim().min(1)).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        const count = OBJECTIVE_TYPES.reduce(
            (total, type) => total + (input[type]?.length ?? 0),
            0
        );
        if (count === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one objective section is required.',
                path: ['planning'],
            });
        }
    });

type SetProjectObjectivesInput = z.infer<typeof inputSchema>;

function formatObjectives(items: string[] | undefined): string {
    if (!items?.length) return '';
    return items.map((item) => `- ${item}`).join('\n');
}

export const setProjectObjectivesAction = defineAction<
    SetProjectObjectivesInput,
    Record<string, unknown>
>({
    id: 'planning.objectives.set',
    toolName: 'set_project_objectives',
    domain: 'planning',
    description: 'Replace or append project brief objectives.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design', 'orchestrator'],
    emits: [{ entity: 'objective', op: 'updated' }],
    uiTarget: { tab: 'brief', sub: 'objectives', focusEntity: 'objective' },
    prepareProposal(_ctx, input) {
        const mode = input.mode ?? 'replace';
        const changes: ProposedDiff['changes'] = [];
        for (const section of OBJECTIVE_TYPES) {
            const objectives = input[section];
            if (!objectives?.length) continue;
            changes.push({
                field: section,
                label: `${section[0].toUpperCase()}${section.slice(1)} objectives`,
                before:
                    mode === 'replace'
                        ? 'Current objectives in this section'
                        : 'Existing objectives retained',
                after: formatObjectives(objectives),
            });
        }

        const sectionLabels = OBJECTIVE_TYPES.filter((type) => input[type]?.length).join(', ');
        return {
            proposedDiff: {
                entity: 'project_objectives',
                entityId: null,
                summary: `${mode === 'append' ? 'Append' : 'Replace'} project objectives - ${sectionLabels}`,
                changes,
            },
            input: { ...input, mode },
        };
    },
    applyResult(ctx, input) {
        return applySetProjectObjectives(input, ctx);
    },
});
