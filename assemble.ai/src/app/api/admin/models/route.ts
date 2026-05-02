/**
 * /api/admin/models
 *
 * GET   — list current model settings for all feature groups
 * PATCH — update a single feature group's provider+model. Invalidates cache + audit logs.
 * PUT   — bulk-set the chat-dock agent feature groups in one call (master toggle).
 *
 * Super-admin only.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { modelSettings } from '@/lib/db/auth-schema';
import { eq, inArray } from 'drizzle-orm';
import { requireSuperAdminApi } from '@/lib/admin/guard';
import { recordAdminAction } from '@/lib/admin/audit';
import { invalidateCache } from '@/lib/ai/registry';
import { FEATURE_GROUPS, type FeatureGroup, type Provider } from '@/lib/ai/types';
import { findModelInfo } from '@/lib/ai/pricing';

/** Feature groups driven by the chat-dock master toggle. */
const CHAT_DOCK_GROUPS: FeatureGroup[] = [
    'agent_orchestrator',
    'agent_finance',
    'agent_program',
    'agent_design',
];

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

interface PutBody {
    provider: Provider;
    modelId: string;
}

/**
 * Bulk update — applies one (provider, modelId) to every chat-dock agent
 * feature group in a single transaction. Used by the "Chat Dock" master
 * toggle on /admin/models. Validates exactly like PATCH.
 */
export async function PUT(req: Request) {
    let actorUserId: string;
    try {
        const ctx = await requireSuperAdminApi();
        actorUserId = ctx.userId;
    } catch (response) {
        return response as Response;
    }

    const body = (await req.json()) as Partial<PutBody>;
    const { provider, modelId } = body;

    if (!provider || !modelId) {
        return NextResponse.json(
            { error: 'provider and modelId are required' },
            { status: 400 }
        );
    }

    const modelInfo = findModelInfo(provider, modelId);
    if (!modelInfo && provider === 'anthropic') {
        return NextResponse.json(
            { error: `Anthropic model "${modelId}" is not in the catalog. Add it to src/lib/ai/pricing.ts first.` },
            { status: 400 }
        );
    }

    const beforeRows = await db
        .select()
        .from(modelSettings)
        .where(inArray(modelSettings.featureGroup, CHAT_DOCK_GROUPS));
    const beforeByGroup = new Map(beforeRows.map((r) => [r.featureGroup as FeatureGroup, r]));

    const now = new Date();
    // Upsert each row — fresh DBs may not have all four agent_* rows yet.
    await db.transaction(async (tx) => {
        for (const fg of CHAT_DOCK_GROUPS) {
            await tx
                .insert(modelSettings)
                .values({ featureGroup: fg, provider, modelId, updatedAt: now, updatedBy: actorUserId })
                .onConflictDoUpdate({
                    target: modelSettings.featureGroup,
                    set: { provider, modelId, updatedAt: now, updatedBy: actorUserId },
                });
        }
    });

    for (const fg of CHAT_DOCK_GROUPS) {
        invalidateCache(fg);
    }

    for (const fg of CHAT_DOCK_GROUPS) {
        const before = beforeByGroup.get(fg);
        if (before && before.provider === provider && before.modelId === modelId) continue;
        await recordAdminAction({
            actorUserId,
            action: 'model.update',
            targetType: 'model_settings',
            targetId: fg,
            before: before ? { provider: before.provider, modelId: before.modelId } : null,
            after: { provider, modelId },
        });
    }

    return NextResponse.json({ success: true, updated: CHAT_DOCK_GROUPS });
}
