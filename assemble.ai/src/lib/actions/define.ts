import type { ActionActorKind, ActionDefinition, ActionPolicy } from './types';
import { registerAction } from './registry';

export function actionToolName(actionId: string): string {
    return `action_${actionId.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

export function defineAction<TInput, TOutput>(
    action: Omit<ActionDefinition<TInput, TOutput>, 'toolName'> & { toolName?: string }
): ActionDefinition<TInput, TOutput> {
    const withToolName: ActionDefinition<TInput, TOutput> = {
        ...action,
        toolName: action.toolName ?? actionToolName(action.id),
    };
    return registerAction(withToolName);
}

export function policyForActor(
    action: ActionDefinition,
    actorKind: ActionActorKind
): ActionPolicy {
    return action.actorPolicies?.[actorKind] ?? action.defaultPolicy ?? 'run';
}
