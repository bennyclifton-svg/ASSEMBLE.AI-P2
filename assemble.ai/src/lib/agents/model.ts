/**
 * Model resolution for agent feature groups.
 *
 * Phase 1 deliberately does NOT import from `@/lib/ai/registry`. The registry
 * imports a `modelSettings` Drizzle symbol from auth-schema that exists in an
 * in-progress branch but isn't checked in yet — importing it at build time
 * fails fast even if a runtime fallback would otherwise cover it.
 *
 * Instead we query model_settings via raw SQL (the table itself was created
 * by drizzle-auth/0002_admin_console.sql) and fall back to a hardcoded
 * Anthropic model if the row is missing or the table doesn't exist yet.
 *
 * Once auth-schema exports `modelSettings` properly, this can be replaced
 * with a one-line call to getProviderAndModelFor().
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { FeatureGroup, ModelChoice } from '@/lib/ai/types';

const FALLBACK: ModelChoice = {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
};

interface CacheEntry {
    value: ModelChoice;
    expiresAt: number;
}
const TTL_MS = 60 * 1000;
const cache = new Map<FeatureGroup, CacheEntry>();

export async function resolveAgentModel(group: FeatureGroup): Promise<ModelChoice> {
    const now = Date.now();
    const hit = cache.get(group);
    if (hit && hit.expiresAt > now) return hit.value;

    let value: ModelChoice = FALLBACK;
    try {
        const result = await db.execute(
            sql`SELECT provider, model_id FROM model_settings WHERE feature_group = ${group} LIMIT 1`
        );
        const rows = (result as unknown as { rows?: Array<{ provider: string; model_id: string }> }).rows
            ?? (result as unknown as Array<{ provider: string; model_id: string }>);
        const row = Array.isArray(rows) ? rows[0] : undefined;
        if (row?.provider && row?.model_id) {
            value = { provider: row.provider as ModelChoice['provider'], modelId: row.model_id };
        } else if (process.env.NODE_ENV !== 'production') {
            console.warn(
                `[agents] No model_settings row for feature_group="${group}". Using fallback ${FALLBACK.modelId}. ` +
                    `Apply drizzle-auth/0003_agent_feature_groups.sql to seed it.`
            );
        }
    } catch (err) {
        // Most likely cause: the model_settings table itself isn't there yet
        // (admin migration hasn't been applied). Stay on the fallback so the
        // chat dock keeps working.
        if (process.env.NODE_ENV !== 'production') {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[agents] model_settings lookup failed (${msg}). Using fallback ${FALLBACK.modelId}.`);
        }
    }

    cache.set(group, { value, expiresAt: now + TTL_MS });
    return value;
}
