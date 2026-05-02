import type { ActionPolicy } from '@/lib/actions/types';
import type { ProposedDiff } from '@/lib/agents/approvals';

export type WorkflowRunStatus =
    | 'draft'
    | 'previewed'
    | 'awaiting_approval'
    | 'running'
    | 'applied'
    | 'skipped'
    | 'rejected'
    | 'failed';

export type WorkflowStepState =
    | 'pending'
    | 'running'
    | 'awaiting_approval'
    | 'applied'
    | 'skipped'
    | 'rejected'
    | 'failed';

export type WorkflowFailurePolicy = 'abort_workflow' | 'continue' | 'retry_n' | 'ask_user';

export interface WorkflowPreferencesSnapshot {
    operatorMode: 'hybrid_primary_operator';
    approvalControl: 'explicit_controls_first';
    reactivity: 'reactive';
    workflowWriteSurface: 'registered_actions_only';
}

export const DEFAULT_WORKFLOW_PREFERENCES: WorkflowPreferencesSnapshot = {
    operatorMode: 'hybrid_primary_operator',
    approvalControl: 'explicit_controls_first',
    reactivity: 'reactive',
    workflowWriteSurface: 'registered_actions_only',
};

export interface WorkflowPlanStep {
    stepKey: string;
    title: string;
    actionId: string;
    input: Record<string, unknown>;
    dependencyStepKeys: string[];
    failurePolicy: WorkflowFailurePolicy;
    risk?: ActionPolicy;
}

export interface WorkflowPlan {
    workflowKey: string;
    userGoal: string;
    summary: string;
    executionBrief: string;
    evidence: string[];
    assumptions: string[];
    steps: WorkflowPlanStep[];
}

export interface CreatedWorkflowStep {
    id: string;
    stepKey: string;
    title: string;
    actionId: string;
    state: WorkflowStepState;
    approvalId: string | null;
    invocationId: string | null;
    risk: ActionPolicy;
    dependencyStepIds: string[];
    summary: string | null;
    preview: ProposedDiff | null;
}

export interface CreatedWorkflowRun {
    workflowRunId: string;
    workflowKey: string;
    status: WorkflowRunStatus;
    executionBrief: string;
    steps: CreatedWorkflowStep[];
}
