import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { consultants, contractors } from '@/lib/db/pg-schema';
import type { ProposedDiff } from '@/lib/agents/approvals';
import { defineAction } from '../define';
import type { ActionContext } from '../types';

const FIRM_TYPES = ['consultant', 'contractor'] as const;

const requiredTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
);
const optionalTrimmedString = z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().min(1)
).optional();

const firmSchema = z.object({
    companyName: requiredTrimmedString,
    contactPerson: optionalTrimmedString,
    email: optionalTrimmedString,
    phone: optionalTrimmedString,
    mobile: optionalTrimmedString,
    address: optionalTrimmedString,
    abn: optionalTrimmedString,
    notes: optionalTrimmedString,
    shortlisted: z.boolean().optional(),
});

const inputSchema = z
    .object({
        firmType: z.enum(FIRM_TYPES),
        disciplineOrTrade: requiredTrimmedString,
        firms: z.array(firmSchema).min(1).max(20),
        _toolUseId: z.string().optional(),
    })
    .superRefine((input, ctx) => {
        const seen = new Set<string>();
        input.firms.forEach((firm, index) => {
            const key = firm.companyName.toLowerCase().replace(/\s+/g, ' ').trim();
            if (seen.has(key)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate firm name: ${firm.companyName}`,
                    path: ['firms', index, 'companyName'],
                });
            }
            seen.add(key);
        });
    });

type AddTenderFirmsInput = z.infer<typeof inputSchema>;

type CreatedFirm = {
    id: string;
    projectId: string;
    companyName: string;
    contactPerson: string | null;
    discipline?: string;
    trade?: string;
    email: string;
    phone: string | null;
    mobile?: string | null;
    address: string | null;
    abn: string | null;
    notes: string | null;
    shortlisted: boolean | null;
    awarded: boolean | null;
    companyId: string | null;
};

interface AddTenderFirmsOutput {
    projectId: string;
    firmType: 'consultant' | 'contractor';
    disciplineOrTrade: string;
    firmIds: string[];
    firms: CreatedFirm[];
}

function panelLabel(input: Pick<AddTenderFirmsInput, 'firmType' | 'disciplineOrTrade'>): string {
    return `${input.disciplineOrTrade} ${input.firmType} tender panel`;
}

function formatFirm(firm: AddTenderFirmsInput['firms'][number]): string {
    const parts = [firm.companyName];
    if (firm.email) parts.push(firm.email);
    if (firm.phone) parts.push(firm.phone);
    if (firm.address) parts.push(firm.address);
    return parts.join(' | ');
}

function formatFirms(firms: AddTenderFirmsInput['firms']): string {
    const visible = firms.slice(0, 10).map(formatFirm);
    const suffix = firms.length > visible.length ? `, +${firms.length - visible.length} more` : '';
    return `${firms.length} firm${firms.length === 1 ? '' : 's'}: ${visible.join('; ')}${suffix}`;
}

function prepareAddTenderFirmsProposal(input: AddTenderFirmsInput): {
    proposedDiff: ProposedDiff;
    proposedInput: AddTenderFirmsInput;
} {
    const proposedInput: AddTenderFirmsInput = {
        firmType: input.firmType,
        disciplineOrTrade: input.disciplineOrTrade,
        firms: input.firms.map((firm) => ({
            companyName: firm.companyName,
            ...(firm.contactPerson !== undefined ? { contactPerson: firm.contactPerson } : {}),
            ...(firm.email !== undefined ? { email: firm.email } : {}),
            ...(firm.phone !== undefined ? { phone: firm.phone } : {}),
            ...(firm.mobile !== undefined ? { mobile: firm.mobile } : {}),
            ...(firm.address !== undefined ? { address: firm.address } : {}),
            ...(firm.abn !== undefined ? { abn: firm.abn } : {}),
            ...(firm.notes !== undefined ? { notes: firm.notes } : {}),
            ...(firm.shortlisted !== undefined ? { shortlisted: firm.shortlisted } : {}),
        })),
        ...(input._toolUseId !== undefined ? { _toolUseId: input._toolUseId } : {}),
    };

    return {
        proposedInput,
        proposedDiff: {
            entity: 'tender_firm',
            entityId: null,
            summary: `Add ${input.firms.length} tender firm${input.firms.length === 1 ? '' : 's'} - ${panelLabel(input)}`,
            changes: [
                {
                    field: 'panel',
                    label: 'Tender panel',
                    before: '-',
                    after: panelLabel(input),
                },
                {
                    field: 'firms',
                    label: 'Firms',
                    before: '-',
                    after: formatFirms(input.firms),
                },
            ],
        },
    };
}

async function applyAddTenderFirms(
    ctx: ActionContext,
    input: AddTenderFirmsInput
): Promise<AddTenderFirmsOutput> {
    const now = new Date();

    if (input.firmType === 'consultant') {
        const rows = input.firms.map((firm) => ({
            id: randomUUID(),
            projectId: ctx.projectId,
            companyName: firm.companyName,
            contactPerson: firm.contactPerson ?? null,
            discipline: input.disciplineOrTrade,
            email: firm.email ?? '',
            phone: firm.phone ?? null,
            mobile: firm.mobile ?? null,
            address: firm.address ?? null,
            abn: firm.abn ?? null,
            notes: firm.notes ?? null,
            shortlisted: firm.shortlisted ?? true,
            awarded: false,
            companyId: null,
            createdAt: now,
            updatedAt: now,
        }));
        const inserted = await db.insert(consultants).values(rows).returning();
        return {
            projectId: ctx.projectId,
            firmType: input.firmType,
            disciplineOrTrade: input.disciplineOrTrade,
            firmIds: inserted.map((firm) => firm.id),
            firms: inserted,
        };
    }

    const rows = input.firms.map((firm) => ({
        id: randomUUID(),
        projectId: ctx.projectId,
        companyName: firm.companyName,
        contactPerson: firm.contactPerson ?? null,
        trade: input.disciplineOrTrade,
        email: firm.email ?? '',
        phone: firm.phone ?? null,
        address: firm.address ?? null,
        abn: firm.abn ?? null,
        notes: firm.notes ?? null,
        shortlisted: firm.shortlisted ?? true,
        awarded: false,
        companyId: null,
        createdAt: now,
        updatedAt: now,
    }));
    const inserted = await db.insert(contractors).values(rows).returning();
    return {
        projectId: ctx.projectId,
        firmType: input.firmType,
        disciplineOrTrade: input.disciplineOrTrade,
        firmIds: inserted.map((firm) => firm.id),
        firms: inserted,
    };
}

export const addTenderFirmsAction = defineAction<AddTenderFirmsInput, AddTenderFirmsOutput>({
    id: 'procurement.tender_firms.add',
    toolName: 'add_tender_firms',
    domain: 'procurement',
    description:
        'Propose adding one or more firms to a consultant or contractor tender panel. Use firmType="consultant" for consultant tender panels and firmType="contractor" for contractor/trade/tenderer panels. Use disciplineOrTrade for the panel name, for example Mechanical. Parse firm names, addresses, phone numbers, emails, and contact people from the latest user message, including follow-up messages that provide firm details after a prior tender-panel request. The firms are not created until the user approves the inline approval card.',
    inputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    agentAccess: ['design'],
    uiTarget: { tab: 'procurement', focusEntity: 'tender_firm' },
    prepareProposal(_ctx, input) {
        const { proposedDiff, proposedInput } = prepareAddTenderFirmsProposal(input);
        return {
            proposedDiff,
            input: proposedInput,
        };
    },
    apply(ctx, input) {
        return applyAddTenderFirms(ctx, input);
    },
});
