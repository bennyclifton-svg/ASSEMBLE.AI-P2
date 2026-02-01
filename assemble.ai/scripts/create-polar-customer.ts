/**
 * Script to create missing Polar customers for existing users
 *
 * Usage: npx tsx scripts/create-polar-customer.ts [user-email]
 *
 * If no email is provided, it will create customers for ALL users missing them.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
import { Polar } from '@polar-sh/sdk';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

async function createPolarCustomer(userId: string, email: string, name: string) {
    try {
        console.log(`Creating Polar customer for ${email}...`);

        // Create customer in Polar with user ID as external reference
        const customer = await polar.customers.create({
            email: email,
            name: name,
            externalId: userId,
        });

        console.log(`  ✓ Created Polar customer: ${customer.id}`);
        console.log(`  External ID: ${customer.externalId}`);

        return customer;
    } catch (error: any) {
        // Check if customer already exists
        if (error.message?.includes('already exists') || error.body?.includes('already exists')) {
            console.log(`  ℹ Customer already exists in Polar for ${email}`);
            return null;
        }
        throw error;
    }
}

async function main() {
    const targetEmail = process.argv[2];

    console.log('Polar Customer Creation Script');
    console.log('===============================\n');
    console.log(`Environment: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX'}`);
    console.log(`Polar Access Token: ${process.env.POLAR_ACCESS_TOKEN ? 'Set' : 'NOT SET'}\n`);

    if (!process.env.POLAR_ACCESS_TOKEN) {
        console.error('Error: POLAR_ACCESS_TOKEN not set');
        process.exit(1);
    }

    try {
        // Get users
        let query = 'SELECT id, email, name FROM "user"';
        const params: string[] = [];

        if (targetEmail) {
            query += ' WHERE email = $1';
            params.push(targetEmail);
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            console.log(targetEmail ? `No user found with email: ${targetEmail}` : 'No users in database');
            return;
        }

        console.log(`Found ${result.rows.length} user(s) to process:\n`);

        for (const user of result.rows) {
            console.log(`Processing: ${user.name} (${user.email})`);
            console.log(`  User ID: ${user.id}`);

            try {
                await createPolarCustomer(user.id, user.email, user.name);
            } catch (error: any) {
                console.error(`  ✗ Error: ${error.message}`);
                if (error.body) {
                    console.error(`  Details: ${JSON.stringify(error.body)}`);
                }
            }
            console.log('');
        }

        console.log('Done!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
