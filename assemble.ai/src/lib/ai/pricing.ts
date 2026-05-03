/**
 * Model Pricing Reference
 *
 * Approximate USD per 1M tokens for the cost panel in /admin/models.
 * NOT a billing source — used only to give the operator a sense of the
 * cost delta when picking a different model.
 *
 * Refresh manually when providers change pricing.
 * Anthropic: https://anthropic.com/pricing
 * OpenRouter: https://openrouter.ai/models
 *
 * Adding a row here makes it appear in the admin dropdown. For OpenRouter
 * models not in this catalog, the admin UI also allows entering any model ID
 * directly (no redeploy required).
 */

import type { Provider } from './types';

export interface ModelInfo {
    provider: Provider;
    modelId: string;
    label: string;
    inputPer1M: number;   // USD / 1M input tokens
    outputPer1M: number;  // USD / 1M output tokens
    notes?: string;
    /** Whether this model supports Anthropic's native PDF document input. */
    supportsNativePdf?: boolean;
}

/**
 * Catalog of models the picker can choose from.
 * Adding a row here makes it appear in the admin dropdown for the matching provider.
 */
export const MODEL_CATALOG: ModelInfo[] = [
    {
        provider: 'anthropic',
        modelId: 'claude-opus-4-7',
        label: 'Claude Opus 4.7',
        inputPer1M: 15,
        outputPer1M: 75,
        notes: 'Most capable. Use for hardest reasoning only.',
        supportsNativePdf: true,
    },
    {
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-6',
        label: 'Claude Sonnet 4.6',
        inputPer1M: 3,
        outputPer1M: 15,
        notes: 'Balanced quality + cost. Default for content generation.',
        supportsNativePdf: true,
    },
    {
        provider: 'anthropic',
        modelId: 'claude-haiku-4-5-20251001',
        label: 'Claude Haiku 4.5',
        inputPer1M: 1,
        outputPer1M: 5,
        notes: 'Fast and cheap. Good for extraction and matching.',
        supportsNativePdf: true,
    },
    // -- OpenAI (direct, no OpenRouter margin) --
    // Pricing approximate; confirm at https://openai.com/api/pricing/
    {
        provider: 'openai',
        modelId: 'gpt-5-nano',
        label: 'GPT-5 nano',
        inputPer1M: 0.05,
        outputPer1M: 0.40,
        notes: 'Smallest GPT-5 variant. Cheapest OpenAI option for extraction.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-5-mini',
        label: 'GPT-5 mini',
        inputPer1M: 0.25,
        outputPer1M: 2.00,
        notes: 'Mid-tier GPT-5. Strong reasoning at modest cost.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-5',
        label: 'GPT-5',
        inputPer1M: 1.25,
        outputPer1M: 10.00,
        notes: 'Flagship GPT-5. Top-tier reasoning and generation.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        label: 'GPT-4o mini',
        inputPer1M: 0.15,
        outputPer1M: 0.60,
        notes: 'Cheap and capable. Good general-purpose alternative to Haiku.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-4.1-nano',
        label: 'GPT-4.1 nano',
        inputPer1M: 0.10,
        outputPer1M: 0.40,
        notes: 'Smallest GPT-4.1 variant. Cheapest direct OpenAI option.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-4.1-mini',
        label: 'GPT-4.1 mini',
        inputPer1M: 0.40,
        outputPer1M: 1.60,
        notes: 'Mid-tier GPT-4.1. Better reasoning than nano at modest cost.',
    },
    {
        provider: 'openai',
        modelId: 'o3-mini',
        label: 'o3-mini',
        inputPer1M: 1.10,
        outputPer1M: 4.40,
        notes: 'Reasoning model. Higher latency, stronger logic.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-4.1',
        label: 'GPT-4.1',
        inputPer1M: 2.00,
        outputPer1M: 8.00,
        notes: 'Full GPT-4.1. Strong general-purpose model.',
    },
    {
        provider: 'openai',
        modelId: 'gpt-4o',
        label: 'GPT-4o',
        inputPer1M: 2.50,
        outputPer1M: 10.00,
        notes: 'Flagship multimodal model.',
    },
    // -- OpenRouter (OpenAI-compatible) --
    // Pricing approximate; confirm at https://openrouter.ai/models
    // --- GPT family ---
    {
        provider: 'openrouter',
        modelId: 'openai/gpt-4o',
        label: 'GPT-4o (via OpenRouter)',
        inputPer1M: 2.50,
        outputPer1M: 10.00,
        notes: 'Strong all-rounder. Good for content generation and complex reasoning.',
    },
    {
        provider: 'openrouter',
        modelId: 'openai/gpt-4o-mini',
        label: 'GPT-4o mini (via OpenRouter)',
        inputPer1M: 0.15,
        outputPer1M: 0.60,
        notes: 'Cheap and capable. Good general-purpose alternative to Haiku.',
    },
    // --- Gemini family ---
    {
        provider: 'openrouter',
        modelId: 'google/gemini-2.0-flash-001',
        label: 'Gemini 2.0 Flash (via OpenRouter)',
        inputPer1M: 0.10,
        outputPer1M: 0.40,
        notes: 'Very cheap and fast. Good extraction alternative.',
    },
    {
        provider: 'openrouter',
        modelId: 'google/gemini-flash-1.5',
        label: 'Gemini Flash 1.5 (via OpenRouter)',
        inputPer1M: 0.075,
        outputPer1M: 0.30,
        notes: 'Cheapest of the bunch. Good for extraction.',
    },
    {
        provider: 'openrouter',
        modelId: 'google/gemini-2.5-pro-preview-05-06',
        label: 'Gemini 2.5 Pro (via OpenRouter)',
        inputPer1M: 1.25,
        outputPer1M: 10.00,
        notes: 'Long context, strong reasoning. Higher cost.',
    },
    // --- DeepSeek ---
    {
        provider: 'openrouter',
        modelId: 'deepseek/deepseek-r1',
        label: 'DeepSeek R1 (via OpenRouter)',
        inputPer1M: 0.55,
        outputPer1M: 2.19,
        notes: 'Strong open-weights reasoning model. Very cost-effective.',
    },
    // --- Mistral ---
    {
        provider: 'openrouter',
        modelId: 'mistralai/mistral-large-2407',
        label: 'Mistral Large (via OpenRouter)',
        inputPer1M: 2.00,
        outputPer1M: 6.00,
        notes: 'Capable European model. Good multilingual support.',
    },
    // --- Qwen ---
    {
        provider: 'openrouter',
        modelId: 'qwen/qwen-2.5-72b-instruct',
        label: 'Qwen 2.5 72B (via OpenRouter)',
        inputPer1M: 0.13,
        outputPer1M: 0.40,
        notes: 'Very cheap open-weights model. Solid extraction.',
    },
    // --- Llama family ---
    {
        provider: 'openrouter',
        modelId: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B (via OpenRouter)',
        inputPer1M: 0.40,
        outputPer1M: 0.40,
        notes: 'Open-weights, cheap, decent reasoning.',
    },
    {
        provider: 'openrouter',
        modelId: 'meta-llama/llama-4-maverick',
        label: 'Llama 4 Maverick (via OpenRouter)',
        inputPer1M: 0.20,
        outputPer1M: 0.60,
        notes: "Meta's latest Llama 4. Good open-weights alternative.",
    },
    // --- Claude via OpenRouter ---
    {
        provider: 'openrouter',
        modelId: 'anthropic/claude-sonnet-4-5',
        label: 'Claude Sonnet 4.5 (via OpenRouter)',
        inputPer1M: 3.00,
        outputPer1M: 15.00,
        notes: 'Claude routed through OpenRouter. Useful if you prefer a single billing account.',
    },
];

export function findModelInfo(provider: Provider, modelId: string): ModelInfo | undefined {
    return MODEL_CATALOG.find((m) => m.provider === provider && m.modelId === modelId);
}

export function modelsForProvider(provider: Provider): ModelInfo[] {
    return MODEL_CATALOG.filter((m) => m.provider === provider);
}

/**
 * Models for a provider, sorted cheapest → most expensive by total cost
 * (input + output per 1M tokens). Lets the admin UI display a cost ladder
 * the operator can scan top-to-bottom from cheapest to most capable.
 */
export function modelsForProviderRanked(provider: Provider): ModelInfo[] {
    return modelsForProvider(provider).sort(
        (a, b) => a.inputPer1M + a.outputPer1M - (b.inputPer1M + b.outputPer1M)
    );
}
