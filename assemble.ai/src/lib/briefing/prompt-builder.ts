import type { AgentMessage, AgentTool } from '@/lib/agents/completion';
import type { BriefingContextSnapshot } from './types';

const GAP_CHECKLIST = [
    'Planning: approval pathway, consent authority, envelope assumptions, site constraints, staging and statutory risks.',
    'Functional: core use, users, services scope, operations, access, logistics, adjacencies and future flexibility.',
    'Quality: performance targets, sustainability, durability, materials, acoustic/thermal expectations and maintainability.',
    'Compliance: NCC/classification, fire/life safety, accessibility, WHS, environmental obligations and certification evidence.',
].join('\n');

export function buildBriefingSystemPrompt(context: BriefingContextSnapshot): string {
    const attachmentList =
        context.attachments.length > 0
            ? context.attachments
                .map((doc) => {
                    const status = doc.ragStatus ?? doc.ocrStatus ?? 'unknown';
                    return `- ${doc.title} (${doc.type ?? 'document'}, ingest: ${status})`;
                })
                .join('\n')
            : '- No briefing documents attached.';

    return [
        'You are the Briefing agent for a construction project brief.',
        'Run a concise, targeted interview that fills gaps in the saved profile and project objectives.',
        '',
        'Rules:',
        '- Treat existing profile fields and existing objective rows as facts.',
        '- Do not overwrite existing user-authored content. If something conflicts, flag it conversationally.',
        '- Ask one question at a time.',
        '- Be punchy. Do not include a preamble, transition, or rationale paragraph.',
        '- Never write "Rationale:" or "Let\'s move on".',
        '- Every assistant question must use this exact format:',
        '  Question: <one direct question, under 20 words>',
        '  Options:',
        '  A. <short answer option>',
        '  B. <short answer option>',
        '  C. <short answer option, if useful>',
        '  D. <short answer option, if useful>',
        '  Recommended answer: <one concise answer, ideally one of the options>',
        '- Provide 2-4 options. Keep each option under 12 words.',
        '- If document evidence matters, add one final line: Source: <document title, page/section if available>.',
        '- Use the tool calls for every write. Never claim a profile/objective value was saved unless a tool call succeeded.',
        '- Write new objective answers as draft projectObjectives rows with source briefing.',
        '- Mark categories covered when they are adequately resolved.',
        '- Search attached documents only through searchBriefingDocuments. Do not ask the user to paste whole documents.',
        '- If an attached document supports a recommendation, cite the document title and section/page if available.',
        '',
        'Gap checklist from retired inference rules:',
        GAP_CHECKLIST,
        '',
        'Saved profile JSON:',
        JSON.stringify(context.profile ?? null, null, 2),
        '',
        'Project details JSON:',
        JSON.stringify(context.projectDetails ?? null, null, 2),
        '',
        'Existing objectives JSON:',
        JSON.stringify(context.objectives, null, 2),
        '',
        'Attached briefing document metadata:',
        attachmentList,
        '',
        'Current coverage:',
        JSON.stringify(context.session.coverage ?? {}, null, 2),
    ].join('\n');
}

export function buildBriefingTools(): AgentTool[] {
    return [
        {
            name: 'updateProfileField',
            description:
                'Update one permitted profile or project-details field from a user answer. Use dot paths for nested profile JSON, for example scaleData.storeys or complexity.approval_pathway.',
            inputSchema: {
                type: 'object',
                properties: {
                    field: { type: 'string' },
                    value: {
                        description: 'New field value. May be a string, number, boolean, array, object, or null.',
                    },
                    rationale: { type: 'string' },
                },
                required: ['field', 'value', 'rationale'],
            },
        },
        {
            name: 'upsertObjective',
            description:
                'Add a draft objective row in one of the four brief categories. Use this for answers that should land in projectObjectives.',
            inputSchema: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        enum: ['planning', 'functional', 'quality', 'compliance'],
                    },
                    text: { type: 'string' },
                    rationale: { type: 'string' },
                },
                required: ['category', 'text', 'rationale'],
            },
        },
        {
            name: 'markCategoryCovered',
            description:
                'Mark an objective category as covered once the interview has enough information for that category.',
            inputSchema: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        enum: ['planning', 'functional', 'quality', 'compliance'],
                    },
                },
                required: ['category'],
            },
        },
        {
            name: 'searchBriefingDocuments',
            description:
                'Read-only semantic search across documents attached to this brief. Returns citation-ready excerpts.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    maxResults: { type: 'integer', minimum: 1, maximum: 10 },
                },
                required: ['query'],
            },
        },
    ];
}

export function buildBriefingHistory(
    context: BriefingContextSnapshot,
    latestUserMessage?: string
): AgentMessage[] {
    const messages: AgentMessage[] = [];
    for (const message of context.messages) {
        if (message.role === 'system') continue;
        if (message.role === 'assistant') {
            messages.push({ role: 'assistant', content: message.content });
            continue;
        }
        if (message.role === 'tool') {
            messages.push({ role: 'user', content: `Tool result: ${message.content}` });
            continue;
        }
        messages.push({ role: 'user', content: message.content });
    }

    if (latestUserMessage && messages[messages.length - 1]?.content !== latestUserMessage) {
        messages.push({ role: 'user', content: latestUserMessage });
    }

    if (messages.length === 0) {
        const attachmentNames = context.attachments.map((doc) => doc.title).join(', ');
        messages.push({
            role: 'user',
            content:
                'Start the Briefing session. Acknowledge the saved profile and ' +
                (attachmentNames
                    ? `the attached briefing documents: ${attachmentNames}.`
                    : 'that no briefing documents are attached yet.') +
                ' Ask the first targeted question with options and a recommended answer.',
        });
    }

    return messages;
}
