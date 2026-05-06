/**
 * list_reports - read recent project reports and contents sections.
 */

import { db } from '@/lib/db';
import { reportSections, reports } from '@/lib/db/pg-schema';
import { and, asc, desc, eq, ilike, inArray, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListReportsInput {
    query?: string;
    includeSections?: boolean;
    limit?: number;
}

interface ReportSectionOutput {
    id: string;
    sectionKey: string;
    sectionLabel: string;
    content: string | null;
    sortOrder: number;
    stakeholderId: string | null;
}

interface ListReportsOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    rows: Array<{
        id: string;
        title: string;
        reportDate: string | null;
        preparedFor: string | null;
        preparedBy: string | null;
        contentsType: string | null;
        reportingPeriodStart: string | null;
        reportingPeriodEnd: string | null;
        updatedAt: string | null;
        sections?: ReportSectionOutput[];
    }>;
}

const TOOL = 'list_reports';
const DEFAULT_LIMIT = 10;
const HARD_LIMIT = 50;

const definition: AgentToolDefinition<ListReportsInput, ListReportsOutput> = {
    spec: {
        name: TOOL,
        description:
            'List recent project reports from the Notes/Meetings/Reports area, optionally filtered by title. Use query="PCG" to inspect existing Project Control Group reports before creating the next monthly PCG report.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Optional case-insensitive title search, for example "PCG".',
                },
                includeSections: {
                    type: 'boolean',
                    description: 'Include report contents sections. Defaults to true.',
                },
                limit: { type: 'integer', minimum: 1, maximum: HARD_LIMIT },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListReportsInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error(`${TOOL}: input must be an object`);
        }
        const obj = input as Record<string, unknown>;
        const out: ListReportsInput = {};
        if (obj.query !== undefined) {
            if (typeof obj.query !== 'string') throw new Error(`${TOOL}: "query" must be a string`);
            const trimmed = obj.query.trim();
            if (trimmed) out.query = trimmed;
        }
        if (obj.includeSections !== undefined) {
            if (typeof obj.includeSections !== 'boolean') {
                throw new Error(`${TOOL}: "includeSections" must be a boolean`);
            }
            out.includeSections = obj.includeSections;
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error(`${TOOL}: "limit" must be an integer`);
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListReportsInput): Promise<ListReportsOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const conditions = [
            eq(reports.projectId, ctx.projectId),
            eq(reports.organizationId, ctx.organizationId),
            isNull(reports.deletedAt),
        ];
        if (input.query) conditions.push(ilike(reports.title, `%${input.query}%`));

        const reportRows = await db
            .select({
                id: reports.id,
                title: reports.title,
                reportDate: reports.reportDate,
                preparedFor: reports.preparedFor,
                preparedBy: reports.preparedBy,
                contentsType: reports.contentsType,
                reportingPeriodStart: reports.reportingPeriodStart,
                reportingPeriodEnd: reports.reportingPeriodEnd,
                updatedAt: reports.updatedAt,
            })
            .from(reports)
            .where(and(...conditions))
            .orderBy(desc(reports.reportDate), desc(reports.updatedAt))
            .limit(limit + 1);

        const truncated = reportRows.length > limit;
        const trimmed = truncated ? reportRows.slice(0, limit) : reportRows;
        const sectionsByReport = new Map<string, ReportSectionOutput[]>();

        if ((input.includeSections ?? true) && trimmed.length > 0) {
            const sectionRows = await db
                .select({
                    id: reportSections.id,
                    reportId: reportSections.reportId,
                    sectionKey: reportSections.sectionKey,
                    sectionLabel: reportSections.sectionLabel,
                    content: reportSections.content,
                    sortOrder: reportSections.sortOrder,
                    stakeholderId: reportSections.stakeholderId,
                })
                .from(reportSections)
                .where(inArray(reportSections.reportId, trimmed.map((row) => row.id)))
                .orderBy(asc(reportSections.reportId), asc(reportSections.sortOrder));

            for (const row of sectionRows) {
                const bucket = sectionsByReport.get(row.reportId) ?? [];
                bucket.push({
                    id: row.id,
                    sectionKey: row.sectionKey,
                    sectionLabel: row.sectionLabel,
                    content: row.content ?? null,
                    sortOrder: row.sortOrder,
                    stakeholderId: row.stakeholderId ?? null,
                });
                sectionsByReport.set(row.reportId, bucket);
            }
        }

        return {
            projectId: ctx.projectId,
            rowCount: trimmed.length,
            truncated,
            rows: trimmed.map((row) => ({
                id: row.id,
                title: row.title,
                reportDate: row.reportDate ?? null,
                preparedFor: row.preparedFor ?? null,
                preparedBy: row.preparedBy ?? null,
                contentsType: row.contentsType ?? null,
                reportingPeriodStart: row.reportingPeriodStart ?? null,
                reportingPeriodEnd: row.reportingPeriodEnd ?? null,
                updatedAt: row.updatedAt ?? null,
                ...((input.includeSections ?? true)
                    ? { sections: sectionsByReport.get(row.id) ?? [] }
                    : {}),
            })),
        };
    },
};

registerTool(definition);

export { definition as listReportsTool };
