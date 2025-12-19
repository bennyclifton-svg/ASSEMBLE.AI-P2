/**
 * Storage Service Factory
 * Automatically selects the appropriate storage backend based on environment
 *
 * - Production: Supabase Storage (persistent, scalable)
 * - Development: Local filesystem (fast, easy debugging)
 */

import fs from 'fs';
import path from 'path';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { LocalStorageService, type StorageService } from './local';
import { SupabaseStorageService, supabaseStorage } from './supabase';

// Determine which storage service to use
function createStorageService(): StorageService {
    // Use Supabase Storage if configured (production)
    if (isSupabaseConfigured() && process.env.USE_SUPABASE_STORAGE !== 'false') {
        console.log('📦 Using Supabase Storage');
        return new SupabaseStorageService();
    }

    // Fall back to local storage (development)
    console.log('📁 Using Local Storage');
    return new LocalStorageService();
}

// Export the storage instance
export const storage = createStorageService();

/**
 * Get file buffer from storage path (handles both local and Supabase)
 * Use this in download routes to support both storage backends
 */
export async function getFileFromStorage(storagePath: string): Promise<Buffer | null> {
    if (!storagePath) return null;

    // Handle Supabase storage paths (supabase://bucket/path)
    if (storagePath.startsWith('supabase://')) {
        try {
            return await supabaseStorage.get(storagePath);
        } catch (error) {
            console.error(`Failed to get file from Supabase: ${storagePath}`, error);
            return null;
        }
    }

    // Handle local storage paths (/uploads/filename)
    try {
        const fullPath = path.join(process.cwd(), storagePath);
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath);
        }
        return null;
    } catch (error) {
        console.error(`Failed to get local file: ${storagePath}`, error);
        return null;
    }
}

/**
 * Check if a file exists in storage (handles both local and Supabase)
 */
export async function fileExistsInStorage(storagePath: string): Promise<boolean> {
    if (!storagePath) return false;

    // Handle Supabase storage paths
    if (storagePath.startsWith('supabase://')) {
        try {
            await supabaseStorage.get(storagePath);
            return true;
        } catch {
            return false;
        }
    }

    // Handle local storage paths
    const fullPath = path.join(process.cwd(), storagePath);
    return fs.existsSync(fullPath);
}

// Re-export types
export type { StorageService } from './local';
