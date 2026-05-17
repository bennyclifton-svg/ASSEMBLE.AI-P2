/**
 * Drizzle Kit Configuration for PostgreSQL
 * Used for production with Supabase PostgreSQL
 */

import type { Config } from 'drizzle-kit';
import { getTableName, isTable } from 'drizzle-orm';
import * as pgSchema from './src/lib/db/pg-schema';
import { loadAppEnv } from './src/lib/env/load-app-env';

loadAppEnv();

const tablesFilter = Array.from(
    new Set(Object.values(pgSchema).filter(isTable).map((table) => getTableName(table)))
);

export default {
    schema: './src/lib/db/pg-schema.ts',
    out: './drizzle-pg',
    dialect: 'postgresql',
    tablesFilter,
    dbCredentials: {
        url: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL || '',
    },
    // Verbose output for debugging
    verbose: true,
    // Strict mode for safer migrations
    strict: process.env.DRIZZLE_STRICT !== 'false',
} satisfies Config;
