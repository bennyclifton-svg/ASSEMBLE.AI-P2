import type { Config } from 'drizzle-kit';
import { getTableName, isTable } from 'drizzle-orm';
import * as knowledgeSchema from './src/lib/db/knowledge-domain-sources-schema';
import * as ragSchema from './src/lib/db/rag-schema';
import { loadAppEnv } from './src/lib/env/load-app-env';

loadAppEnv();

// Support both DATABASE_URL and SUPABASE_POSTGRES_URL
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!dbUrl) {
    console.error('Missing database URL. Set DATABASE_URL or SUPABASE_POSTGRES_URL');
}

const tablesFilter = Array.from(
    new Set(
        [...Object.values(ragSchema), ...Object.values(knowledgeSchema)]
            .filter(isTable)
            .map((table) => getTableName(table))
    )
);

export default {
    schema: ['./src/lib/db/rag-schema.ts', './src/lib/db/knowledge-domain-sources-schema.ts'],
    out: './drizzle/rag',
    dialect: 'postgresql',
    tablesFilter,
    dbCredentials: {
        url: dbUrl!,
    },
} satisfies Config;
