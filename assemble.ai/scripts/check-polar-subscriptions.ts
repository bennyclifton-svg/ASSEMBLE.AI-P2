/**
 * Check Polar Subscription Data Script
 *
 * This script checks what subscription data is stored in the database
 * and optionally syncs from Polar API if data is missing.
 *
 * Run with: npx tsx scripts/check-polar-subscriptions.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE any other imports
// Order matters - .env.local has secrets, .env.development has defaults
const localResult = config({ path: resolve(process.cwd(), '.env.local') });
const devResult = config({ path: resolve(process.cwd(), '.env.development') });
const defaultResult = config({ path: resolve(process.cwd(), '.env') });

console.log('Loading env files:');
console.log('  .env.local:', localResult.error ? `Error: ${localResult.error.message}` : 'Loaded');
console.log('  .env.development:', devResult.error ? `Error: ${devResult.error.message}` : 'Loaded');
console.log('  .env:', defaultResult.error ? `Error: ${defaultResult.error.message}` : 'Loaded');
console.log('  SUPABASE_POSTGRES_URL:', process.env.SUPABASE_POSTGRES_URL ? 'Set' : 'Not set');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

async function main() {
    // Dynamic imports to ensure env vars are loaded first
    const { db } = await import('../src/lib/db');
    const { user, polarCustomer, polarSubscription } = await import('../src/lib/db/auth-schema');
    const { Polar } = await import('@polar-sh/sdk');
    const { eq } = await import('drizzle-orm');
    const { randomUUID } = await import('crypto');

    console.log('\n=== Polar Subscription Check ===\n');

    // Check environment variables
    console.log('Environment Variables:');
    console.log('  POLAR_ACCESS_TOKEN:', process.env.POLAR_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('  POLAR_STARTER_PRODUCT_ID:', process.env.POLAR_STARTER_PRODUCT_ID || '❌ Missing');
    console.log('  POLAR_PROFESSIONAL_PRODUCT_ID:', process.env.POLAR_PROFESSIONAL_PRODUCT_ID || '❌ Missing');
    console.log('');

    // Get all users
    const users = await db.select().from(user);
    console.log(`Found ${users.length} users in database:\n`);

    for (const u of users) {
        console.log(`User: ${u.email} (${u.id})`);

        // Check for polar customer
        const [customer] = await db
            .select()
            .from(polarCustomer)
            .where(eq(polarCustomer.userId, u.id))
            .limit(1);

        if (customer) {
            console.log(`  Polar Customer ID: ${customer.polarCustomerId}`);

            // Check for subscriptions
            const subscriptions = await db
                .select()
                .from(polarSubscription)
                .where(eq(polarSubscription.customerId, customer.id));

            if (subscriptions.length > 0) {
                console.log(`  Subscriptions (${subscriptions.length}):`);
                for (const sub of subscriptions) {
                    console.log(`    - Product: ${sub.productId}`);
                    console.log(`      Status: ${sub.status}`);
                    console.log(`      Polar Sub ID: ${sub.polarSubscriptionId}`);
                    console.log(`      Period End: ${sub.currentPeriodEnd}`);
                }
            } else {
                console.log('  ❌ No subscriptions in database');

                // Try to fetch from Polar API
                if (process.env.POLAR_ACCESS_TOKEN) {
                    console.log('  Checking Polar API for subscriptions...');
                    try {
                        const polar = new Polar({
                            accessToken: process.env.POLAR_ACCESS_TOKEN,
                            server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
                        });

                        // Get subscriptions from Polar
                        const polarSubs = await polar.subscriptions.list({
                            customerId: customer.polarCustomerId,
                        });

                        if (polarSubs.result.items.length > 0) {
                            console.log(`  ✅ Found ${polarSubs.result.items.length} subscription(s) in Polar!`);
                            for (const polarSub of polarSubs.result.items) {
                                console.log(`    - Product: ${polarSub.productId}`);
                                console.log(`      Status: ${polarSub.status}`);
                                console.log(`      Polar Sub ID: ${polarSub.id}`);

                                // Ask to sync
                                console.log('\n  Syncing subscription to database...');
                                await db.insert(polarSubscription).values({
                                    id: randomUUID(),
                                    customerId: customer.id,
                                    polarSubscriptionId: polarSub.id,
                                    productId: polarSub.productId,
                                    priceId: (polarSub as { priceId?: string }).priceId || null,
                                    status: polarSub.status,
                                    currentPeriodStart: polarSub.currentPeriodStart
                                        ? new Date(polarSub.currentPeriodStart)
                                        : null,
                                    currentPeriodEnd: polarSub.currentPeriodEnd
                                        ? new Date(polarSub.currentPeriodEnd)
                                        : null,
                                    cancelAtPeriodEnd: polarSub.cancelAtPeriodEnd || false,
                                    canceledAt: polarSub.canceledAt
                                        ? new Date(polarSub.canceledAt)
                                        : null,
                                }).onConflictDoNothing();
                                console.log('  ✅ Subscription synced to database!');
                            }
                        } else {
                            console.log('  ❌ No subscriptions found in Polar API either');
                        }
                    } catch (polarError) {
                        console.error('  Error fetching from Polar:', polarError);
                    }
                }
            }
        } else {
            console.log('  ❌ No Polar customer record');

            // Try to find or create Polar customer
            if (process.env.POLAR_ACCESS_TOKEN && u.email) {
                console.log('  Checking Polar API for customer...');
                try {
                    const polar = new Polar({
                        accessToken: process.env.POLAR_ACCESS_TOKEN,
                        server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
                    });

                    // Search for customer by email
                    const customers = await polar.customers.list({
                        email: u.email,
                    });

                    if (customers.result.items.length > 0) {
                        const polarCust = customers.result.items[0];
                        console.log(`  ✅ Found Polar customer: ${polarCust.id}`);

                        // Create local record
                        const newCustomerId = randomUUID();
                        await db.insert(polarCustomer).values({
                            id: newCustomerId,
                            userId: u.id,
                            polarCustomerId: polarCust.id,
                            email: u.email,
                        });
                        console.log('  ✅ Polar customer record created in database');

                        // Now check for subscriptions
                        const polarSubs = await polar.subscriptions.list({
                            customerId: polarCust.id,
                        });

                        if (polarSubs.result.items.length > 0) {
                            console.log(`  ✅ Found ${polarSubs.result.items.length} subscription(s) in Polar!`);
                            for (const polarSub of polarSubs.result.items) {
                                await db.insert(polarSubscription).values({
                                    id: randomUUID(),
                                    customerId: newCustomerId,
                                    polarSubscriptionId: polarSub.id,
                                    productId: polarSub.productId,
                                    priceId: (polarSub as { priceId?: string }).priceId || null,
                                    status: polarSub.status,
                                    currentPeriodStart: polarSub.currentPeriodStart
                                        ? new Date(polarSub.currentPeriodStart)
                                        : null,
                                    currentPeriodEnd: polarSub.currentPeriodEnd
                                        ? new Date(polarSub.currentPeriodEnd)
                                        : null,
                                    cancelAtPeriodEnd: polarSub.cancelAtPeriodEnd || false,
                                    canceledAt: polarSub.canceledAt
                                        ? new Date(polarSub.canceledAt)
                                        : null,
                                }).onConflictDoNothing();
                                console.log(`  ✅ Subscription ${polarSub.id} synced!`);
                            }
                        }
                    } else {
                        console.log('  ❌ No Polar customer found for this email');
                    }
                } catch (polarError) {
                    console.error('  Error fetching from Polar:', polarError);
                }
            }
        }
        console.log('');
    }

    console.log('\n=== Check Complete ===\n');
    console.log('If subscriptions were synced, refresh the billing page to see the updated plan.');
    console.log('');
    process.exit(0);
}

main().catch(console.error);
