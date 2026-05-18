import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { defaultLocalBasePath, getStorageSettings, type FilenameStrategy } from './settings';

export interface StorageSaveOptions {
    directory?: string[];
}

export interface StorageService {
    save(file: File, buffer: Buffer, options?: StorageSaveOptions): Promise<{ path: string; hash: string; size: number }>;
    delete(filePath: string): Promise<void>;
    get(filePath: string): Promise<Buffer>;
}

const MAX_FILENAME_LENGTH = 180;

// Allowlist of characters safe for both Windows filenames and Supabase Storage keys.
// Supabase Storage accepts: \w, /, !, -, ., *, ', (, ), space, &, $, @, =, ;, :, +, ,, ?
// Windows filenames disallow: < > : " / \ | ? *  and control chars.
// The intersection (with "/" excluded since it's our path separator) is what we keep.
const UNSAFE_FILENAME_CHAR = /[^\w!\-.'() &$@=;+,]/g;
const UNSAFE_EXTENSION_CHAR = /[^\w.]/g;

const RESERVED_WINDOWS_NAMES = new Set([
    'con',
    'prn',
    'aux',
    'nul',
    'com1',
    'com2',
    'com3',
    'com4',
    'com5',
    'com6',
    'com7',
    'com8',
    'com9',
    'lpt1',
    'lpt2',
    'lpt3',
    'lpt4',
    'lpt5',
    'lpt6',
    'lpt7',
    'lpt8',
    'lpt9',
]);

function trimTrailingUnsafeCharacters(value: string): string {
    return value.replace(/[.\s]+$/g, '').trim();
}

export function sanitizeStorageFileName(originalName: string, fallback = 'upload'): string {
    const parsed = path.parse(originalName || fallback);
    const rawExt = parsed.ext.replace(UNSAFE_EXTENSION_CHAR, '').slice(0, 24);
    const rawBase = parsed.name || fallback;
    let base = trimTrailingUnsafeCharacters(rawBase.replace(UNSAFE_FILENAME_CHAR, '_').replace(/\s+/g, ' '));

    if (!base) {
        base = fallback;
    }
    if (RESERVED_WINDOWS_NAMES.has(base.toLowerCase())) {
        base = `${base}_`;
    }

    const ext = rawExt ? trimTrailingUnsafeCharacters(rawExt) : '';
    const maxBaseLength = Math.max(16, MAX_FILENAME_LENGTH - ext.length);
    if (base.length > maxBaseLength) {
        base = trimTrailingUnsafeCharacters(base.slice(0, maxBaseLength));
    }

    return `${base}${ext}`;
}

function sanitizeDirectorySegment(segment: string): string {
    const safe = sanitizeStorageFileName(segment, 'files');
    if (safe === '.' || safe === '..') {
        return 'files';
    }
    return safe;
}

function resolveDirectorySegments(options?: StorageSaveOptions): string[] {
    return (options?.directory ?? []).filter(Boolean).map(sanitizeDirectorySegment);
}

function isLegacyUploadsPath(filePath: string): boolean {
    return /^[/\\]+uploads(?:[/\\]|$)/i.test(filePath);
}

export function resolveLocalFilePath(filePath: string): string {
    if (!filePath) {
        throw new Error('Storage path is empty.');
    }
    if (isLegacyUploadsPath(filePath)) {
        return path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ''));
    }
    if (path.isAbsolute(filePath)) {
        return filePath;
    }
    return path.resolve(process.cwd(), filePath);
}

function pathIsInside(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function localFilePathToStoragePath(filePath: string): string {
    const fullPath = path.resolve(filePath);
    const defaultRoot = defaultLocalBasePath();

    if (pathIsInside(defaultRoot, fullPath)) {
        const relative = path.relative(defaultRoot, fullPath).split(path.sep).join('/');
        return `/uploads/${relative}`;
    }

    return fullPath;
}

function filenameForStrategy(file: File, hash: string, strategy: FilenameStrategy): string {
    if (strategy === 'content_hash') {
        const ext = path.extname(file.name).replace(UNSAFE_EXTENSION_CHAR, '');
        return `${hash}${ext}`;
    }
    return sanitizeStorageFileName(file.name);
}

function addCollisionSuffix(fileName: string, suffix: number): string {
    const parsed = path.parse(fileName);
    const base = parsed.name || 'upload';
    return `${base} (${suffix})${parsed.ext}`;
}

async function hasSameHash(filePath: string, hash: string): Promise<boolean> {
    try {
        const existing = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(existing).digest('hex') === hash;
    } catch {
        return false;
    }
}

async function writeUniqueFile(uploadDir: string, preferredName: string, buffer: Buffer, hash: string): Promise<string> {
    for (let suffix = 0; suffix < 10000; suffix += 1) {
        const fileName = suffix === 0 ? preferredName : addCollisionSuffix(preferredName, suffix + 1);
        const filePath = path.join(uploadDir, fileName);

        if (await hasSameHash(filePath, hash)) {
            return filePath;
        }

        try {
            await fs.writeFile(filePath, buffer, { flag: 'wx' });
            return filePath;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
                continue;
            }
            throw error;
        }
    }

    throw new Error(`Could not find an available filename for ${preferredName}`);
}

export class LocalStorageService implements StorageService {
    async ensureDir(uploadDir: string) {
        await fs.mkdir(uploadDir, { recursive: true });
    }

    async save(file: File, buffer: Buffer, options?: StorageSaveOptions): Promise<{ path: string; hash: string; size: number }> {
        const settings = await getStorageSettings();
        const uploadDir = path.join(settings.resolvedLocalBasePath, ...resolveDirectorySegments(options));
        await this.ensureDir(uploadDir);

        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const preferredName = filenameForStrategy(file, hash, settings.filenameStrategy);
        const filePath = await writeUniqueFile(uploadDir, preferredName, buffer, hash);

        return { path: localFilePathToStoragePath(filePath), hash, size: buffer.length };
    }

    async delete(filePath: string): Promise<void> {
        const fullPath = resolveLocalFilePath(filePath);
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            console.error(`Failed to delete file at ${fullPath}:`, error);
            // Don't throw if file is missing, just log
        }
    }

    async get(filePath: string): Promise<Buffer> {
        const fullPath = resolveLocalFilePath(filePath);
        return fs.readFile(fullPath);
    }
}

export const storage = new LocalStorageService();
