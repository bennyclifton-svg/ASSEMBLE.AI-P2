import path from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { eq } from 'drizzle-orm';
import { storageSettings } from '@/lib/db/auth-schema';

export const STORAGE_SETTINGS_ID = 'default';

export type StorageBackend = 'local' | 'supabase';
export type FilenameStrategy = 'preserve_original' | 'content_hash';

export interface RuntimeStorageSettings {
    id: string;
    backend: StorageBackend;
    localBasePath: string;
    resolvedLocalBasePath: string;
    filenameStrategy: FilenameStrategy;
    updatedAt: Date | null;
    updatedBy: string | null;
}

export function shouldPreferSupabaseStorage(input: {
    supabaseConfigured: boolean;
    useSupabaseStorage?: string;
}): boolean {
    return input.supabaseConfigured && input.useSupabaseStorage !== 'false';
}

let warnedSettingsLoadFailure = false;

export function defaultLocalBasePath(): string {
    return path.resolve(process.cwd(), 'uploads');
}

export function normalizeLocalBasePath(value: string | null | undefined): string {
    const raw = (value || 'uploads').trim();
    if (!raw) {
        throw new Error('Upload directory is required.');
    }
    if (raw.includes('\0')) {
        throw new Error('Upload directory contains an invalid character.');
    }

    const resolved = path.resolve(process.cwd(), raw);
    const root = path.parse(resolved).root;
    if (resolved === root) {
        throw new Error('Choose a folder, not the root of a drive.');
    }

    return resolved;
}

export function toStoredLocalBasePath(value: string): string {
    return normalizeLocalBasePath(value);
}

function asBackend(value: string | null | undefined): StorageBackend {
    return value === 'supabase' ? 'supabase' : 'local';
}

function asFilenameStrategy(value: string | null | undefined): FilenameStrategy {
    return value === 'content_hash' ? 'content_hash' : 'preserve_original';
}

function fromRow(row: typeof storageSettings.$inferSelect | null | undefined): RuntimeStorageSettings {
    const localBasePath = row?.localBasePath || 'uploads';

    return {
        id: row?.id || STORAGE_SETTINGS_ID,
        backend: asBackend(row?.backend),
        localBasePath,
        resolvedLocalBasePath: normalizeLocalBasePath(localBasePath),
        filenameStrategy: asFilenameStrategy(row?.filenameStrategy),
        updatedAt: row?.updatedAt ?? null,
        updatedBy: row?.updatedBy ?? null,
    };
}

export function defaultStorageSettings(): RuntimeStorageSettings {
    return fromRow(null);
}

export async function getStorageSettings(): Promise<RuntimeStorageSettings> {
    try {
        const { db } = await import('@/lib/db');
        const [row] = await db
            .select()
            .from(storageSettings)
            .where(eq(storageSettings.id, STORAGE_SETTINGS_ID))
            .limit(1);

        return fromRow(row);
    } catch (error) {
        if (!warnedSettingsLoadFailure) {
            warnedSettingsLoadFailure = true;
            console.warn('[storage-settings] Falling back to default local storage settings:', error);
        }
        return defaultStorageSettings();
    }
}

export async function assertLocalBasePathWritable(localBasePath: string): Promise<string> {
    const resolved = normalizeLocalBasePath(localBasePath);
    await mkdir(resolved, { recursive: true });

    const probePath = path.join(resolved, `.sitewise-write-test-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
    await writeFile(probePath, 'ok', { flag: 'wx' });
    await unlink(probePath);

    return resolved;
}

export async function saveStorageSettings(input: {
    backend?: StorageBackend;
    localBasePath: string;
    filenameStrategy: FilenameStrategy;
    updatedBy: string;
}): Promise<RuntimeStorageSettings> {
    const localBasePath = toStoredLocalBasePath(input.localBasePath);
    await assertLocalBasePathWritable(localBasePath);

    const values = {
        id: STORAGE_SETTINGS_ID,
        backend: input.backend ?? 'local',
        localBasePath,
        filenameStrategy: input.filenameStrategy,
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
    };

    const { db } = await import('@/lib/db');
    await db
        .insert(storageSettings)
        .values(values)
        .onConflictDoUpdate({
            target: storageSettings.id,
            set: {
                backend: values.backend,
                localBasePath: values.localBasePath,
                filenameStrategy: values.filenameStrategy,
                updatedAt: values.updatedAt,
                updatedBy: values.updatedBy,
            },
        });

    return fromRow(values);
}
