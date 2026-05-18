/**
 * /api/admin/storage
 *
 * GET   - read current upload storage settings
 * PATCH - update local upload directory and filename strategy
 *
 * Super-admin only.
 */

import { NextResponse } from 'next/server';
import { requireSuperAdminApi } from '@/lib/admin/guard';
import { recordAdminAction } from '@/lib/admin/audit';
import {
    defaultLocalBasePath,
    getStorageSettings,
    saveStorageSettings,
    type FilenameStrategy,
} from '@/lib/storage/settings';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface PatchBody {
    localBasePath?: string;
    filenameStrategy?: FilenameStrategy;
}

function isFilenameStrategy(value: unknown): value is FilenameStrategy {
    return value === 'preserve_original' || value === 'content_hash';
}

export async function GET() {
    try {
        await requireSuperAdminApi();
    } catch (response) {
        return response as Response;
    }

    const settings = await getStorageSettings();
    return NextResponse.json({
        settings,
        defaults: {
            localBasePath: defaultLocalBasePath(),
        },
        runtime: {
            supabaseConfigured: isSupabaseConfigured(),
            useSupabaseStorage: isSupabaseConfigured() && process.env.USE_SUPABASE_STORAGE !== 'false',
        },
    });
}

export async function PATCH(req: Request) {
    let actorUserId: string;
    try {
        const ctx = await requireSuperAdminApi();
        actorUserId = ctx.userId;
    } catch (response) {
        return response as Response;
    }

    const before = await getStorageSettings();
    const body = (await req.json().catch(() => ({}))) as PatchBody;

    if (!body.localBasePath || typeof body.localBasePath !== 'string') {
        return NextResponse.json({ error: 'localBasePath is required' }, { status: 400 });
    }

    if (!isFilenameStrategy(body.filenameStrategy)) {
        return NextResponse.json({ error: 'filenameStrategy must be preserve_original or content_hash' }, { status: 400 });
    }

    try {
        const settings = await saveStorageSettings({
            backend: before.backend,
            localBasePath: body.localBasePath,
            filenameStrategy: body.filenameStrategy,
            updatedBy: actorUserId,
        });

        await recordAdminAction({
            actorUserId,
            action: 'storage.update',
            targetType: 'storage_settings',
            targetId: settings.id,
            before: {
                localBasePath: before.localBasePath,
                filenameStrategy: before.filenameStrategy,
            },
            after: {
                localBasePath: settings.localBasePath,
                filenameStrategy: settings.filenameStrategy,
            },
        });

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update storage settings' },
            { status: 400 }
        );
    }
}
