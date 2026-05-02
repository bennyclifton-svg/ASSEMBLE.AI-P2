/**
 * list_meetings - read recent meetings and agenda/minute sections.
 */

import { db } from '@/lib/db';
import { meetings, meetingSections } from '@/lib/db/pg-schema';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListMeetingsInput {
    includeSections?: boolean;
    limit?: number;
}

interface MeetingSectionOutput {
    id: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    stakeholderId: string | null;
}

interface ListMeetingsOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    rows: Array<{
        id: string;
        title: string;
        meetingDate: string | null;
        agendaType: string | null;
        reportingPeriodStart: string | null;
        reportingPeriodEnd: string | null;
        updatedAt: string | null;
        sections?: MeetingSectionOutput[];
    }>;
}

const DEFAULT_LIMIT = 10;
const HARD_LIMIT = 50;

const definition: AgentToolDefinition<ListMeetingsInput, ListMeetingsOutput> = {
    spec: {
        name: 'list_meetings',
        description:
            'List recent project meetings, optionally including agenda/minute sections. Useful for checking decisions, actions, and stakeholder discussions.',
        inputSchema: {
            type: 'object',
            properties: {
                includeSections: {
                    type: 'boolean',
                    description: 'Include meeting sections/content. Defaults to true.',
                },
                limit: { type: 'integer', minimum: 1, maximum: HARD_LIMIT },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListMeetingsInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('list_meetings: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListMeetingsInput = {};
        if (obj.includeSections !== undefined) {
            if (typeof obj.includeSections !== 'boolean') throw new Error('list_meetings: "includeSections" must be a boolean');
            out.includeSections = obj.includeSections;
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_meetings: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListMeetingsInput): Promise<ListMeetingsOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const meetingRows = await db
            .select({
                id: meetings.id,
                title: meetings.title,
                meetingDate: meetings.meetingDate,
                agendaType: meetings.agendaType,
                reportingPeriodStart: meetings.reportingPeriodStart,
                reportingPeriodEnd: meetings.reportingPeriodEnd,
                updatedAt: meetings.updatedAt,
            })
            .from(meetings)
            .where(
                and(
                    eq(meetings.projectId, ctx.projectId),
                    eq(meetings.organizationId, ctx.organizationId),
                    isNull(meetings.deletedAt)
                )
            )
            .orderBy(desc(meetings.meetingDate), desc(meetings.updatedAt))
            .limit(limit + 1);

        const truncated = meetingRows.length > limit;
        const trimmed = truncated ? meetingRows.slice(0, limit) : meetingRows;
        const sectionsByMeeting = new Map<string, MeetingSectionOutput[]>();

        if ((input.includeSections ?? true) && trimmed.length > 0) {
            const sectionRows = await db
                .select({
                    id: meetingSections.id,
                    meetingId: meetingSections.meetingId,
                    sectionKey: meetingSections.sectionKey,
                    sectionLabel: meetingSections.sectionLabel,
                    content: meetingSections.content,
                    sortOrder: meetingSections.sortOrder,
                    stakeholderId: meetingSections.stakeholderId,
                })
                .from(meetingSections)
                .where(inArray(meetingSections.meetingId, trimmed.map((row) => row.id)))
                .orderBy(asc(meetingSections.meetingId), asc(meetingSections.sortOrder));

            for (const row of sectionRows) {
                const bucket = sectionsByMeeting.get(row.meetingId) ?? [];
                bucket.push({
                    id: row.id,
                    sectionKey: row.sectionKey,
                    sectionLabel: row.sectionLabel,
                    content: row.content ?? null,
                    sortOrder: row.sortOrder,
                    stakeholderId: row.stakeholderId ?? null,
                });
                sectionsByMeeting.set(row.meetingId, bucket);
            }
        }

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            truncated,
            rows: trimmed.map((row) => ({
                id: row.id,
                title: row.title,
                meetingDate: row.meetingDate ?? null,
                agendaType: row.agendaType ?? null,
                reportingPeriodStart: row.reportingPeriodStart ?? null,
                reportingPeriodEnd: row.reportingPeriodEnd ?? null,
                updatedAt: row.updatedAt ?? null,
                ...((input.includeSections ?? true)
                    ? { sections: sectionsByMeeting.get(row.id) ?? [] }
                    : {}),
            })),
        };
    },
};

registerTool(definition);

export { definition as listMeetingsTool };
