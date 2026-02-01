/**
 * User Migration Script: Existing Users → Better Auth
 *
 * This script migrates existing users from the custom auth system to Better Auth.
 * It performs the following:
 * 1. Reads users from the old 'users' table
 * 2. Creates corresponding entries in the Better Auth 'user' table
 * 3. Creates 'account' entries with existing password hashes
 * 4. Optionally migrates Polar customer data to polar_customer table
 *
 * Run with: npx tsx scripts/migrate-users-to-better-auth.ts
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

// Import schemas
import * as pgSchema from '../src/lib/db/pg-schema';
import * as authSchema from '../src/lib/db/auth-schema';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL or SUPABASE_POSTGRES_URL not found');
    process.exit(1);
}

async function migrateUsers() {
    console.log('🚀 Starting Better Auth User Migration...\n');

    const pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool, { schema: { ...pgSchema, ...authSchema } });

    try {
        // Step 1: Get all existing users
        console.log('📖 Reading existing users from the users table...');
        const existingUsers = await db.select().from(pgSchema.users);
        console.log(`   Found ${existingUsers.length} users to migrate\n`);

        if (existingUsers.length === 0) {
            console.log('✅ No users to migrate. Exiting.');
            await pool.end();
            return;
        }

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const oldUser of existingUsers) {
            try {
                // Check if user already exists in Better Auth
                const existingBetterAuthUser = await db
                    .select()
                    .from(authSchema.user)
                    .where(eq(authSchema.user.email, oldUser.email))
                    .limit(1);

                if (existingBetterAuthUser.length > 0) {
                    console.log(`⏭️  Skipping ${oldUser.email} - already exists in Better Auth`);
                    skippedCount++;
                    continue;
                }

                // Step 2: Create user in Better Auth user table
                const newUserId = oldUser.id; // Keep the same ID for FK consistency
                const now = new Date();

                await db.insert(authSchema.user).values({
                    id: newUserId,
                    name: oldUser.displayName,
                    email: oldUser.email,
                    emailVerified: false, // Will need to verify through Better Auth
                    image: null,
                    createdAt: now,
                    updatedAt: now,
                    organizationId: oldUser.organizationId,
                    displayName: oldUser.displayName,
                });

                // Step 3: Create account entry with password
                const accountId = randomUUID();
                await db.insert(authSchema.account).values({
                    id: accountId,
                    userId: newUserId,
                    accountId: oldUser.email, // Use email as account ID for credential provider
                    providerId: 'credential', // Better Auth's credential provider ID
                    password: oldUser.passwordHash, // bcrypt hash is compatible
                    createdAt: now,
                    updatedAt: now,
                });

                // Step 4: Migrate Polar customer data if exists
                if (oldUser.polarCustomerId) {
                    const polarCustomerExists = await db
                        .select()
                        .from(authSchema.polarCustomer)
                        .where(eq(authSchema.polarCustomer.userId, newUserId))
                        .limit(1);

                    if (polarCustomerExists.length === 0) {
                        const polarCustomerId = randomUUID();
                        await db.insert(authSchema.polarCustomer).values({
                            id: polarCustomerId,
                            userId: newUserId,
                            polarCustomerId: oldUser.polarCustomerId,
                            email: oldUser.email,
                            createdAt: now,
                            updatedAt: now,
                        });
                        console.log(`   └── Migrated Polar customer data for ${oldUser.email}`);
                    }
                }

                console.log(`✅ Migrated: ${oldUser.email}`);
                migratedCount++;

            } catch (userError) {
                console.error(`❌ Error migrating ${oldUser.email}:`, userError);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migratedCount}`);
        console.log(`   ⏭️  Skipped:  ${skippedCount}`);
        console.log(`   ❌ Errors:   ${errorCount}`);
        console.log('='.repeat(50) + '\n');

        if (errorCount === 0) {
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log('⚠️  Migration completed with errors. Please review the log above.');
        }

    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
migrateUsers().catch(console.error);
