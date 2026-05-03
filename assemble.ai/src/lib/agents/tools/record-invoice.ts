/**
 * record_invoice — propose a new invoice / progress claim.
 *
 * MUTATING. Does not write directly. Builds a "before: empty / after:
 * proposed values" diff and inserts an approvals row via proposeApproval().
 * The actual INSERT happens in applicators.ts when the user clicks Approve.
 *
 * In Phase 5 this moves to the Delivery Agent (along with progress-claim
 * assessment workflows). For now, the Finance Agent records invoices so the
 * cost plan stays current — see docs/plans/2026-04-29-agent-integration.md.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { costLines, projectStakeholders } from '@/lib/db/pg-schema';
import {
    COST_LINE_AMBIGUITY_GAP,
    formatCostLineLabel,
    rankCostLineMatches,
} from '@/lib/agents/cost-line-matching';
import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { proposeApproval, type ProposedDiff } from '../approvals';

interface RecordInvoiceInput {
    invoiceNumber: string;
    /** ISO date YYYY-MM-DD. */
    invoiceDate: string;
    amountCents: number;
    description?: string;
    gstCents?: number;
    /** Optional link to an existing cost line so the invoice claims against it. */
    costLineId?: string;
    /** Human category/section label, for example "Developer Expenses" or "Authorities". */
    costCategory?: string;
    /** Human cost-line item label, for example "Long Service Levy". */
    costLineReference?: string;
    /** Optional owner/discipline label, for example "Developer" or "Mechanical". */
    disciplineOrTrade?: string;
    paidStatus?: 'paid' | 'unpaid';
    paidDate?: string;
    /** Derived from invoiceDate at validate time. */
    periodYear: number;
    periodMonth: number;
    /** Anthropic tool_use_id, supplied by the runner. */
    _toolUseId?: string;
}

interface RecordInvoiceOutput {
    status: 'awaiting_approval';
    approvalId: string;
    toolName: string;
    summary: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NATURAL_DATE = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i;
const VALID_PAID_STATUS = ['paid', 'unpaid'] as const;
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

const FIELD_LABELS: Record<string, string> = {
    invoiceNumber: 'Invoice number',
    invoiceDate: 'Invoice date',
    description: 'Description',
    amountCents: 'Amount',
    gstCents: 'GST',
    costLineId: 'Cost line',
    paidStatus: 'Paid status',
    paidDate: 'Paid date',
    period: 'Period',
};

function moneyValue(cents: number): string {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        maximumFractionDigits: 0,
    }).format(cents / 100);
}

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

const definition: AgentToolDefinition<RecordInvoiceInput, RecordInvoiceOutput> = {
    spec: {
        name: 'record_invoice',
        description:
            'Record an invoice / progress claim against the project. Required: ' +
            'invoiceNumber (e.g., "ADCO-PC-001"), invoiceDate (YYYY-MM-DD), and ' +
            'amountCents (integer cents — pass 180000000 for $1,800,000). Optional: ' +
            'description, gstCents, costLineId (link to an existing cost line — call ' +
            'list_cost_lines first to find it), or costCategory plus costLineReference ' +
            'when the user gives labels like "Developer Expenses / Long Service Levy"; ' +
            'paidStatus ("paid" or "unpaid"), ' +
            'paidDate (YYYY-MM-DD). The invoice is NOT inserted immediately; it is ' +
            'presented to the user for approval as an inline card in the chat.',
        inputSchema: {
            type: 'object',
            properties: {
                invoiceNumber: {
                    type: 'string',
                    description: 'Invoice or claim reference (e.g., "ADCO-PC-001").',
                },
                invoiceDate: {
                    type: 'string',
                    description: 'Invoice date in YYYY-MM-DD format.',
                },
                amountCents: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Invoice amount in cents (excluding GST).',
                },
                description: { type: 'string' },
                gstCents: { type: 'integer', minimum: 0 },
                costLineId: {
                    type: 'string',
                    description:
                        'Optional. Cost line id to claim against — get from list_cost_lines.',
                },
                costCategory: {
                    type: 'string',
                    description:
                        'Optional human cost category/section label, e.g. "Developer Expenses", "Authority Costs", "FEES". Used only to resolve costLineId.',
                },
                costLineReference: {
                    type: 'string',
                    description:
                        'Optional human cost-line item/activity/reference, e.g. "Long Service Levy". Used to resolve costLineId.',
                },
                disciplineOrTrade: {
                    type: 'string',
                    description:
                        'Optional owner/discipline/trade label, e.g. "Developer", "Mechanical". Used to resolve costLineId.',
                },
                paidStatus: { type: 'string', enum: [...VALID_PAID_STATUS] },
                paidDate: { type: 'string', description: 'YYYY-MM-DD if paid.' },
            },
            required: ['invoiceNumber', 'invoiceDate', 'amountCents'],
        },
    },
    mutating: true,
    validate(input: unknown): RecordInvoiceInput {
        if (!input || typeof input !== 'object') {
            throw new Error('record_invoice: input must be an object');
        }
        const obj = input as Record<string, unknown>;

        if (typeof obj.invoiceNumber !== 'string' || !obj.invoiceNumber.trim()) {
            throw new Error(
                'record_invoice: "invoiceNumber" is required and must be a non-empty string'
            );
        }
        if (typeof obj.invoiceDate !== 'string' || !obj.invoiceDate.trim()) {
            throw new Error('record_invoice: "invoiceDate" is required');
        }
        const parsed = normaliseDateInput(obj.invoiceDate.trim());
        if (!parsed) {
            throw new Error('record_invoice: "invoiceDate" must be YYYY-MM-DD or "D Month YYYY"');
        }
        if (
            typeof obj.amountCents !== 'number' ||
            !Number.isInteger(obj.amountCents) ||
            obj.amountCents < 0
        ) {
            throw new Error('record_invoice: "amountCents" must be a non-negative integer');
        }

        const out: RecordInvoiceInput = {
            invoiceNumber: obj.invoiceNumber.trim(),
            invoiceDate: parsed.iso,
            amountCents: obj.amountCents,
            periodYear: parsed.year,
            periodMonth: parsed.month,
        };

        if (obj.description !== undefined) {
            if (typeof obj.description !== 'string') {
                throw new Error('record_invoice: "description" must be a string');
            }
            out.description = obj.description.trim();
        }
        if (obj.gstCents !== undefined) {
            if (
                typeof obj.gstCents !== 'number' ||
                !Number.isInteger(obj.gstCents) ||
                obj.gstCents < 0
            ) {
                throw new Error('record_invoice: "gstCents" must be a non-negative integer');
            }
            out.gstCents = obj.gstCents;
        }
        if (obj.costLineId !== undefined) {
            if (typeof obj.costLineId !== 'string' || !obj.costLineId.trim()) {
                throw new Error('record_invoice: "costLineId" must be a non-empty string');
            }
            out.costLineId = obj.costLineId.trim();
        }
        if (obj.costCategory !== undefined) {
            if (typeof obj.costCategory !== 'string') {
                throw new Error('record_invoice: "costCategory" must be a string');
            }
            const value = obj.costCategory.trim();
            if (value) out.costCategory = value;
        }
        if (obj.costLineReference !== undefined) {
            if (typeof obj.costLineReference !== 'string') {
                throw new Error('record_invoice: "costLineReference" must be a string');
            }
            const value = obj.costLineReference.trim();
            if (value) out.costLineReference = value;
        }
        if (obj.disciplineOrTrade !== undefined) {
            if (typeof obj.disciplineOrTrade !== 'string') {
                throw new Error('record_invoice: "disciplineOrTrade" must be a string');
            }
            const value = obj.disciplineOrTrade.trim();
            if (value) out.disciplineOrTrade = value;
        }
        if (obj.paidStatus !== undefined) {
            if (
                typeof obj.paidStatus !== 'string' ||
                !(VALID_PAID_STATUS as readonly string[]).includes(obj.paidStatus)
            ) {
                throw new Error(
                    `record_invoice: "paidStatus" must be one of ${VALID_PAID_STATUS.join(', ')}`
                );
            }
            out.paidStatus = obj.paidStatus as 'paid' | 'unpaid';
        }
        if (obj.paidDate !== undefined) {
            if (typeof obj.paidDate !== 'string') {
                throw new Error('record_invoice: "paidDate" must be a string');
            }
            const paidDate = normaliseDateInput(obj.paidDate.trim());
            if (!paidDate) {
                throw new Error('record_invoice: "paidDate" must be YYYY-MM-DD or "D Month YYYY"');
            }
            out.paidDate = paidDate.iso;
        }

        if (typeof obj._toolUseId === 'string') out._toolUseId = obj._toolUseId;
        return out;
    },
    async execute(ctx: ToolContext, input: RecordInvoiceInput): Promise<RecordInvoiceOutput> {
        await assertProjectOrg(ctx);
        const resolvedCostLine = await resolveCostLineForInvoice(ctx.projectId, input);
        const proposalInput: RecordInvoiceInput = { ...input };
        if (resolvedCostLine) proposalInput.costLineId = resolvedCostLine.id;

        // Build the diff — "before" is empty (new invoice), "after" is the proposal.
        const changes: ProposedDiff['changes'] = [];

        const push = (field: string, after: unknown) => {
            changes.push({
                field,
                label: FIELD_LABELS[field] ?? field,
                before: '—',
                after,
            });
        };

        push('invoiceNumber', proposalInput.invoiceNumber);
        push('invoiceDate', proposalInput.invoiceDate);
        if (proposalInput.description) push('description', proposalInput.description);
        push('amountCents', moneyValue(proposalInput.amountCents));
        if (proposalInput.gstCents !== undefined) {
            push('gstCents', moneyValue(proposalInput.gstCents));
        }
        if (proposalInput.costLineId) {
            push('costLineId', resolvedCostLine?.label ?? proposalInput.costLineId);
        }
        if (proposalInput.paidStatus) push('paidStatus', proposalInput.paidStatus);
        if (proposalInput.paidDate) push('paidDate', proposalInput.paidDate);

        const summary = `Record invoice ${proposalInput.invoiceNumber} - ${moneyValue(proposalInput.amountCents)}`;
        const diff: ProposedDiff = {
            entity: 'invoice',
            entityId: null,
            summary,
            changes,
        };

        const proposal = await proposeApproval({
            ctx,
            toolName: 'record_invoice',
            toolUseId: proposalInput._toolUseId ?? '',
            input: proposalInput,
            proposedDiff: diff,
            expectedRowVersion: null,
        });

        return proposal.toolResult;
    },
};

registerTool(definition);

export { definition as recordInvoiceTool };

async function resolveCostLineForInvoice(
    projectId: string,
    input: RecordInvoiceInput
): Promise<{ id: string; label: string } | null> {
    if (
        !input.costLineId &&
        !input.costCategory &&
        !input.costLineReference &&
        !input.disciplineOrTrade
    ) {
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
        if (!row) {
            throw new Error(
                `record_invoice: cost line "${input.costLineId}" was not found in this project.`
            );
        }
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
            'record_invoice: could not match that invoice to a project cost line. ' +
                'Call list_cost_lines and retry with the exact costLineId, or ask one concise clarifying question.'
        );
    }

    const next = scored[1];
    if (next && Math.abs(best.score - next.score) < COST_LINE_AMBIGUITY_GAP) {
        const options = scored.slice(0, 3).map((candidate) => formatCostLineLabel(candidate.row));
        throw new Error(
            `record_invoice: cost line match is ambiguous (${options.join('; ')}). ` +
                'Call list_cost_lines and retry with the exact costLineId.'
        );
    }

    return { id: best.row.id, label: formatCostLineLabel(best.row) };
}
