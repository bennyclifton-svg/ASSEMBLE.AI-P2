/**
 * Supabase Storage Service
 * Implements StorageService interface for production file storage
 */

import crypto from 'crypto';
import path from 'path';
import { supabaseAdmin, STORAGE_BUCKET, isSupabaseConfigured } from '@/lib/supabase/client';
import type { StorageService } from './local';

export class SupabaseStorageService implements StorageService {
    private bucketName: string;

    constructor() {
        this.bucketName = STORAGE_BUCKET;
    }

    /**
     * Ensure the storage bucket exists
     */
    async ensureBucket(): Promise<void> {
        if (!supabaseAdmin) {
            throw new Error('Supabase is not configured');
        }

        // Check if bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === this.bucketName);

        if (!bucketExists) {
            // Create the bucket
            const { error } = await supabaseAdmin.storage.createBucket(this.bucketName, {
                public: false, // Files are private by default
                fileSizeLimit: 52428800, // 50MB max file size
            });

            if (error && !error.message.includes('already exists')) {
                throw new Error(`Failed to create storage bucket: ${error.message}`);
            }
        }
    }

    async save(file: File, buffer: Buffer): Promise<{ path: string; hash: string; size: number }> {
        if (!supabaseAdmin) {
            throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
        }

        await this.ensureBucket();

        // Generate hash for deduplication and unique filename
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const ext = path.extname(file.name);
        const fileName = `${hash}${ext}`;

        // Organize files by date for better management
        const date = new Date();
        const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        const storagePath = `${datePath}/${fileName}`;

        // Check if file already exists (deduplication)
        const { data: existingFile } = await supabaseAdmin.storage
            .from(this.bucketName)
            .list(datePath, { search: fileName });

        if (existingFile && existingFile.length > 0) {
            // File already exists, return existing path
            return {
                path: `supabase://${this.bucketName}/${storagePath}`,
                hash,
                size: buffer.length
            };
        }

        // Upload file to Supabase Storage
        const { error } = await supabaseAdmin.storage
            .from(this.bucketName)
            .upload(storagePath, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: false, // Don't overwrite existing files
            });

        if (error) {
            // If file exists error, that's fine (deduplication)
            if (!error.message.includes('already exists') && !error.message.includes('Duplicate')) {
                throw new Error(`Failed to upload file: ${error.message}`);
            }
        }

        // Return the Supabase storage path
        return {
            path: `supabase://${this.bucketName}/${storagePath}`,
            hash,
            size: buffer.length
        };
    }

    async delete(filePath: string): Promise<void> {
        if (!supabaseAdmin) {
            throw new Error('Supabase is not configured');
        }

        // Extract the actual path from supabase:// URL
        const actualPath = filePath.replace(`supabase://${this.bucketName}/`, '');

        const { error } = await supabaseAdmin.storage
            .from(this.bucketName)
            .remove([actualPath]);

        if (error) {
            console.error(`Failed to delete file at ${actualPath}:`, error);
            // Don't throw - file might not exist
        }
    }

    async get(filePath: string): Promise<Buffer> {
        if (!supabaseAdmin) {
            throw new Error('Supabase is not configured');
        }

        // Extract the actual path from supabase:// URL
        const actualPath = filePath.replace(`supabase://${this.bucketName}/`, '');

        const { data, error } = await supabaseAdmin.storage
            .from(this.bucketName)
            .download(actualPath);

        if (error) {
            throw new Error(`Failed to download file: ${error.message}`);
        }

        // Convert Blob to Buffer
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Get a signed URL for file download (temporary access)
     */
    async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
        if (!supabaseAdmin) {
            throw new Error('Supabase is not configured');
        }

        // Extract the actual path from supabase:// URL
        const actualPath = filePath.replace(`supabase://${this.bucketName}/`, '');

        const { data, error } = await supabaseAdmin.storage
            .from(this.bucketName)
            .createSignedUrl(actualPath, expiresIn);

        if (error) {
            throw new Error(`Failed to create signed URL: ${error.message}`);
        }

        return data.signedUrl;
    }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
