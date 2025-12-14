/**
 * Supabase Client Configuration
 * Used for Supabase Storage and other Supabase services
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.warn('SUPABASE_URL is not configured - Supabase features will not work');
}

// Create a Supabase client with service role key for server-side operations
// Service role key bypasses RLS policies - use only on server
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;

// Create a Supabase client with anon key for client-side safe operations
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Storage bucket name for document uploads
export const STORAGE_BUCKET = 'documents';

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
    return !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));
}
