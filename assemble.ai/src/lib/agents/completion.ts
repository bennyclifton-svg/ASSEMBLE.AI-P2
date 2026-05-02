/**
 * Agent completion — one turn of an agent tool-use conversation.
 *
 * The tool-use loop lives in runner.ts. This module is the single-turn
 * primitive: send a request with tools, get back the assistant's content
 * blocks (text + tool_use) and a stop_reason.
 *
 * Two providers supported:
 *   - Anthropic (native shapes)
 *   - OpenRouter via OpenAI-compatible chat completions (shapes translated)
 *
 * Provider is resolved per feature group from /admin/models. Upstream
 * (runner.ts, specialists, tools) only ever sees Anthropic-shaped messages
 * and content blocks — translation happens here at the boundary.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
    MessageParam,
    Tool as AnthropicTool,
    ContentBlock,
} from '@anthropic-ai/sdk/resources/messages';
import type OpenAI from 'openai';
import { resolveAgentModel } from './model';
import { getOpenRouter, getOpenAI } from '@/lib/ai/client';
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

    if (provider === 'anthropic') {
        return runAgentTurnAnthropic(req, modelId);
    }
    if (provider === 'openrouter') {
        return runAgentTurnOpenAICompatible(req, modelId, getOpenRouter());
    }
    if (provider === 'openai') {
        return runAgentTurnOpenAICompatible(req, modelId, getOpenAI());
    }
    throw new Error(`Unsupported provider "${provider}" for feature group "${req.featureGroup}"`);
}

async function runAgentTurnAnthropic(
    req: AgentTurnRequest,
    modelId: string
): Promise<AgentTurnResult> {
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

async function runAgentTurnOpenAICompatible(
    req: AgentTurnRequest,
    modelId: string,
    openai: OpenAI
): Promise<AgentTurnResult> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: req.system },
        ...translateMessagesToOpenAI(req.messages),
    ];

    const tools: OpenAI.ChatCompletionTool[] = req.tools.map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema as Record<string, unknown>,
        },
    }));

    const response = await openai.chat.completions.create({
        model: modelId,
        messages,
        tools,
        max_tokens: req.maxTokens,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });

    const choice = response.choices[0];
    if (!choice) {
        throw new Error(`Provider returned no choices for model "${modelId}"`);
    }

    const blocks = translateOpenAIMessageToBlocks(choice.message);
    const stopReason = mapOpenAIFinishReason(choice.finish_reason);

    return {
        blocks,
        stopReason,
        modelId,
        usage: {
            inputTokens: response.usage?.prompt_tokens ?? 0,
            outputTokens: response.usage?.completion_tokens ?? 0,
        },
    };
}

// ----------------------------------------------------------------------------
// Anthropic ↔ OpenAI translation
//
// Anthropic shapes (what runner.ts builds and consumes):
//   - { role: 'user', content: string }                      → initial user turn
//   - { role: 'assistant', content: ContentBlock[] }         → prior assistant turn (text + tool_use)
//   - { role: 'user', content: [{ type: 'tool_result', tool_use_id, content, is_error? }] }
//                                                            → tool results from the runner loop
//
// OpenAI shapes (what OpenRouter expects):
//   - { role: 'user', content: string }
//   - { role: 'assistant', content: string|null, tool_calls?: [...] }
//   - { role: 'tool', tool_call_id, content }                → one per tool result
// ----------------------------------------------------------------------------

function translateMessagesToOpenAI(
    messages: AgentMessage[]
): OpenAI.ChatCompletionMessageParam[] {
    const out: OpenAI.ChatCompletionMessageParam[] = [];

    for (const m of messages) {
        if (m.role === 'user') {
            if (typeof m.content === 'string') {
                out.push({ role: 'user', content: m.content });
                continue;
            }
            // Content is an array — typically tool_result blocks from the runner.
            // OpenAI requires one role:'tool' message per result, not a single
            // user message containing all of them.
            for (const block of m.content) {
                if (block.type === 'tool_result') {
                    const content = typeof block.content === 'string'
                        ? block.content
                        : Array.isArray(block.content)
                            ? block.content
                                  .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
                                  .map((c) => c.text)
                                  .join('')
                            : '';
                    out.push({
                        role: 'tool',
                        tool_call_id: block.tool_use_id,
                        content,
                    });
                } else if (block.type === 'text') {
                    out.push({ role: 'user', content: block.text });
                }
            }
            continue;
        }

        if (m.role === 'assistant') {
            if (typeof m.content === 'string') {
                out.push({ role: 'assistant', content: m.content });
                continue;
            }
            // Content is ContentBlock[] — split text and tool_use into the
            // single OpenAI assistant message shape.
            let text = '';
            const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
            for (const block of m.content) {
                if (block.type === 'text') {
                    text += block.text;
                } else if (block.type === 'tool_use') {
                    toolCalls.push({
                        id: block.id,
                        type: 'function',
                        function: {
                            name: block.name,
                            arguments: JSON.stringify(block.input ?? {}),
                        },
                    });
                }
            }
            const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
                role: 'assistant',
                content: text || null,
            };
            if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;
            out.push(assistantMsg);
        }
    }

    return out;
}

function translateOpenAIMessageToBlocks(
    message: OpenAI.ChatCompletionMessage
): ContentBlock[] {
    const blocks: ContentBlock[] = [];

    if (message.content && message.content.trim().length > 0) {
        blocks.push({
            type: 'text',
            text: message.content,
            citations: null,
        } as ContentBlock);
    }

    if (message.tool_calls) {
        for (const call of message.tool_calls) {
            if (call.type !== 'function') continue;
            let input: Record<string, unknown> = {};
            try {
                input = call.function.arguments
                    ? JSON.parse(call.function.arguments)
                    : {};
            } catch {
                // Some models occasionally produce non-JSON arguments. Surface
                // the raw string so the runner's tool dispatcher can return a
                // meaningful error to the model on the next turn.
                input = { _raw: call.function.arguments };
            }
            blocks.push({
                type: 'tool_use',
                id: call.id,
                name: call.function.name,
                input,
            } as ContentBlock);
        }
    }

    return blocks;
}

function mapOpenAIFinishReason(reason: string | null): string | null {
    switch (reason) {
        case 'tool_calls':
        case 'function_call':
            return 'tool_use';
        case 'stop':
            return 'end_turn';
        case 'length':
            return 'max_tokens';
        default:
            return reason;
    }
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
