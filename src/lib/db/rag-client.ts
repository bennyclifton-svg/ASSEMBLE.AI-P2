import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './rag-schema';

// Create PostgreSQL pool with Supabase connection
const pool = new Pool({
    connectionString: process.env.SUPABASE_POSTGRES_URL,
    // Supabase connection pooler settings
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
        rejectUnauthorized: false, // Required for Supabase connection pooler
    },
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
