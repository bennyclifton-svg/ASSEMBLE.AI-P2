import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-utils';
import { getCurrentUser } from '@/lib/auth/get-user';
import { db } from '@/lib/db';
import {
    agentRuns,
    chatMessages,
    chatThreads,
    correspondence,
    projects,
    workflowRuns,
    workflowSteps,
} from '@/lib/db/pg-schema';
import { extractVariationTriageView } from '@/lib/correspondence/view';
import { materializeWorkflowRunFromPlan } from '@/lib/workflows';
import type { WorkflowPlan } from '@/lib/workflows';

export const runtime = 'nodejs';

interface RouteParams {
    params: Promise<{ projectId: string; id: string }>;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function asWorkflowPlan(value: unknown): WorkflowPlan | null {
    const plan = asRecord(value);
    if (typeof plan.workflowKey !== 'string') return null;
    if (typeof plan.userGoal !== 'string') return null;
    if (typeof plan.summary !== 'string') return null;
    if (typeof plan.executionBrief !== 'string') return null;
    if (!Array.isArray(plan.steps)) return null;
    return plan as unknown as WorkflowPlan;
}

async function latestOrNewThread(args: {
    projectId: string;
    organizationId: string;
    userId: string;
    title: string;
}): Promise<{ id: string; title: string; projectId: string }> {
    const [existing] = await db
        .select({
            id: chatThreads.id,
            title: chatThreads.title,
            projectId: chatThreads.projectId,
        })
        .from(chatThreads)
        .where(
            and(
                eq(chatThreads.projectId, args.projectId),
                eq(chatThreads.organizationId, args.organizationId),
                eq(chatThreads.userId, args.userId),
                eq(chatThreads.status, 'active')
            )
        )
        .orderBy(desc(chatThreads.updatedAt))
        .limit(1);

    if (existing) return existing;

    const [created] = await db
        .insert(chatThreads)
        .values({
            projectId: args.projectId,
            organizationId: args.organizationId,
            userId: args.userId,
            title: args.title,
        })
        .returning({
            id: chatThreads.id,
            title: chatThreads.title,
            projectId: chatThreads.projectId,
        });
    return created;
}

export async function POST(_request: Request, { params }: RouteParams) {
    return handleApiError(async () => {
        const { projectId, id } = await params;
        const authResult = await getCurrentUser();
        if (!authResult.user) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }
        const orgId = authResult.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
        }

        const [row] = await db
            .select({
                id: correspondence.id,
                subject: correspondence.subject,
                rawPayload: correspondence.rawPayload,
                projectOrganizationId: projects.organizationId,
            })
            .from(correspondence)
            .innerJoin(projects, eq(correspondence.projectId, projects.id))
            .where(and(eq(correspondence.id, id), eq(correspondence.projectId, projectId)))
            .limit(1);

        if (!row) {
            return NextResponse.json({ error: 'Correspondence not found' }, { status: 404 });
        }
        if (row.projectOrganizationId !== orgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const triage = extractVariationTriageView(row.rawPayload);
        if (triage?.classification !== 'variation_claim' || !triage.workflowRunId) {
            return NextResponse.json(
                { error: 'No variation workflow is available for this correspondence.' },
                { status: 400 }
            );
        }

        const [workflow] = await db
            .select({
                id: workflowRuns.id,
                status: workflowRuns.status,
                threadId: workflowRuns.threadId,
                plan: workflowRuns.plan,
            })
            .from(workflowRuns)
            .where(
                and(
                    eq(workflowRuns.id, triage.workflowRunId),
                    eq(workflowRuns.projectId, projectId),
                    eq(workflowRuns.organizationId, orgId)
                )
            )
            .limit(1);

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow preview not found' }, { status: 404 });
        }

        const [existingStep] = await db
            .select({ id: workflowSteps.id })
            .from(workflowSteps)
            .where(eq(workflowSteps.workflowRunId, workflow.id))
            .limit(1);

        if (existingStep && !workflow.threadId) {
            return NextResponse.json(
                { error: 'Workflow review has steps but no linked chat thread.' },
                { status: 409 }
            );
        }

        if (existingStep && workflow.threadId) {
            const [existingThread] = await db
                .select({
                    id: chatThreads.id,
                    title: chatThreads.title,
                    projectId: chatThreads.projectId,
                    userId: chatThreads.userId,
                })
                .from(chatThreads)
                .where(and(eq(chatThreads.id, workflow.threadId), eq(chatThreads.organizationId, orgId)))
                .limit(1);
            if (!existingThread) {
                return NextResponse.json({ error: 'Review thread not found' }, { status: 404 });
            }
            if (existingThread.userId !== authResult.user.id) {
                return NextResponse.json(
                    { error: 'This workflow is already under review in another user thread.' },
                    { status: 409 }
                );
            }
            return NextResponse.json({
                status: 'already_reviewing',
                workflowRunId: workflow.id,
                workflowStatus: workflow.status,
                threadId: existingThread.id,
                threadTitle: existingThread.title,
            });
        }

        const plan = asWorkflowPlan(workflow.plan);
        if (!plan) {
            return NextResponse.json({ error: 'Workflow preview is malformed' }, { status: 500 });
        }

        const threadTitle = `Variation review - ${row.subject}`.slice(0, 200);
        const thread = await latestOrNewThread({
            projectId,
            organizationId: orgId,
            userId: authResult.user.id,
            title: threadTitle,
        });
        const [triggerMessage] = await db
            .insert(chatMessages)
            .values({
                threadId: thread.id,
                role: 'user',
                content: `Review contractor variation workflow from correspondence: ${row.subject}`,
            })
            .returning({ id: chatMessages.id });
        const [agentRun] = await db
            .insert(agentRuns)
            .values({
                threadId: thread.id,
                triggerMessageId: triggerMessage.id,
                agentName: 'delivery',
                status: 'complete',
                finishedAt: new Date(),
            })
            .returning({ id: agentRuns.id });

        const result = await materializeWorkflowRunFromPlan({
            workflowRunId: workflow.id,
            plan,
            userId: authResult.user.id,
            organizationId: orgId,
            projectId,
            threadId: thread.id,
            agentRunId: agentRun.id,
            activeAgent: 'delivery',
            viewContext: {
                source: 'correspondence',
                correspondenceId: id,
            },
        });

        await db.insert(chatMessages).values({
            threadId: thread.id,
            role: 'assistant',
            agentName: 'delivery',
            runId: agentRun.id,
            content:
                'I prepared the contractor variation workflow for review. Start with the available approval card, then the dependent steps will unlock in order.',
        });
        await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, thread.id));

        return NextResponse.json({
            status: 'review_started',
            workflowRunId: result.workflowRunId,
            workflowStatus: result.status,
            threadId: thread.id,
            threadTitle: thread.title,
            stepCount: result.steps.length,
            actionableApprovalCount: result.steps.filter(
                (step) => step.state === 'awaiting_approval' && step.dependencyStepIds.length === 0
            ).length,
        });
    });
}
