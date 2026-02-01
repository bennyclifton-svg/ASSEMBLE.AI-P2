/**
 * Drizzle Kit Configuration for Better Auth Tables
 * Used to generate and manage Better Auth database migrations
 */

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

export default {
    schema: './src/lib/db/auth-schema.ts',
    out: './drizzle-auth',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL || '',
    },
    verbose: true,
    strict: true,
} satisfies Config;
