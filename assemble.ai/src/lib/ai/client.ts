/**
 * Provider-agnostic AI client.
 *
 * Routes each call to Anthropic or OpenRouter based on the feature group's
 * setting in model_settings (read via lib/ai/registry).
 *
 * Two surfaces:
 *   - aiComplete()       — non-streaming, returns final text
 *   - aiCompleteStream() — async generator yielding text deltas
 *
 * Out of scope here: native PDF document_extraction calls. Those stay on the
 * Anthropic SDK directly until Phase 6 adds Tesseract OCR fallback.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { getProviderAndModelFor } from './registry';
import type { FeatureGroup, Provider } from './types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

let anthropicClient: Anthropic | null = null;
let openrouterClient: OpenAI | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropic(): Anthropic {
    if (!anthropicClient) {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is not set');
        }
        anthropicClient = new Anthropic();
    }
    return anthropicClient;
}

export function getOpenRouter(): OpenAI {
    if (!openrouterClient) {
        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error(
                'OPENROUTER_API_KEY is not set. Switch the feature group back to Anthropic in /admin/models, or add the key to .env.'
            );
        }
        openrouterClient = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: OPENROUTER_BASE_URL,
            defaultHeaders: {
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'SiteWise',
            },
        });
    }
    return openrouterClient;
}

export function getOpenAI(): OpenAI {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                'OPENAI_API_KEY is not set. Switch the feature group back to Anthropic in /admin/models, or add the key to .env.'
            );
        }
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}

/**
 * Returns the OpenAI-compatible client for a given provider. Both OpenRouter
 * and OpenAI use the same chat-completions wire format; only the base URL and
 * key differ. Anthropic uses a different SDK and shouldn't be passed here.
 */
function getOpenAICompatibleClient(provider: Provider): OpenAI {
    if (provider === 'openrouter') return getOpenRouter();
    if (provider === 'openai') return getOpenAI();
    throw new Error(`Provider "${provider}" is not OpenAI-compatible`);
}

// ----------------------------------------------------------------------------
// Request / response shapes
// ----------------------------------------------------------------------------

export interface AiMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AiCompleteRequest {
    featureGroup: FeatureGroup;
    messages: AiMessage[];
    system?: string;
    maxTokens: number;
    temperature?: number;
}

export interface AiCompleteResult {
    text: string;
    provider: Provider;
    modelId: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

// ----------------------------------------------------------------------------
// Non-streaming
// ----------------------------------------------------------------------------

export async function aiComplete(req: AiCompleteRequest): Promise<AiCompleteResult> {
    const { provider, modelId } = await getProviderAndModelFor(req.featureGroup);

    if (provider === 'anthropic') {
        const anthropic = getAnthropic();
        const response = await anthropic.messages.create({
            model: modelId,
            max_tokens: req.maxTokens,
            ...(req.system ? { system: req.system } : {}),
            ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
            messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        });

        const textBlock = response.content.find((c) => c.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
            throw new Error('Anthropic response contained no text block');
        }

        return {
            text: textBlock.text,
            provider,
            modelId,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
        };
    }

    // openrouter or openai (both OpenAI-compatible)
    const openai = getOpenAICompatibleClient(provider);
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (req.system) messages.push({ role: 'system', content: req.system });
    for (const m of req.messages) messages.push({ role: m.role, content: m.content });

    const response = await openai.chat.completions.create({
        model: modelId,
        messages,
        max_tokens: req.maxTokens,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });

    const text = response.choices[0]?.message?.content ?? '';
    if (!text) throw new Error(`${provider} response contained no text`);

    return {
        text,
        provider,
        modelId,
        usage: response.usage
            ? { inputTokens: response.usage.prompt_tokens, outputTokens: response.usage.completion_tokens }
            : undefined,
    };
}

// ----------------------------------------------------------------------------
// Streaming
// ----------------------------------------------------------------------------

export interface AiStreamChunk {
    text: string;
}

export interface AiStreamFinal {
    text: string;
    provider: Provider;
    modelId: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

/**
 * Yields text deltas as they arrive. Returns final accumulated result when done.
 *
 * Usage:
 *   let full = '';
 *   for await (const chunk of aiCompleteStream(req)) {
 *     full += chunk.text;
 *     // emit progress…
 *   }
 *   // `full` is the complete text after the loop
 */
export async function* aiCompleteStream(
    req: AiCompleteRequest
): AsyncGenerator<AiStreamChunk, AiStreamFinal, void> {
    const { provider, modelId } = await getProviderAndModelFor(req.featureGroup);

    if (provider === 'anthropic') {
        const anthropic = getAnthropic();
        const stream = anthropic.messages.stream({
            model: modelId,
            max_tokens: req.maxTokens,
            ...(req.system ? { system: req.system } : {}),
            ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
            messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield { text: event.delta.text };
            }
        }

        const final = await stream.finalMessage();
        const textBlock = final.content.find((c) => c.type === 'text');
        return {
            text: textBlock?.type === 'text' ? textBlock.text : '',
            provider,
            modelId,
            usage: { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens },
        };
    }

    // openrouter or openai (both OpenAI-compatible)
    const openai = getOpenAICompatibleClient(provider);
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (req.system) messages.push({ role: 'system', content: req.system });
    for (const m of req.messages) messages.push({ role: m.role, content: m.content });

    const stream = await openai.chat.completions.create({
        model: modelId,
        messages,
        max_tokens: req.maxTokens,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        stream: true,
        stream_options: { include_usage: true },
    });

    let accumulated = '';
    let usage: AiStreamFinal['usage'];

    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
            accumulated += delta;
            yield { text: delta };
        }
        if (chunk.usage) {
            usage = { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens };
        }
    }

    return { text: accumulated, provider, modelId, usage };
}
