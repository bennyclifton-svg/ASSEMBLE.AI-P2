import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { applyRecordInvoice } from '@/lib/agents/applicators';
import {
    COST_LINE_AMBIGUITY_GAP,
    formatCostLineLabel,
    rankCostLineMatches,
} from '@/lib/agents/cost-line-matching';
import { defineAction } from '../define';

const VALID_PAID_STATUS = ['paid', 'unpaid'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NATURAL_DATE = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i;
const MONTHS: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
};

const inputSchema = z
    .object({
        invoiceNumber: z.string().trim().min(1),
        invoiceDate: z.string().trim().min(1),
        amountCents: z.number().int().nonnegative(),
        description: z.string().trim().optional(),
        gstCents: z.number().int().nonnegative().optional(),
        costLineId: z.string().trim().min(1).optional(),
        costCategory: z.string().trim().min(1).optional(),
        costLineReference: z.string().trim().min(1).optional(),
        disciplineOrTrade: z.string().trim().min(1).optional(),
        paidStatus: z.enum(VALID_PAID_STATUS).optional(),
        paidDate: z.string().trim().min(1).optional(),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        if (!normaliseDateInput(input.invoiceDate)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'invoiceDate must be YYYY-MM-DD or "D Month YYYY"',
                path: ['invoiceDate'],
            });
        }
        if (input.paidDate && !normaliseDateInput(input.paidDate)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'paidDate must be YYYY-MM-DD or "D Month YYYY"',
                path: ['paidDate'],
            });
        }
    });

export type RecordInvoiceInput = z.infer<typeof inputSchema>;
export type NormalizedRecordInvoiceInput = RecordInvoiceInput & {
    invoiceDate: string;
    paidDate?: string;
    periodYear: number;
    periodMonth: number;
};

function isValidDate(year: number, month: number, day: number): boolean {
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function normaliseDateInput(s: string): { iso: string; year: number; month: number; day: number } | null {
    const trimmed = s.trim();
    let year: number;
    let month: number;
    let day: number;

    if (ISO_DATE.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('-').map(Number);
        year = yyyy;
        month = mm;
        day = dd;
    } else {
        const natural = NATURAL_DATE.exec(trimmed);
        if (!natural) return null;
        day = Number(natural[1]);
        month = MONTHS[natural[2].toLowerCase()] ?? 0;
        year = Number(natural[3]);
    }

    if (!isValidDate(year, month, day)) return null;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { iso, year, month, day };
}

export function normalizeRecordInvoiceInput(input: RecordInvoiceInput): NormalizedRecordInvoiceInput {
    const invoiceDate = normaliseDateInput(input.invoiceDate);
    if (!invoiceDate) throw new Error('record_invoice: "invoiceDate" must be YYYY-MM-DD or "D Month YYYY"');
    const paidDate = input.paidDate ? normaliseDateInput(input.paidDate) : null;
    if (input.paidDate && !paidDate) {
        throw new Error('record_invoice: "paidDate" must be YYYY-MM-DD or "D Month YYYY"');
    }
    return {
        ...input,
        invoiceDate: invoiceDate.iso,
        ...(paidDate ? { paidDate: paidDate.iso } : {}),
        periodYear: invoiceDate.year,
        periodMonth: invoiceDate.month,
    };
}

function moneyValue(cents: number): string {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

export const recordInvoiceAction = defineAction<RecordInvoiceInput, Record<string, unknown>>({
    id: 'finance.invoices.record',
    toolName: 'record_invoice',
    domain: 'finance',
    description:
        'Record an invoice or progress claim against the project. The invoice is proposed for approval before it is inserted.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['finance', 'orchestrator'],
    emits: [{ entity: 'invoice', op: 'created' }],
    uiTarget: { tab: 'cost-planning', sub: 'invoices', focusEntity: 'invoice' },
    async prepareProposal(ctx, input) {
        const normalized = normalizeRecordInvoiceInput(input);
        const resolvedCostLine = await resolveCostLineForInvoice(ctx.projectId, normalized);
        const proposalInput: NormalizedRecordInvoiceInput = { ...normalized };
        if (resolvedCostLine) proposalInput.costLineId = resolvedCostLine.id;

        const changes: ProposedDiff['changes'] = [
            { field: 'invoiceNumber', label: 'Invoice number', before: '-', after: proposalInput.invoiceNumber },
            { field: 'invoiceDate', label: 'Invoice date', before: '-', after: proposalInput.invoiceDate },
            { field: 'amountCents', label: 'Amount', before: '-', after: moneyValue(proposalInput.amountCents) },
        ];
        if (proposalInput.description) {
            changes.push({ field: 'description', label: 'Description', before: '-', after: proposalInput.description });
        }
        if (proposalInput.gstCents !== undefined) {
            changes.push({ field: 'gstCents', label: 'GST', before: '-', after: moneyValue(proposalInput.gstCents) });
        }
        if (proposalInput.costLineId) {
            changes.push({
                field: 'costLineId',
                label: 'Cost line',
                before: '-',
                after: resolvedCostLine?.label ?? proposalInput.costLineId,
            });
        }
        if (proposalInput.paidStatus) {
            changes.push({ field: 'paidStatus', label: 'Paid status', before: '-', after: proposalInput.paidStatus });
        }
        if (proposalInput.paidDate) {
            changes.push({ field: 'paidDate', label: 'Paid date', before: '-', after: proposalInput.paidDate });
        }

        return {
            proposedDiff: {
                entity: 'invoice',
                entityId: null,
                summary: `Record invoice ${proposalInput.invoiceNumber} - ${moneyValue(proposalInput.amountCents)}`,
                changes,
            },
            expectedRowVersion: null,
            input: proposalInput,
        };
    },
    applyResult(ctx, input) {
        return applyRecordInvoice(normalizeRecordInvoiceInput(input), ctx);
    },
});

async function resolveCostLineForInvoice(
    projectId: string,
    input: RecordInvoiceInput
): Promise<{ id: string; label: string } | null> {
    if (!input.costLineId && !input.costCategory && !input.costLineReference && !input.disciplineOrTrade) {
        return null;
    }

    const rows = await db
        .select({
            id: costLines.id,
            section: costLines.section,
            costCode: costLines.costCode,
            activity: costLines.activity,
            reference: costLines.reference,
            stakeholderName: projectStakeholders.name,
            disciplineOrTrade: projectStakeholders.disciplineOrTrade,
        })
        .from(costLines)
        .leftJoin(projectStakeholders, eq(costLines.stakeholderId, projectStakeholders.id))
        .where(and(eq(costLines.projectId, projectId), isNull(costLines.deletedAt)));

    if (input.costLineId) {
        const row = rows.find((candidate) => candidate.id === input.costLineId);
        if (!row) throw new Error(`record_invoice: cost line "${input.costLineId}" was not found in this project.`);
        return { id: row.id, label: formatCostLineLabel(row) };
    }

    const scored = rankCostLineMatches(rows, {
        reference: input.costLineReference,
        discipline: input.disciplineOrTrade,
        category: input.costCategory,
    });
    const best = scored[0];
    if (!best) {
        throw new Error(
            'record_invoice: could not match that invoice to a project cost line. Call list_cost_lines and retry with the exact costLineId, or ask one concise clarifying question.'
        );
    }

    const next = scored[1];
    if (next && Math.abs(best.score - next.score) < COST_LINE_AMBIGUITY_GAP) {
        const options = scored.slice(0, 3).map((candidate) => formatCostLineLabel(candidate.row));
        throw new Error(`record_invoice: cost line match is ambiguous (${options.join('; ')}). Call list_cost_lines and retry with the exact costLineId.`);
    }

    return { id: best.row.id, label: formatCostLineLabel(best.row) };
}
