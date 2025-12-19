/**
 * Drizzle Kit Configuration for PostgreSQL
 * Used for production with Supabase PostgreSQL
 */

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env.development for local, or .env.production for production
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

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
