/**
 * list_invoices - read the project invoice / progress-claim register.
 */

import { db } from '@/lib/db';
import { companies, costLines, invoices, variations } from '@/lib/db/pg-schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';

interface ListInvoicesInput {
    periodYear?: number;
    periodMonth?: number;
    costLineId?: string;
    variationId?: string;
    paidStatus?: 'unpaid' | 'paid' | 'partial';
    query?: string;
    limit?: number;
}

interface ListInvoicesOutput {
    projectId: string;
    rowCount: number;
    truncated: boolean;
    totals: {
        amountCents: number;
        gstCents: number;
        grossCents: number;
        paidCount: number;
        unpaidCount: number;
        partialCount: number;
    };
    rows: Array<{
        id: string;
        costLineId: string | null;
        variationId: string | null;
        companyId: string | null;
        invoiceDate: string;
        poNumber: string | null;
        invoiceNumber: string;
        description: string | null;
        amountCents: number;
        gstCents: number;
        grossCents: number;
        periodYear: number;
        periodMonth: number;
        paidStatus: string;
        paidDate: string | null;
        costLine: {
            id: string;
            costCode: string | null;
            activity: string;
            section: string;
            label: string;
        } | null;
        variation: {
            id: string;
            variationNumber: string;
            description: string;
        } | null;
        company: {
            id: string;
            name: string;
        } | null;
    }>;
}

type InvoiceRow = {
    id: string;
    costLineId: string | null;
    variationId: string | null;
    companyId: string | null;
    invoiceDate: string;
    poNumber: string | null;
    invoiceNumber: string;
    description: string | null;
    amountCents: number;
    gstCents: number | null;
    periodYear: number;
    periodMonth: number;
    paidStatus: string | null;
    paidDate: string | null;
    costLineCostCode: string | null;
    costLineActivity: string | null;
    costLineSection: string | null;
    variationNumber: string | null;
    variationDescription: string | null;
    companyName: string | null;
};

const DEFAULT_LIMIT = 100;
const HARD_LIMIT = 500;
const VALID_PAID_STATUS = ['unpaid', 'paid', 'partial'] as const;

const definition: AgentToolDefinition<ListInvoicesInput, ListInvoicesOutput> = {
    spec: {
        name: 'list_invoices',
        description:
            'List invoice / progress-claim ledger entries for the current project. ' +
            'Use this to answer invoice register, invoice log, payment log, progress-claim log, ' +
            'or period summary questions. Returns amounts in cents, GST, paid status, invoice dates, ' +
            'period fields, and linked cost-line, variation, and company labels. Filter by periodYear ' +
            'and periodMonth for a monthly log such as April 2026.',
        inputSchema: {
            type: 'object',
            properties: {
                periodYear: {
                    type: 'integer',
                    minimum: 1900,
                    maximum: 3000,
                    description: 'Optional invoice period year, for example 2026.',
                },
                periodMonth: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 12,
                    description: 'Optional invoice period month where January is 1 and December is 12.',
                },
                costLineId: {
                    type: 'string',
                    description: 'Optional cost-line id filter.',
                },
                variationId: {
                    type: 'string',
                    description: 'Optional variation id filter.',
                },
                paidStatus: {
                    type: 'string',
                    enum: [...VALID_PAID_STATUS],
                    description: 'Optional exact paid-status filter.',
                },
                query: {
                    type: 'string',
                    description:
                        'Optional text search across invoice number, PO number, description, company, cost-line, and variation labels.',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: HARD_LIMIT,
                    description: `Maximum rows to return (default ${DEFAULT_LIMIT}).`,
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListInvoicesInput {
        if (input === undefined || input === null) return {};
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('list_invoices: input must be an object');
        }
        const obj = input as Record<string, unknown>;
        const out: ListInvoicesInput = {};

        if (obj.periodYear !== undefined) {
            if (
                typeof obj.periodYear !== 'number' ||
                !Number.isInteger(obj.periodYear) ||
                obj.periodYear < 1900 ||
                obj.periodYear > 3000
            ) {
                throw new Error('list_invoices: "periodYear" must be an integer between 1900 and 3000');
            }
            out.periodYear = obj.periodYear;
        }
        if (obj.periodMonth !== undefined) {
            if (
                typeof obj.periodMonth !== 'number' ||
                !Number.isInteger(obj.periodMonth) ||
                obj.periodMonth < 1 ||
                obj.periodMonth > 12
            ) {
                throw new Error('list_invoices: "periodMonth" must be an integer between 1 and 12');
            }
            out.periodMonth = obj.periodMonth;
        }
        for (const key of ['costLineId', 'variationId', 'query'] as const) {
            if (obj[key] === undefined) continue;
            if (typeof obj[key] !== 'string') throw new Error(`list_invoices: "${key}" must be a string`);
            const value = obj[key].trim();
            if (value) out[key] = value;
        }
        if (obj.paidStatus !== undefined) {
            if (
                typeof obj.paidStatus !== 'string' ||
                !VALID_PAID_STATUS.includes(obj.paidStatus as ListInvoicesInput['paidStatus'])
            ) {
                throw new Error(`list_invoices: "paidStatus" must be one of ${VALID_PAID_STATUS.join(', ')}`);
            }
            out.paidStatus = obj.paidStatus as ListInvoicesInput['paidStatus'];
        }
        if (obj.limit !== undefined) {
            if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit)) {
                throw new Error('list_invoices: "limit" must be an integer');
            }
            out.limit = Math.max(1, Math.min(HARD_LIMIT, obj.limit));
        }
        return out;
    },
    async execute(ctx: ToolContext, input: ListInvoicesInput): Promise<ListInvoicesOutput> {
        await assertProjectOrg(ctx);

        const limit = input.limit ?? DEFAULT_LIMIT;
        const fetchLimit = input.query ? HARD_LIMIT : limit;
        const conditions = [
            eq(invoices.projectId, ctx.projectId),
            isNull(invoices.deletedAt),
        ];
        if (input.periodYear !== undefined) conditions.push(eq(invoices.periodYear, input.periodYear));
        if (input.periodMonth !== undefined) conditions.push(eq(invoices.periodMonth, input.periodMonth));
        if (input.costLineId) conditions.push(eq(invoices.costLineId, input.costLineId));
        if (input.variationId) conditions.push(eq(invoices.variationId, input.variationId));
        if (input.paidStatus) conditions.push(eq(invoices.paidStatus, input.paidStatus));

        let rows = await db
            .select({
                id: invoices.id,
                costLineId: invoices.costLineId,
                variationId: invoices.variationId,
                companyId: invoices.companyId,
                invoiceDate: invoices.invoiceDate,
                poNumber: invoices.poNumber,
                invoiceNumber: invoices.invoiceNumber,
                description: invoices.description,
                amountCents: invoices.amountCents,
                gstCents: invoices.gstCents,
                periodYear: invoices.periodYear,
                periodMonth: invoices.periodMonth,
                paidStatus: invoices.paidStatus,
                paidDate: invoices.paidDate,
                costLineCostCode: costLines.costCode,
                costLineActivity: costLines.activity,
                costLineSection: costLines.section,
                variationNumber: variations.variationNumber,
                variationDescription: variations.description,
                companyName: companies.name,
            })
            .from(invoices)
            .leftJoin(costLines, eq(invoices.costLineId, costLines.id))
            .leftJoin(variations, eq(invoices.variationId, variations.id))
            .leftJoin(companies, eq(invoices.companyId, companies.id))
            .where(and(...conditions))
            .orderBy(desc(invoices.invoiceDate), desc(invoices.invoiceNumber))
            .limit(fetchLimit + 1);

        if (input.query) {
            const query = input.query.toLowerCase();
            rows = rows.filter((row) => invoiceSearchText(row).includes(query));
        }

        const truncated = rows.length > limit;
        const trimmed = truncated ? rows.slice(0, limit) : rows;
        return invoiceOutput(ctx.projectId, trimmed, truncated);
    },
};

function invoiceSearchText(row: InvoiceRow): string {
    return [
        row.invoiceNumber,
        row.poNumber,
        row.description,
        row.companyName,
        row.costLineCostCode,
        row.costLineActivity,
        row.costLineSection,
        row.variationNumber,
        row.variationDescription,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function costLineLabel(row: InvoiceRow): string {
    return [row.costLineSection, row.costLineCostCode, row.costLineActivity]
        .filter(Boolean)
        .join(' - ');
}

function invoiceOutput(
    projectId: string,
    rows: InvoiceRow[],
    truncated: boolean
): ListInvoicesOutput {
    const totals = rows.reduce(
        (sum, row) => {
            const amountCents = row.amountCents ?? 0;
            const gstCents = row.gstCents ?? 0;
            sum.amountCents += amountCents;
            sum.gstCents += gstCents;
            sum.grossCents += amountCents + gstCents;
            if (row.paidStatus === 'paid') sum.paidCount += 1;
            else if (row.paidStatus === 'partial') sum.partialCount += 1;
            else sum.unpaidCount += 1;
            return sum;
        },
        {
            amountCents: 0,
            gstCents: 0,
            grossCents: 0,
            paidCount: 0,
            unpaidCount: 0,
            partialCount: 0,
        }
    );

    return {
        projectId,
        rowCount: rows.length,
        truncated,
        totals,
        rows: rows.map((row) => {
            const gstCents = row.gstCents ?? 0;
            return {
                id: row.id,
                costLineId: row.costLineId ?? null,
                variationId: row.variationId ?? null,
                companyId: row.companyId ?? null,
                invoiceDate: row.invoiceDate,
                poNumber: row.poNumber ?? null,
                invoiceNumber: row.invoiceNumber,
                description: row.description ?? null,
                amountCents: row.amountCents ?? 0,
                gstCents,
                grossCents: (row.amountCents ?? 0) + gstCents,
                periodYear: row.periodYear,
                periodMonth: row.periodMonth,
                paidStatus: row.paidStatus ?? 'unpaid',
                paidDate: row.paidDate ?? null,
                costLine: row.costLineActivity
                    ? {
                          id: row.costLineId as string,
                          costCode: row.costLineCostCode ?? null,
                          activity: row.costLineActivity,
                          section: row.costLineSection ?? '',
                          label: costLineLabel(row),
                      }
                    : null,
                variation: row.variationNumber
                    ? {
                          id: row.variationId as string,
                          variationNumber: row.variationNumber,
                          description: row.variationDescription ?? '',
                      }
                    : null,
                company: row.companyName
                    ? {
                          id: row.companyId as string,
                          name: row.companyName,
                      }
                    : null,
            };
        }),
    };
}

registerTool(definition);

export { definition as listInvoicesTool };
