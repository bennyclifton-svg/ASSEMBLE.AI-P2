import type { ActionDefinition, ActionListFilter } from './types';

const registry = new Map<string, ActionDefinition>();
const toolNameToActionId = new Map<string, string>();

export function registerAction<TInput, TOutput>(
    action: ActionDefinition<TInput, TOutput>
): ActionDefinition<TInput, TOutput> {
    registry.set(action.id, action as ActionDefinition);
    toolNameToActionId.set(action.toolName, action.id);
    return action;
}

export function getAction(id: string): ActionDefinition | undefined {
    return registry.get(id);
}

export function getActionByToolName(toolName: string): ActionDefinition | undefined {
    const id = toolNameToActionId.get(toolName);
    return id ? registry.get(id) : undefined;
}

export function listActions(filter: ActionListFilter = {}): ActionDefinition[] {
    const q = filter.query?.trim().toLowerCase();
    return Array.from(registry.values()).filter((action) => {
        if (filter.domain && action.domain !== filter.domain) return false;
        if (filter.agentName && !action.agentAccess?.includes(filter.agentName)) return false;
        if (!q) return true;
        return (
            action.id.toLowerCase().includes(q) ||
            action.description.toLowerCase().includes(q) ||
            action.domain.toLowerCase().includes(q)
        );
    });
}

export function getActionsForAgent(agentName: string): ActionDefinition[] {
    return listActions({ agentName });
}

export function clearActionRegistryForTests(): void {
    registry.clear();
    toolNameToActionId.clear();
}
