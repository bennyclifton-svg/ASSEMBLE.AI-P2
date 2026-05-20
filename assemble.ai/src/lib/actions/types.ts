import type { z } from 'zod';
import type { ProjectEntity, ProjectEntityOp } from '@/lib/agents/project-events';

export type ActionActorKind = 'user' | 'agent' | 'workflow' | 'system' | 'ai';
export type ActionPolicy = 'run' | 'confirm' | 'propose' | 'sensitive';
export type ActionInvocationStatus = 'running' | 'applied' | 'proposed' | 'rejected' | 'error';

export interface ActionApplyMeta {
    expectedRowVersion?: number | null;
}

export type ActionApplyResult<TOutput = unknown> =
    | { kind: 'applied'; output: TOutput }
    | { kind: 'conflict'; reason: string }
    | { kind: 'gone'; reason: string };

export interface ActionContext {
    userId: string;
    organizationId: string;
    projectId: string;
    actorKind: ActionActorKind;
    actorId: string;
    threadId?: string | null;
    runId?: string | null;
    workflowStepId?: string | null;
    viewContext?: unknown;
}

export interface ActionEmit<TOutput = unknown> {
    entity: ProjectEntity;
    op: ProjectEntityOp;
    idFromOutput?: keyof TOutput & string;
}

export interface ActionUiTarget {
    tab?: string;
    sub?: string;
    focusEntity?: string;
}

/**
 * Structured diff payload. Keep it self-contained so the UI can render
 * before/after without follow-up DB lookups.
 */
export interface ProposedDiff {
    /** Logical entity name (e.g., 'cost_line', 'variation'). */
    entity: string;
    /** Primary key of the entity being changed (or null for create). */
    entityId: string | null;
    /** Short human-readable summary line for the UI title. */
    summary: string;
    /** Field-level changes. Each entry: name, before, after. */
    changes: Array<{
        field: string;
        label: string;
        before: unknown;
        after: unknown;
    }>;
}

export interface ActionDefinition<TInput = unknown, TOutput = unknown> {
    id: string;
    /** Provider-safe generated tool name. Dotted action ids are not exposed directly as LLM tools. */
    toolName: string;
    domain: string;
    description: string;
    inputSchema: z.ZodType<TInput>;
    actorPolicies?: Partial<Record<ActionActorKind, ActionPolicy>>;
    defaultPolicy?: ActionPolicy;
    agentAccess?: string[];
    emits?: Array<ActionEmit<TOutput>>;
    emitEvents?: (ctx: ActionContext, output: TOutput) => void | Promise<void>;
    uiTarget?: ActionUiTarget;
    preview?: (ctx: ActionContext, input: TInput) => Promise<ProposedDiff> | ProposedDiff;
    prepareProposal?: (
        ctx: ActionContext,
        input: TInput
    ) =>
        | Promise<{ proposedDiff: ProposedDiff; expectedRowVersion?: number | null; input?: TInput }>
        | { proposedDiff: ProposedDiff; expectedRowVersion?: number | null; input?: TInput };
    apply?: (ctx: ActionContext, input: TInput, meta?: ActionApplyMeta) => Promise<TOutput>;
    applyResult?: (
        ctx: ActionContext,
        input: TInput,
        meta?: ActionApplyMeta
    ) => Promise<ActionApplyResult<TOutput>>;
    run?: (ctx: ActionContext, input: TInput) => Promise<TOutput>;
}

export interface ActionListFilter {
    domain?: string;
    agentName?: string;
    query?: string;
}
