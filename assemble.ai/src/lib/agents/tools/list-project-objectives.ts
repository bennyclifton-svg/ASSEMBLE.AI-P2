/**
 * list_project_objectives - read current project objective rows.
 */

import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
    projectObjectives,
    type ObjectiveType,
    VALID_OBJECTIVE_TYPES,
} from '@/lib/db/objectives-schema';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { asObject, optionalEnum } from './_write-helpers';

interface ListProjectObjectivesInput {
    objectiveType?: ObjectiveType;
}

const TOOL = 'list_project_objectives';

const definition: AgentToolDefinition<
    ListProjectObjectivesInput,
    Record<ObjectiveType, Array<Record<string, unknown>>>
> = {
    spec: {
        name: TOOL,
        description:
            'List the current project objective rows, grouped by planning, functional, quality, and compliance.',
        inputSchema: {
            type: 'object',
            properties: {
                objectiveType: {
                    type: 'string',
                    enum: VALID_OBJECTIVE_TYPES,
                    description: 'Optional section filter.',
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListProjectObjectivesInput {
        const obj = input === undefined ? {} : asObject(input, TOOL);
        const objectiveType = optionalEnum(obj, 'objectiveType', VALID_OBJECTIVE_TYPES, TOOL);
        return objectiveType ? { objectiveType } : {};
    },
    async execute(ctx: ToolContext, input: ListProjectObjectivesInput) {
        await assertProjectOrg(ctx);

        const conditions = [
            eq(projectObjectives.projectId, ctx.projectId),
            eq(projectObjectives.isDeleted, false),
        ];
        if (input.objectiveType) {
            conditions.push(eq(projectObjectives.objectiveType, input.objectiveType));
        }

        const rows = await db
            .select({
                id: projectObjectives.id,
                objectiveType: projectObjectives.objectiveType,
                source: projectObjectives.source,
                text: projectObjectives.text,
                textPolished: projectObjectives.textPolished,
                status: projectObjectives.status,
                sortOrder: projectObjectives.sortOrder,
            })
            .from(projectObjectives)
            .where(and(...conditions))
            .orderBy(asc(projectObjectives.objectiveType), asc(projectObjectives.sortOrder));

        const grouped: Record<ObjectiveType, Array<Record<string, unknown>>> = {
            planning: [],
            functional: [],
            quality: [],
            compliance: [],
        };

        for (const row of rows) {
            grouped[row.objectiveType as ObjectiveType].push(row as Record<string, unknown>);
        }

        return grouped;
    },
};

registerTool(definition);

export { definition as listProjectObjectivesTool };
