import { assembleContext } from './orchestrator';
import type { AssembledContext, ModuleName } from './types';

export const DEFAULT_AGENT_CONTEXT_MODULES = [
    'projectInfo',
    'profile',
    'costPlan',
    'program',
    'risks',
] as const satisfies readonly ModuleName[];

export const AGENT_CONTEXT_MODULE_PRESETS = {
    finance: DEFAULT_AGENT_CONTEXT_MODULES,
    program: ['projectInfo', 'profile', 'program', 'milestones', 'risks', 'procurement'],
    design: ['projectInfo', 'profile', 'stakeholders', 'procurement', 'program', 'risks', 'planningCard'],
    orchestrator: ['projectInfo', 'profile', 'costPlan', 'program', 'risks', 'procurement', 'stakeholders'],
} as const satisfies Record<string, readonly ModuleName[]>;

export function formatAgentContext(ctx: AssembledContext): string {
    return [
        ctx.projectSummary,
        ctx.moduleContext,
        ctx.ragContext,
        ctx.crossModuleInsights,
    ]
        .filter(Boolean)
        .join('\n\n');
}

export async function assembleAgentContext(args: {
    projectId: string;
    task: string;
    modules: readonly ModuleName[];
}): Promise<string> {
    try {
        const ctx = await assembleContext({
            projectId: args.projectId,
            task: args.task,
            contextType: 'note',
            forceModules: [...args.modules],
            includeKnowledgeDomains: false,
        });
        return formatAgentContext(ctx);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[agents] context assembly failed', { projectId: args.projectId, error: message });
        return '';
    }
}
