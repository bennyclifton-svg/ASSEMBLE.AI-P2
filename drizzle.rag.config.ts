import 'dotenv/config';
import type { Config } from 'drizzle-kit';

// Load from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

// Support both SUPABASE_POSTGRES_URL (our convention) and DATABASE_URL (Supabase default)
const dbUrl = process.env.SUPABASE_POSTGRES_URL || process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Missing database URL. Add SUPABASE_POSTGRES_URL or DATABASE_URL to .env.local');
}

export default {
    schema: './src/lib/db/rag-schema.ts',
    out: './drizzle/rag',
    dialect: 'postgresql',
    dbCredentials: {
        url: dbUrl!,
    },
} satisfies Config;
