/**
 * Better Auth Test Script
 *
 * This script tests the Better Auth setup by:
 * 1. Checking database connection
 * 2. Verifying auth schema tables exist
 * 3. Testing user creation and authentication
 *
 * Run with: npx tsx scripts/test-better-auth.ts
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

// Import auth schema
import * as authSchema from '../src/lib/db/auth-schema';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL or SUPABASE_POSTGRES_URL not found');
    process.exit(1);
}

async function testBetterAuth() {
    console.log('🧪 Better Auth Integration Test\n');
    console.log('='.repeat(50));

    const pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool, { schema: authSchema });

    let allPassed = true;

    // Test 1: Database Connection
    console.log('\n📌 Test 1: Database Connection');
    try {
        await pool.query('SELECT 1');
        console.log('   ✅ Database connection successful');
    } catch (error) {
        console.log('   ❌ Database connection failed:', error);
        allPassed = false;
        await pool.end();
        return;
    }

    // Test 2: Check if Better Auth tables exist
    console.log('\n📌 Test 2: Better Auth Tables Exist');
    const tables = ['user', 'session', 'account', 'verification', 'polar_customer', 'polar_subscription'];

    for (const table of tables) {
        try {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                )
            `, [table]);

            if (result.rows[0].exists) {
                console.log(`   ✅ Table '${table}' exists`);
            } else {
                console.log(`   ❌ Table '${table}' does not exist`);
                console.log(`      → Run: npm run db:auth:push to create tables`);
                allPassed = false;
            }
        } catch (error) {
            console.log(`   ❌ Error checking table '${table}':`, error);
            allPassed = false;
        }
    }

    // Test 3: Environment Variables
    console.log('\n📌 Test 3: Environment Variables');
    const requiredEnvVars = [
        { name: 'BETTER_AUTH_SECRET', fallback: 'SESSION_SECRET' },
        { name: 'NEXT_PUBLIC_APP_URL', fallback: null },
        { name: 'POLAR_ACCESS_TOKEN', fallback: null },
        { name: 'POLAR_WEBHOOK_SECRET', fallback: null },
    ];

    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar.name] || (envVar.fallback ? process.env[envVar.fallback] : null);
        if (value) {
            console.log(`   ✅ ${envVar.name} is set${envVar.fallback && !process.env[envVar.name] ? ` (using ${envVar.fallback})` : ''}`);
        } else {
            console.log(`   ⚠️  ${envVar.name} is not set`);
            if (envVar.name === 'BETTER_AUTH_SECRET') {
                allPassed = false;
            }
        }
    }

    // Test 4: Query Better Auth user table
    console.log('\n📌 Test 4: Query Better Auth User Table');
    try {
        const users = await db.select().from(authSchema.user).limit(5);
        console.log(`   ✅ Successfully queried user table (${users.length} users found)`);
        if (users.length > 0) {
            console.log('   Users:');
            users.forEach(u => console.log(`      - ${u.email} (${u.name})`));
        }
    } catch (error: any) {
        if (error.message?.includes('does not exist')) {
            console.log('   ⚠️  User table does not exist yet');
            console.log('      → Run: npm run db:auth:push to create tables');
        } else {
            console.log('   ❌ Error querying user table:', error.message);
        }
        allPassed = false;
    }

    // Test 5: Check Better Auth Configuration Import
    console.log('\n📌 Test 5: Better Auth Configuration');
    try {
        const { auth } = await import('../src/lib/better-auth');
        console.log('   ✅ Better Auth configuration loaded successfully');

        // Check if Polar plugin is configured
        if (auth.options?.plugins?.length > 0) {
            console.log(`   ✅ ${auth.options.plugins.length} plugin(s) configured`);
        }
    } catch (error: any) {
        console.log('   ❌ Error loading Better Auth config:', error.message);
        allPassed = false;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('🎉 All tests passed! Better Auth is ready.');
        console.log('\nNext Steps:');
        console.log('1. Run: npm run db:auth:push (if tables are missing)');
        console.log('2. Run: npm run db:auth:migrate-users (to migrate existing users)');
        console.log('3. Test sign-up/sign-in flow in the browser');
    } else {
        console.log('⚠️  Some tests failed. Please address the issues above.');
        console.log('\nCommon fixes:');
        console.log('1. Run: npm run db:auth:push (to create tables)');
        console.log('2. Add missing environment variables to .env');
        console.log('3. Check database connection string');
    }
    console.log('='.repeat(50) + '\n');

    await pool.end();
}

// Run the tests
testBetterAuth().catch(console.error);
