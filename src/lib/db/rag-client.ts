import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './rag-schema';

// Determine if we need SSL (production/Supabase) or not (local Docker)
const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = process.env.SUPABASE_POSTGRES_URL?.includes('supabase');

// Create PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.SUPABASE_POSTGRES_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: (isProduction || isSupabase) ? { rejectUnauthorized: false } : false,
});

// Export the drizzle client for PostgreSQL (RAG operations)
export const ragDb = drizzle(pool, { schema });

// Export pool for direct queries if needed
export { pool };

// Health check function
export async function checkRagDbHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    latencyMs: number;
    error?: string;
}> {
    const start = Date.now();
    try {
        await pool.query('SELECT 1');
        return {
            status: 'healthy',
            latencyMs: Date.now() - start,
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
