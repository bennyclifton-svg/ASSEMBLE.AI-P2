import { z } from 'zod';
import { defineAction } from '../define';
import type { ActionContext } from '../types';
import type { ProposedDiff } from '@/lib/actions/types';
import { aiMemoryService } from '@/lib/ai-memory/service';
import { AI_MEMORY_CATEGORIES, AI_MEMORY_CATEGORY_LABELS, AI_MEMORY_STATUSES, type AiMemorySource } from '@/types/ai-memory';

const createInputSchema = z.object({
    category: z.enum(AI_MEMORY_CATEGORIES).optional(),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    status: z.enum(AI_MEMORY_STATUSES).optional(),
    _toolUseId: z.string().optional(),
});

const updateInputSchema = z.object({
    id: z.string().trim().min(1),
    category: z.enum(AI_MEMORY_CATEGORIES).optional(),
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    status: z.enum(AI_MEMORY_STATUSES).optional(),
    _toolUseId: z.string().optional(),
});

const deleteInputSchema = z.object({
    id: z.string().trim().min(1),
    _toolUseId: z.string().optional(),
});

type CreateInput = z.infer<typeof createInputSchema>;
type UpdateInput = z.infer<typeof updateInputSchema>;
type DeleteInput = z.infer<typeof deleteInputSchema>;

function sourceFor(ctx: ActionContext): AiMemorySource {
    if (ctx.actorKind === 'workflow') return 'workflow';
    if (ctx.actorKind === 'agent' || ctx.actorKind === 'ai') return 'agent';
    return 'manual';
}

function createDiff(input: CreateInput): ProposedDiff {
    const category = input.category ?? 'preference';
    return {
        entity: 'ai_memory',
        entityId: null,
        summary: `Create AI memory - ${input.title}`,
        changes: [
            { field: 'category', label: 'Category', before: '-', after: AI_MEMORY_CATEGORY_LABELS[category] },
            { field: 'title', label: 'Title', before: '-', after: input.title },
            { field: 'content', label: 'Memory', before: '-', after: input.content },
            { field: 'status', label: 'Status', before: '-', after: input.status ?? 'active' },
        ],
    };
}

export const createAiMemoryAction = defineAction<CreateInput, Record<string, unknown>>({
    id: 'project.ai_memory.create',
    toolName: 'create_ai_memory',
    domain: 'project',
    description:
        'Create a reviewable AI memory entry for project preferences or recurring context. Memory is advisory and never overrides project records or documents.',
    inputSchema: createInputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    emits: [{ entity: 'ai_memory', op: 'created' }],
    uiTarget: { tab: 'memory', focusEntity: 'ai_memory' },
    preview(_ctx, input) {
        return createDiff(input);
    },
    async apply(ctx, input) {
        const entry = await aiMemoryService.create({
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            createdBy: ctx.userId,
            source: sourceFor(ctx),
            ...input,
        });
        return entry as unknown as Record<string, unknown>;
    },
});

export const updateAiMemoryAction = defineAction<UpdateInput, Record<string, unknown>>({
    id: 'project.ai_memory.update',
    toolName: 'update_ai_memory',
    domain: 'project',
    description:
        'Update one reviewable AI memory entry. Memory remains advisory and cannot override project records or documents.',
    inputSchema: updateInputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    emits: [{ entity: 'ai_memory', op: 'updated' }],
    uiTarget: { tab: 'memory', focusEntity: 'ai_memory' },
    async preview(ctx, input) {
        const current = await aiMemoryService.get({
            id: input.id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
        });
        return {
            entity: 'ai_memory',
            entityId: input.id,
            summary: `Update AI memory - ${input.title ?? current.title}`,
            changes: [
                {
                    field: 'category',
                    label: 'Category',
                    before: AI_MEMORY_CATEGORY_LABELS[current.category],
                    after: input.category ? AI_MEMORY_CATEGORY_LABELS[input.category] : AI_MEMORY_CATEGORY_LABELS[current.category],
                },
                { field: 'title', label: 'Title', before: current.title, after: input.title ?? current.title },
                { field: 'content', label: 'Memory', before: current.content, after: input.content ?? current.content },
                { field: 'status', label: 'Status', before: current.status, after: input.status ?? current.status },
            ],
        };
    },
    async apply(ctx, input) {
        const entry = await aiMemoryService.update({
            id: input.id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            updatedBy: ctx.userId,
            ...input,
        });
        return entry as unknown as Record<string, unknown>;
    },
});

export const deleteAiMemoryAction = defineAction<DeleteInput, Record<string, unknown>>({
    id: 'project.ai_memory.delete',
    toolName: 'delete_ai_memory',
    domain: 'project',
    description:
        'Deactivate one reviewable AI memory entry so it is no longer included in AI context.',
    inputSchema: deleteInputSchema,
    actorPolicies: {
        user: 'run',
        agent: 'propose',
        workflow: 'propose',
    },
    emits: [{ entity: 'ai_memory', op: 'deleted' }],
    uiTarget: { tab: 'memory', focusEntity: 'ai_memory' },
    async preview(ctx, input) {
        const current = await aiMemoryService.get({
            id: input.id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
        });
        return {
            entity: 'ai_memory',
            entityId: input.id,
            summary: `Deactivate AI memory - ${current.title}`,
            changes: [
                { field: 'status', label: 'Status', before: current.status, after: 'inactive' },
                { field: 'context', label: 'AI context inclusion', before: 'Included when relevant', after: 'Excluded' },
            ],
        };
    },
    async apply(ctx, input) {
        const entry = await aiMemoryService.delete({
            id: input.id,
            projectId: ctx.projectId,
            organizationId: ctx.organizationId,
            updatedBy: ctx.userId,
        });
        return entry as unknown as Record<string, unknown>;
    },
});
