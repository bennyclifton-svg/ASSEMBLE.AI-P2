import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { approvals, workflowRuns, workflowSteps } from '@/lib/db/pg-schema';
import '@/lib/actions';
import {
    getAction,
    parseActionInput,
    policyForActor,
    proposeAction,
} from '@/lib/actions';
import type { ActionContext } from '@/lib/actions/types';
import type {
    CreatedWorkflowRun,
    CreatedWorkflowStep,
    WorkflowPlan,
    WorkflowPreferencesSnapshot,
    WorkflowStepState,
} from './types';
import { DEFAULT_WORKFLOW_PREFERENCES } from './types';

export interface CreateWorkflowFromPlanArgs {
    plan: WorkflowPlan;
    userId: string;
    organizationId: string;
    projectId: string;
    threadId: string;
    agentRunId: string;
    activeAgent?: string;
    viewContext?: unknown;
    preferences?: WorkflowPreferencesSnapshot;
}

interface InsertedStep {
    id: string;
    stepKey: string;
}

const NON_ACTIONABLE_DEPENDENCY_STATES = new Set<WorkflowStepState>([
    'failed',
    'rejected',
    'skipped',
]);

export interface ActionableWorkflowApproval {
    id: string;
    runId: string;
    toolName: string;
    proposedDiff: unknown;
    createdAt: Date | string | null;
}

function stepIdsForKeys(
    insertedSteps: InsertedStep[],
    dependencyStepKeys: string[]
): string[] {
    const byKey = new Map(insertedSteps.map((step) => [step.stepKey, step.id]));
    return dependencyStepKeys.map((key) => byKey.get(key)).filter((id): id is string => Boolean(id));
}

export async function createWorkflowFromPlan(
    args: CreateWorkflowFromPlanArgs
): Promise<CreatedWorkflowRun> {
    const preferences = args.preferences ?? DEFAULT_WORKFLOW_PREFERENCES;
    const [run] = await db
        .insert(workflowRuns)
        .values({
            workflowKey: args.plan.workflowKey,
            userGoal: args.plan.userGoal,
            status: 'previewed',
            organizationId: args.organizationId,
            projectId: args.projectId,
            threadId: args.threadId,
            actorUserId: args.userId,
            activeAgent: args.activeAgent ?? 'orchestrator',
            preferenceSnapshot: preferences,
            plan: args.plan as unknown as object,
            summary: args.plan.summary,
            updatedAt: new Date(),
        })
        .returning({ id: workflowRuns.id });

    const insertedSteps: InsertedStep[] = [];
    for (const [index, planStep] of args.plan.steps.entries()) {
        const [step] = await db
            .insert(workflowSteps)
            .values({
                workflowRunId: run.id,
                stepKey: planStep.stepKey,
                title: planStep.title,
                actionId: planStep.actionId,
                state: 'pending',
                dependencyIds: [],
                input: planStep.input,
                failurePolicy: planStep.failurePolicy,
                risk: planStep.risk ?? 'propose',
                sortOrder: index,
                updatedAt: new Date(),
            })
            .returning({ id: workflowSteps.id, stepKey: workflowSteps.stepKey });
        insertedSteps.push(step);
    }

    const createdSteps: CreatedWorkflowStep[] = [];
    const createdStepByKey = new Map<string, CreatedWorkflowStep>();
    for (const [index, planStep] of args.plan.steps.entries()) {
        const insertedStep = insertedSteps[index];
        const dependencyStepIds = stepIdsForKeys(insertedSteps, planStep.dependencyStepKeys);
        const blockedDependencyKey = planStep.dependencyStepKeys.find((key) => {
            const dependency = createdStepByKey.get(key);
            return dependency ? NON_ACTIONABLE_DEPENDENCY_STATES.has(dependency.state) : false;
        });
        if (blockedDependencyKey) {
            const message = `Skipped because dependency "${blockedDependencyKey}" did not produce an applied step.`;
            await markWorkflowStepSkipped(insertedStep.id, dependencyStepIds, message);
            const skippedStep: CreatedWorkflowStep = {
                id: insertedStep.id,
                stepKey: planStep.stepKey,
                title: planStep.title,
                actionId: planStep.actionId,
                state: 'skipped',
                approvalId: null,
                invocationId: null,
                risk: planStep.risk ?? 'propose',
                dependencyStepIds,
                summary: message,
                preview: null,
            };
            createdSteps.push(skippedStep);
            createdStepByKey.set(planStep.stepKey, skippedStep);
            continue;
        }

        const action = getAction(planStep.actionId);
        if (!action) {
            await markWorkflowStepFailed(insertedStep.id, `Action "${planStep.actionId}" is not registered.`);
            const failedStep: CreatedWorkflowStep = {
                id: insertedStep.id,
                stepKey: planStep.stepKey,
                title: planStep.title,
                actionId: planStep.actionId,
                state: 'failed',
                approvalId: null,
                invocationId: null,
                risk: planStep.risk ?? 'propose',
                dependencyStepIds,
                summary: null,
                preview: null,
            };
            createdSteps.push(failedStep);
            createdStepByKey.set(planStep.stepKey, failedStep);
            continue;
        }

        const risk = planStep.risk ?? policyForActor(action, 'workflow');
        const actionCtx: ActionContext = {
            userId: args.userId,
            organizationId: args.organizationId,
            projectId: args.projectId,
            actorKind: 'workflow',
            actorId: run.id,
            threadId: args.threadId,
            runId: args.agentRunId,
            workflowStepId: insertedStep.id,
            viewContext: args.viewContext,
        };

        try {
            const parsedInput = parseActionInput(action, planStep.input);
            const proposal = await proposeAction({
                action,
                ctx: actionCtx,
                input: parsedInput,
                toolUseId: `workflow:${run.id}:${insertedStep.id}`,
                emit: dependencyStepIds.length === 0,
            });

            await db
                .update(workflowSteps)
                .set({
                    state: 'awaiting_approval',
                    dependencyIds: dependencyStepIds,
                    approvalId: proposal.approvalId,
                    risk,
                    preview: proposal.proposedDiff as unknown as object,
                    updatedAt: new Date(),
                })
                .where(eq(workflowSteps.id, insertedStep.id));

            const awaitingStep: CreatedWorkflowStep = {
                id: insertedStep.id,
                stepKey: planStep.stepKey,
                title: planStep.title,
                actionId: planStep.actionId,
                state: 'awaiting_approval',
                approvalId: proposal.approvalId,
                invocationId: proposal.invocationId,
                risk,
                dependencyStepIds,
                summary: proposal.summary,
                preview: proposal.proposedDiff,
            };
            createdSteps.push(awaitingStep);
            createdStepByKey.set(planStep.stepKey, awaitingStep);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await markWorkflowStepFailed(insertedStep.id, message);
            const failedStep: CreatedWorkflowStep = {
                id: insertedStep.id,
                stepKey: planStep.stepKey,
                title: planStep.title,
                actionId: planStep.actionId,
                state: 'failed',
                approvalId: null,
                invocationId: null,
                risk,
                dependencyStepIds,
                summary: message,
                preview: null,
            };
            createdSteps.push(failedStep);
            createdStepByKey.set(planStep.stepKey, failedStep);
        }
    }

    const activeStepIds = createdSteps
        .filter((step) => step.state === 'awaiting_approval' && step.dependencyStepIds.length === 0)
        .map((step) => step.id);
    const status = createdSteps.some((step) => step.state === 'awaiting_approval')
        ? 'awaiting_approval'
        : createdSteps.some((step) => step.state === 'failed')
          ? 'failed'
          : 'previewed';

    await db
        .update(workflowRuns)
        .set({
            status,
            currentStepIds: activeStepIds,
            updatedAt: new Date(),
        })
        .where(eq(workflowRuns.id, run.id));

    return {
        workflowRunId: run.id,
        workflowKey: args.plan.workflowKey,
        status,
        executionBrief: args.plan.executionBrief,
        steps: createdSteps,
    };
}

async function markWorkflowStepFailed(id: string, message: string): Promise<void> {
    await db
        .update(workflowSteps)
        .set({
            state: 'failed',
            error: { message },
            updatedAt: new Date(),
        })
        .where(eq(workflowSteps.id, id));
}

async function markWorkflowStepSkipped(
    id: string,
    dependencyIds: string[],
    message: string
): Promise<void> {
    await db
        .update(workflowSteps)
        .set({
            state: 'skipped',
            dependencyIds,
            error: { message },
            updatedAt: new Date(),
        })
        .where(eq(workflowSteps.id, id));
}

export async function workflowDependenciesAreApplied(approvalId: string): Promise<{
    ok: true;
} | {
    ok: false;
    reason: string;
}> {
    const [step] = await db
        .select({
            id: workflowSteps.id,
            dependencyIds: workflowSteps.dependencyIds,
        })
        .from(workflowSteps)
        .where(eq(workflowSteps.approvalId, approvalId))
        .limit(1);

    if (!step) return { ok: true };
    const dependencyIds = step.dependencyIds ?? [];
    if (dependencyIds.length === 0) return { ok: true };

    const rows = await db
        .select({ id: workflowSteps.id, state: workflowSteps.state })
        .from(workflowSteps)
        .where(inArray(workflowSteps.id, dependencyIds));
    const unapplied = rows.filter((row) => row.state !== 'applied');
    if (unapplied.length === 0) return { ok: true };

    return {
        ok: false,
        reason: 'This workflow step depends on an earlier step that has not been applied yet.',
    };
}

export async function filterActionablePendingApprovals<T extends { id: string }>(
    pendingApprovals: T[]
): Promise<T[]> {
    if (pendingApprovals.length === 0) return pendingApprovals;
    const actionableIds = await actionablePendingApprovalIds(
        pendingApprovals.map((approval) => approval.id)
    );
    return pendingApprovals.filter((approval) => actionableIds.has(approval.id));
}

export async function syncWorkflowStepForApproval(args: {
    approvalId: string;
    state: Exclude<WorkflowStepState, 'pending' | 'running' | 'awaiting_approval'>;
    output?: unknown;
    error?: unknown;
}): Promise<ActionableWorkflowApproval[]> {
    const [step] = await db
        .update(workflowSteps)
        .set({
            state: args.state,
            output: args.output as object | undefined,
            error: args.error as object | undefined,
            updatedAt: new Date(),
        })
        .where(eq(workflowSteps.approvalId, args.approvalId))
        .returning({
            id: workflowSteps.id,
            workflowRunId: workflowSteps.workflowRunId,
        });
    if (!step) return [];
    await refreshWorkflowRunState(step.workflowRunId);
    return getActionablePendingApprovalsForWorkflowRun(step.workflowRunId);
}

async function refreshWorkflowRunState(workflowRunId: string): Promise<void> {
    const rows = await db
        .select({
            id: workflowSteps.id,
            state: workflowSteps.state,
            dependencyIds: workflowSteps.dependencyIds,
        })
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowRunId, workflowRunId));
    if (rows.length === 0) return;

    const hasFailed = rows.some((row) => row.state === 'failed');
    const hasRejected = rows.some((row) => row.state === 'rejected');
    const allAppliedOrSkipped = rows.every((row) => row.state === 'applied' || row.state === 'skipped');
    const applied = new Set(rows.filter((row) => row.state === 'applied').map((row) => row.id));
    const currentStepIds = rows
        .filter(
            (row) =>
                row.state === 'awaiting_approval' &&
                (row.dependencyIds ?? []).every((dependencyId) => applied.has(dependencyId))
        )
        .map((row) => row.id);
    const status: CreatedWorkflowRun['status'] = allAppliedOrSkipped
        ? 'applied'
        : hasRejected
          ? 'rejected'
          : hasFailed
            ? 'failed'
            : 'awaiting_approval';

    await db
        .update(workflowRuns)
        .set({
            status,
            currentStepIds,
            updatedAt: new Date(),
            finishedAt: allAppliedOrSkipped || hasRejected || hasFailed ? new Date() : undefined,
        })
        .where(eq(workflowRuns.id, workflowRunId));
}

async function actionablePendingApprovalIds(approvalIds: string[]): Promise<Set<string>> {
    const ids = approvalIds.filter(Boolean);
    if (ids.length === 0) return new Set();

    const steps = await db
        .select({
            approvalId: workflowSteps.approvalId,
            state: workflowSteps.state,
            dependencyIds: workflowSteps.dependencyIds,
        })
        .from(workflowSteps)
        .where(inArray(workflowSteps.approvalId, ids));
    const workflowApprovalIds = new Set(
        steps
            .map((step) => step.approvalId)
            .filter((approvalId): approvalId is string => typeof approvalId === 'string')
    );
    const dependencyIds = Array.from(
        new Set(steps.flatMap((step) => step.dependencyIds ?? []))
    );
    const dependencyStates =
        dependencyIds.length > 0
            ? await db
                  .select({ id: workflowSteps.id, state: workflowSteps.state })
                  .from(workflowSteps)
                  .where(inArray(workflowSteps.id, dependencyIds))
            : [];
    const dependencyStateById = new Map(
        dependencyStates.map((step) => [step.id, step.state])
    );

    return new Set(
        ids.filter((approvalId) => {
            if (!workflowApprovalIds.has(approvalId)) return true;
            const step = steps.find((candidate) => candidate.approvalId === approvalId);
            if (!step || step.state !== 'awaiting_approval') return false;
            return (step.dependencyIds ?? []).every(
                (dependencyId) => dependencyStateById.get(dependencyId) === 'applied'
            );
        })
    );
}

async function getActionablePendingApprovalsForWorkflowRun(
    workflowRunId: string
): Promise<ActionableWorkflowApproval[]> {
    const steps = await db
        .select({
            approvalId: workflowSteps.approvalId,
            state: workflowSteps.state,
            dependencyIds: workflowSteps.dependencyIds,
        })
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowRunId, workflowRunId));
    const candidateIds = steps
        .filter((step) => step.state === 'awaiting_approval' && typeof step.approvalId === 'string')
        .map((step) => step.approvalId as string);
    if (candidateIds.length === 0) return [];

    const actionableIds = await actionablePendingApprovalIds(candidateIds);
    if (actionableIds.size === 0) return [];

    return db
        .select({
            id: approvals.id,
            runId: approvals.runId,
            toolName: approvals.toolName,
            proposedDiff: approvals.proposedDiff,
            createdAt: approvals.createdAt,
        })
        .from(approvals)
        .where(andInPendingApprovals(Array.from(actionableIds)));
}

function andInPendingApprovals(ids: string[]) {
    const idFilter = ids.length === 1 ? eq(approvals.id, ids[0]) : inArray(approvals.id, ids);
    return and(idFilter, eq(approvals.status, 'pending'));
}
