import { registerTool, type AgentToolDefinition } from './catalog';
import { assertProjectOrg, type ToolContext } from './_context';
import { rfiService } from '@/lib/rfi/service';
import { isRfiFilter, type RfiFilter, type RfiRecord } from '@/types/rfi';

interface ListRfisInput {
    filter?: RfiFilter;
    query?: string;
}

const definition: AgentToolDefinition<ListRfisInput> = {
    spec: {
        name: 'list_rfis',
        description:
            'List typed RFIs for this project, including each RFI question. Use this before drafting a new RFI when existing RFI context or possible duplicates may matter, and when answering/addressing an existing RFI reference such as RFI 001.',
        inputSchema: {
            type: 'object',
            properties: {
                filter: {
                    type: 'string',
                    enum: ['all', 'draft-open', 'overdue', 'responded', 'closed'],
                },
                query: {
                    type: 'string',
                    description:
                        'Optional RFI reference or text query. Matches references like RFI 001, RFI001, RFI-001, titles, and question text.',
                },
            },
        },
    },
    mutating: false,
    validate(input: unknown): ListRfisInput {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
        const record = input as Record<string, unknown>;
        const query = typeof record.query === 'string' ? record.query.trim() : '';
        return {
            ...(isRfiFilter(record.filter) ? { filter: record.filter } : {}),
            ...(query ? { query } : {}),
        };
    },
    async execute(ctx: ToolContext, input: ListRfisInput) {
        await assertProjectOrg(ctx);
        const result = await rfiService.list({
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            filter: input.filter ?? 'all',
        });
        const rfis = input.query
            ? result.rfis.filter((rfi) => matchesRfiQuery(rfi, input.query!))
            : result.rfis;
        return {
            filter: result.filter,
            query: input.query ?? null,
            total: rfis.length,
            rfis: rfis.map((rfi) => ({
                id: rfi.id,
                reference: rfi.reference,
                title: rfi.title,
                question: rfi.question,
                status: rfi.status,
                priority: rfi.priority,
                responsibleParty: rfi.responsiblePartyLabel,
                dueDate: rfi.dueDate,
                displayState: rfi.displayState,
                evidenceLinks: rfi.evidenceLinks.map((link) => ({
                    targetType: link.targetType,
                    targetId: link.targetId,
                    label: link.label,
                })),
                responseDate: rfi.responseDate,
            })),
        };
    },
};

registerTool(definition);

function normalizeSearchText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesRfiQuery(rfi: RfiRecord, query: string): boolean {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;

    const numeric = normalizedQuery.match(/^rfi0*(\d+)$/)?.[1] ?? normalizedQuery.match(/^0*(\d+)$/)?.[1];
    if (numeric && Number(numeric) === rfi.rfiNumber) return true;

    const haystack = [
        rfi.reference,
        `RFI${String(rfi.rfiNumber).padStart(3, '0')}`,
        rfi.title,
        rfi.question,
    ]
        .map(normalizeSearchText)
        .join(' ');

    return haystack.includes(normalizedQuery);
}

export { definition as listRfisTool };
