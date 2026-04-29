/**
 * Agent completion — one turn of an Anthropic tool-use conversation.
 *
 * The tool-use loop lives in runner.ts. This module is the single-turn
 * primitive: send a request with tools, get back the assistant's content
 * blocks (text + tool_use) and a stop_reason.
 *
 * Anthropic-only for Phase 1. OpenRouter tool support has a different
 * message shape and lands later if needed; in the meantime, the agent
 * feature groups should point at an Anthropic model in /admin/models.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
    MessageParam,
    Tool as AnthropicTool,
    ContentBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { resolveAgentModel } from './model';
import type { FeatureGroup } from '@/lib/ai/types';

let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
    if (!anthropicClient) {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is not set');
        }
        anthropicClient = new Anthropic();
    }
    return anthropicClient;
}

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface AgentTool {
    name: string;
    description: string;
    /** JSON Schema describing the tool's input. Validated on dispatch. */
    inputSchema: AnthropicTool.InputSchema;
}

export type AgentMessage = MessageParam;

export interface AgentTurnRequest {
    featureGroup: FeatureGroup;
    system: string;
    messages: AgentMessage[];
    tools: AgentTool[];
    maxTokens: number;
    temperature?: number;
}

export interface AgentTurnResult {
    /** Raw assistant content blocks — may contain text and tool_use entries. */
    blocks: ContentBlock[];
    stopReason: string | null;
    modelId: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}

// ----------------------------------------------------------------------------
// Single-turn execution
// ----------------------------------------------------------------------------

export async function runAgentTurn(req: AgentTurnRequest): Promise<AgentTurnResult> {
    const { provider, modelId } = await resolveAgentModel(req.featureGroup);
    if (provider !== 'anthropic') {
        throw new Error(
            `Agent feature group "${req.featureGroup}" is set to provider "${provider}". ` +
                `Only Anthropic is supported for tool-use in Phase 1. Switch the model in /admin/models.`
        );
    }

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: req.maxTokens,
        system: req.system,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        tools: req.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.inputSchema,
        })),
        messages: req.messages,
    });

    return {
        blocks: response.content,
        stopReason: response.stop_reason,
        modelId,
        usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
        },
    };
}

// ----------------------------------------------------------------------------
// Helpers for the runner
// ----------------------------------------------------------------------------

export function extractText(blocks: ContentBlock[]): string {
    return blocks
        .filter((b): b is ContentBlock & { type: 'text' } => b.type === 'text')
        .map((b) => b.text)
        .join('');
}

export interface ExtractedToolUse {
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export function extractToolUses(blocks: ContentBlock[]): ExtractedToolUse[] {
    const out: ExtractedToolUse[] = [];
    for (const b of blocks) {
        if (b.type === 'tool_use') {
            out.push({ id: b.id, name: b.name, input: b.input as Record<string, unknown> });
        }
    }
    return out;
}
