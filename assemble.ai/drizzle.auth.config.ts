/**
 * Drizzle Kit Configuration for Better Auth Tables
 * Used to generate and manage Better Auth database migrations
 */

import type { Config } from 'drizzle-kit';
import { getTableName, isTable } from 'drizzle-orm';
import * as authSchema from './src/lib/db/auth-schema';
import { loadAppEnv } from './src/lib/env/load-app-env';

loadAppEnv();

const tablesFilter = Array.from(
    new Set(Object.values(authSchema).filter(isTable).map((table) => getTableName(table)))
);

export default {
    schema: './src/lib/db/auth-schema.ts',
    out: './drizzle-auth',
    dialect: 'postgresql',
    tablesFilter,
    dbCredentials: {
        url: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL || '',
    },
    verbose: true,
    strict: process.env.DRIZZLE_STRICT !== 'false',
} satisfies Config;
