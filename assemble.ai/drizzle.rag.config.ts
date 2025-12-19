import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env.development for local, or .env.production for production
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

// Support both DATABASE_URL and SUPABASE_POSTGRES_URL
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!dbUrl) {
    console.error('Missing database URL. Set DATABASE_URL or SUPABASE_POSTGRES_URL');
}

export default {
    schema: './src/lib/db/rag-schema.ts',
    out: './drizzle/rag',
    dialect: 'postgresql',
    dbCredentials: {
        url: dbUrl!,
    },
} satisfies Config;
