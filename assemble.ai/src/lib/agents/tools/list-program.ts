/**
 * list_program — read the project's programme activities, milestones, and dependencies.
 *
 * Read-only. Gives the Program Agent enough structured schedule data to answer
 * status, milestone, dependency, and readiness questions without touching the DB.
 */

import { db } from '@/lib/db';
import { programActivities, programDependencies, programMilestones } from '@/lib/db/pg-schema';
import { asc, eq, inArray } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListProgramInput {
    includeMilestones?: boolean;
    includeDependencies?: boolean;
}

interface ListProgramOutput {
    activityCount: number;
    activities: Array<{
        id: string;
        parentId: string | null;
        name: string;
        startDate: string | null;
        endDate: string | null;
        masterStage: string | null;
        sortOrder: number;
    }>;
    milestones: Array<{
        id: string;
        activityId: string;
        name: string;
        date: string;
        sortOrder: number;
    }>;
    dependencies: Array<{
        id: string;
        fromActivityId: string;
        toActivityId: string;
        type: string;
    }>;
}

const definition: AgentToolDefinition<ListProgramInput, ListProgramOutput> = {
    spec: {
        name: 'list_program',
        description:
            'Read the current project programme: activities, optional milestones, and optional dependencies. ' +
            'Use for programme status, milestone variance, readiness, delay, and completion-date questions.',
        inputSchema: {
            type: 'object',
            properties: {
                includeMilestones: {
                    type: 'boolean',
                    description: 'Whether to include milestones. Defaults to true.',
                },
                includeDependencies: {
                    type: 'boolean',
                    description: 'Whether to include activity dependencies. Defaults to true.',
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListProgramInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object') {
            throw new Error('list_program: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListProgramInput = {};
        if (obj.includeMilestones !== undefined) {
            if (typeof obj.includeMilestones !== 'boolean') {
                throw new Error('list_program: "includeMilestones" must be a boolean');
            }
            out.includeMilestones = obj.includeMilestones;
        }
        if (obj.includeDependencies !== undefined) {
            if (typeof obj.includeDependencies !== 'boolean') {
                throw new Error('list_program: "includeDependencies" must be a boolean');
            }
            out.includeDependencies = obj.includeDependencies;
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListProgramInput): Promise<ListProgramOutput> {
        await assertProjectOrg(ctx);

        const activities = await db
            .select({
                id: programActivities.id,
                parentId: programActivities.parentId,
                name: programActivities.name,
                startDate: programActivities.startDate,
                endDate: programActivities.endDate,
                masterStage: programActivities.masterStage,
                sortOrder: programActivities.sortOrder,
            })
            .from(programActivities)
            .where(eq(programActivities.projectId, ctx.projectId))
            .orderBy(asc(programActivities.sortOrder));

        const activityIds = activities.map((a) => a.id);
        let milestones: ListProgramOutput['milestones'] = [];
        let dependencies: ListProgramOutput['dependencies'] = [];

        if ((input.includeMilestones ?? true) && activityIds.length > 0) {
            milestones = await db
                .select({
                    id: programMilestones.id,
                    activityId: programMilestones.activityId,
                    name: programMilestones.name,
                    date: programMilestones.date,
                    sortOrder: programMilestones.sortOrder,
                })
                .from(programMilestones)
                .where(inArray(programMilestones.activityId, activityIds))
                .orderBy(asc(programMilestones.sortOrder));
        }

        if (input.includeDependencies ?? true) {
            dependencies = await db
                .select({
                    id: programDependencies.id,
                    fromActivityId: programDependencies.fromActivityId,
                    toActivityId: programDependencies.toActivityId,
                    type: programDependencies.type,
                })
                .from(programDependencies)
                .where(eq(programDependencies.projectId, ctx.projectId));
        }

        return {
            activityCount: activities.length,
            activities,
            milestones,
            dependencies,
        };
    },
};

registerTool(definition);

export { definition as listProgramTool };
