/**
 * PostgreSQL Client for Production
 * Uses pg driver with Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './pg-schema';

// Create PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL,
    // Connection pool settings for production
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout after 10 seconds when connecting
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create Drizzle ORM instance with schema
export const pgDb = drizzle(pool, { schema });

// Export pool for direct access if needed (e.g., health checks)
export { pool };

// Health check function
export async function checkDatabaseHealth(): Promise<{
    connected: boolean;
    latencyMs: number;
    error?: string;
}> {
    const start = Date.now();
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            return {
                connected: true,
                latencyMs: Date.now() - start,
            };
        } finally {
            client.release();
        }
    } catch (error) {
        return {
            connected: false,
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : 'Unknown database error',
        };
    }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
    await pool.end();
}
