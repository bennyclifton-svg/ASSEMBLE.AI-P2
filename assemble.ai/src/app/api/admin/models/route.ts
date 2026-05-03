/**
 * /api/admin/models
 *
 * GET   — list current model settings for all feature groups
 * PATCH — update a single feature group's provider+model. Invalidates cache + audit logs.
 *
 * Super-admin only.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { modelSettings } from '@/lib/db/auth-schema';
import { eq } from 'drizzle-orm';
import { requireSuperAdminApi } from '@/lib/admin/guard';
import { recordAdminAction } from '@/lib/admin/audit';
import { invalidateCache } from '@/lib/ai/registry';
import { FEATURE_GROUPS, type FeatureGroup, type Provider } from '@/lib/ai/types';
import { findModelInfo } from '@/lib/ai/pricing';

export async function GET() {
    try {
        await requireSuperAdminApi();
    } catch (response) {
        return response as Response;
    }

    const rows = await db.select().from(modelSettings);
    return NextResponse.json({ settings: rows });
}

interface PatchBody {
    featureGroup: FeatureGroup;
    provider: Provider;
    modelId: string;
}

export async function PATCH(req: Request) {
    let actorUserId: string;
    try {
        const ctx = await requireSuperAdminApi();
        actorUserId = ctx.userId;
    } catch (response) {
        return response as Response;
    }

    const body = (await req.json()) as Partial<PatchBody>;
    const { featureGroup, provider, modelId } = body;

    if (!featureGroup || !provider || !modelId) {
        return NextResponse.json(
            { error: 'featureGroup, provider, and modelId are required' },
            { status: 400 }
        );
    }

    if (!(FEATURE_GROUPS as readonly string[]).includes(featureGroup)) {
        return NextResponse.json({ error: `Unknown feature group: ${featureGroup}` }, { status: 400 });
    }

    const modelInfo = findModelInfo(provider, modelId);
    // Anthropic and OpenAI both have small, well-known model lineups — require
    // catalog membership so typos don't get committed. OpenRouter hosts hundreds
    // of models; allow any ID so new releases can be used immediately without a
    // code change + redeploy.
    if (!modelInfo && (provider === 'anthropic' || provider === 'openai')) {
        return NextResponse.json(
            { error: `${provider} model "${modelId}" is not in the catalog. Add it to src/lib/ai/pricing.ts first.` },
            { status: 400 }
        );
    }

    const [before] = await db
        .select()
        .from(modelSettings)
        .where(eq(modelSettings.featureGroup, featureGroup));

    if (before && before.provider === provider && before.modelId === modelId) {
        return NextResponse.json({ success: true, unchanged: true });
    }

    const now = new Date();
    // Upsert — fresh DBs may not have the row yet. Insert on conflict updates.
    await db
        .insert(modelSettings)
        .values({ featureGroup, provider, modelId, updatedAt: now, updatedBy: actorUserId })
        .onConflictDoUpdate({
            target: modelSettings.featureGroup,
            set: { provider, modelId, updatedAt: now, updatedBy: actorUserId },
        });

    invalidateCache(featureGroup as FeatureGroup);

    await recordAdminAction({
        actorUserId,
        action: 'model.update',
        targetType: 'model_settings',
        targetId: featureGroup,
        before: before ? { provider: before.provider, modelId: before.modelId } : null,
        after: { provider, modelId },
    });

    return NextResponse.json({ success: true });
}
