/**
 * ToolContext — passed into every agent tool's execute() call.
 *
 * Carries identity (user, organization), the project the conversation is
 * scoped to, and the run/thread for audit logging.
 *
 * Multi-tenant safety: every tool's first line should call assertProjectOrg
 * to confirm the row it's about to read or touch belongs to ctx.organizationId.
 * The lint rule (TODO Phase 6) blocks tool code that skips this check.
 */

import { db } from '@/lib/db';
import { projects } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ChatViewContext } from '@/lib/chat/view-context';

export interface ToolContext {
    userId: string;
    organizationId: string;
    /** The project the chat thread is scoped to. All tool calls must touch only this project. */
    projectId: string;
    threadId: string;
    runId: string;
    viewContext?: ChatViewContext | null;
}

export class CrossTenantAccessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CrossTenantAccessError';
    }
}

/**
 * Confirms that the project the tool is about to operate on belongs to the
 * caller's organization. Throws CrossTenantAccessError on mismatch.
 *
 * Pass `targetProjectId` only if the tool is allowed to touch a project other
 * than ctx.projectId (rare — most tools should operate on ctx.projectId only).
 */
export async function assertProjectOrg(
    ctx: ToolContext,
    targetProjectId: string = ctx.projectId
): Promise<void> {
    if (targetProjectId !== ctx.projectId) {
        throw new CrossTenantAccessError(
            `Tool attempted to access project ${targetProjectId} outside the conversation's scope (${ctx.projectId})`
        );
    }

    const [row] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, targetProjectId))
        .limit(1);

    if (!row) {
        throw new CrossTenantAccessError(`Project ${targetProjectId} not found`);
    }
    if (row.organizationId !== ctx.organizationId) {
        throw new CrossTenantAccessError(
            `Project ${targetProjectId} does not belong to organization ${ctx.organizationId}`
        );
    }
}
