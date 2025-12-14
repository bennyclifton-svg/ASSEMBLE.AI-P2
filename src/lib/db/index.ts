/**
 * Database Client
 * Uses PostgreSQL in production, SQLite in development
 */

import * as schema from './schema';
import * as pgSchema from './pg-schema';

// Determine which database to use based on environment
const usePostgres = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

// Export unified database instance
export const db = usePostgres
    ? (() => {
        // PostgreSQL for production
        const { drizzle } = require('drizzle-orm/node-postgres');
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        return drizzle(pool, { schema: pgSchema });
    })()
    : (() => {
        // SQLite for development
        const { drizzle } = require('drizzle-orm/better-sqlite3');
        const Database = require('better-sqlite3');
        const sqlite = new Database('sqlite.db');
        sqlite.pragma('foreign_keys = ON');
        return drizzle(sqlite, { schema });
    })();

// Export the database type for TypeScript
export type Database = typeof db;

// Re-export schema for convenience
export { schema, pgSchema };
