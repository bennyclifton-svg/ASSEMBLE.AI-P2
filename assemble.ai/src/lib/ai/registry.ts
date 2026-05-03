/**
 * AI Model Registry
 *
 * Reads the active model per feature group from the model_settings table.
 * In-memory cache with 60s TTL — model changes via /admin/models propagate
 * within ~1 minute without a redeploy.
 *
 * Phase 3: only model ID is consumed by call sites (provider is ignored,
 * Anthropic SDK is still used directly everywhere).
 * Phase 5: getProviderAndModelFor will be used by lib/ai/client.ts to
 * dispatch to the right SDK.
 */

import { db } from '@/lib/db';
import { modelSettings } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';
import type { FeatureGroup, ModelChoice, Provider } from './types';

const TTL_MS = 60 * 1000;
const FALLBACK: ModelChoice = {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
};

interface CacheEntry {
    value: ModelChoice;
    expiresAt: number;
}

const cache = new Map<FeatureGroup, CacheEntry>();

async function fetchFromDb(group: FeatureGroup): Promise<ModelChoice> {
    const [row] = await db
        .select({ provider: modelSettings.provider, modelId: modelSettings.modelId })
        .from(modelSettings)
        .where(eq(modelSettings.featureGroup, group));

    if (!row) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(
                `[ai-registry] No model_settings row for feature_group="${group}". ` +
                    `Using fallback ${FALLBACK.modelId}.`
            );
        }
        return FALLBACK;
    }

    return { provider: row.provider as Provider, modelId: row.modelId };
}

async function getChoice(group: FeatureGroup): Promise<ModelChoice> {
    const now = Date.now();
    const hit = cache.get(group);
    if (hit && hit.expiresAt > now) return hit.value;

    let fresh: ModelChoice;
    try {
        fresh = await fetchFromDb(group);
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[ai-registry] model_settings lookup failed (${msg}). Using fallback ${FALLBACK.modelId}.`);
        }
        fresh = FALLBACK;
    }
    cache.set(group, { value: fresh, expiresAt: now + TTL_MS });
    return fresh;
}

/**
 * Returns just the model ID for the group.
 * Call site uses it as `model: await getModelFor('generation')`.
 */
export async function getModelFor(group: FeatureGroup): Promise<string> {
    const choice = await getChoice(group);
    return choice.modelId;
}

/**
 * Phase 5 use: returns both provider and model so the client wrapper can
 * dispatch to Anthropic SDK or OpenRouter.
 */
export async function getProviderAndModelFor(group: FeatureGroup): Promise<ModelChoice> {
    return getChoice(group);
}

/**
 * Force-invalidate the cache for a group. Called after /admin/models writes
 * a new value, so the change takes effect immediately for the next request
 * on this server instance (other instances pick it up within 60s naturally).
 */
export function invalidateCache(group?: FeatureGroup): void {
    if (group) cache.delete(group);
    else cache.clear();
}
