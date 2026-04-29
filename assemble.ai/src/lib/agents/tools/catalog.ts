/**
 * Tool catalog — the registry of agent-callable tools.
 *
 * Each tool is a self-contained module exporting an AgentToolDefinition.
 * The runner dispatches tool_use blocks by name through getTool().
 */

import type { AgentTool } from '../completion';
import type { ToolContext } from './_context';

export interface AgentToolDefinition<TInput = unknown, TOutput = unknown> {
    /** Tool name as exposed to the model. Must match the name in the JSON schema. */
    spec: AgentTool;
    /**
     * Whether the tool mutates data. Read-only tools run immediately; mutating
     * tools (Phase 3+) propose a change and wait for user approval.
     */
    mutating: boolean;
    /**
     * Validate the model's tool input. Throw on invalid input — the runner
     * will surface the error back to the model as a tool_result with is_error.
     */
    validate(input: unknown): TInput;
    /**
     * Run the tool. Output is serialised to JSON and fed back to the model.
     */
    execute(ctx: ToolContext, input: TInput): Promise<TOutput>;
}

const registry = new Map<string, AgentToolDefinition>();

export function registerTool<TIn, TOut>(def: AgentToolDefinition<TIn, TOut>): void {
    // In dev with HMR the same module can re-evaluate; tolerate dup registration
    // by overwriting silently. (In production the import graph caches modules so
    // this only fires once per process anyway.)
    registry.set(def.spec.name, def as AgentToolDefinition);
}

export function getTool(name: string): AgentToolDefinition | undefined {
    return registry.get(name);
}

/**
 * Returns specs for the named tools, in the order requested.
 * Throws if any name is unknown — useful as a sanity check when an agent's
 * allowed-tool whitelist is constructed.
 */
export function specsFor(names: string[]): AgentTool[] {
    return names.map((n) => {
        const def = registry.get(n);
        if (!def) throw new Error(`Tool "${n}" is not registered`);
        return def.spec;
    });
}

export function clearRegistryForTests(): void {
    registry.clear();
}
