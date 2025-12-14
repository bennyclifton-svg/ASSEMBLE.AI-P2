/**
 * Drizzle Kit Configuration for PostgreSQL
 * Used for production with Supabase PostgreSQL
 */

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    schema: './src/lib/db/pg-schema.ts',
    out: './drizzle-pg',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL || '',
    },
    // Verbose output for debugging
    verbose: true,
    // Strict mode for safer migrations
    strict: true,
} satisfies Config;
