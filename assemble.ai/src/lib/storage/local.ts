import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StorageService {
    save(file: File, buffer: Buffer): Promise<{ path: string; hash: string; size: number }>;
    delete(filePath: string): Promise<void>;
    get(filePath: string): Promise<Buffer>;
}

export class LocalStorageService implements StorageService {
    private uploadDir: string;

    constructor() {
        this.uploadDir = path.join(process.cwd(), 'uploads');
    }

    async ensureDir() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    async save(file: File, buffer: Buffer): Promise<{ path: string; hash: string; size: number }> {
        await this.ensureDir();

        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const ext = path.extname(file.name);
        const fileName = `${hash}${ext}`;
        const filePath = path.join(this.uploadDir, fileName);
        const relativePath = `/uploads/${fileName}`;

        // Check if file already exists (deduplication)
        try {
            await fs.access(filePath);
            // If exists, we still return the info but don't write again
            return { path: relativePath, hash, size: buffer.length };
        } catch {
            // Write file
            await fs.writeFile(filePath, buffer);
            return { path: relativePath, hash, size: buffer.length };
        }
    }

    async delete(filePath: string): Promise<void> {
        const fullPath = path.join(process.cwd(), filePath);
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            console.error(`Failed to delete file at ${fullPath}:`, error);
            // Don't throw if file is missing, just log
        }
    }

    async get(filePath: string): Promise<Buffer> {
        const fullPath = path.join(process.cwd(), filePath);
        return fs.readFile(fullPath);
    }
}

export const storage = new LocalStorageService();
