/**
 * Agent registry — name → spec lookup.
 *
 * Phase 1 ships only Finance (read-only). Subsequent phases add the
 * Orchestrator, Design, Program, then the remaining specialists.
 */

import type { AgentSpec } from './types';
import design from './specialists/design';
import finance from './specialists/finance';
import orchestrator from './specialists/orchestrator';
import program from './specialists/program';

const agents = new Map<string, AgentSpec>([
    [orchestrator.name, orchestrator],
    [finance.name, finance],
    [design.name, design],
    [program.name, program],
]);

export function getAgent(name: string): AgentSpec {
    const spec = agents.get(name);
    if (!spec) {
        throw new Error(`Unknown agent "${name}". Available: ${Array.from(agents.keys()).join(', ')}`);
    }
    return spec;
}

export function listAgents(): AgentSpec[] {
    return Array.from(agents.values());
}

export const DEFAULT_AGENT_NAME = orchestrator.name;
