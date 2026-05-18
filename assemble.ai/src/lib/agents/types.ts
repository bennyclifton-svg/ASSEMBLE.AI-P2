import type { FeatureGroup } from '@/lib/ai/types';
import type { ModuleName } from '@/lib/context/types';
import type { DomainTag } from '@/lib/constants/knowledge-domains';

export interface AgentSpec {
    /** Stable identifier — used as the agent_name on chat_messages and agent_runs. */
    name: string;
    /** Display label for the AgentBadge UI chip. */
    displayName: string;
    /** Whitelist of tool names this agent is allowed to call. */
    allowedTools: string[];
    /** Feature group used to resolve provider+model via the registry. */
    featureGroup: FeatureGroup;
    /** Per-turn token cap. */
    maxTokens: number;
    /** Context modules injected into the prompt before each run. */
    contextModules?: ModuleName[];
    /** Knowledge-domain tags to retrieve automatically for this agent context. */
    contextDomainTags?: DomainTag[];
    /** Built once per turn — adds project-memory / context to a static base prompt. */
    buildSystemPrompt(args: { projectMemory?: string; assembledContext?: string }): string;
}
