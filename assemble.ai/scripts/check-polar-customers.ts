/**
 * Script to check and optionally clear stale Polar customer records
 */

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    console.log('Checking polar_customer records...\n');

    try {
        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'polar_customer'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('polar_customer table does not exist yet.');
            return;
        }

        // Get all polar_customer records with user info
        const result = await pool.query(`
            SELECT pc.id, pc.user_id, pc.polar_customer_id, pc.email, pc.created_at,
                   u.email as user_email, u.name as user_name
            FROM polar_customer pc
            LEFT JOIN "user" u ON pc.user_id = u.id
        `);

        if (result.rows.length === 0) {
            console.log('No polar_customer records found.');
            return;
        }

        console.log(`Found ${result.rows.length} polar_customer record(s):\n`);

        for (const row of result.rows) {
            console.log(`  User: ${row.user_name || 'N/A'} (${row.user_email || row.email})`);
            console.log(`  Polar Customer ID: ${row.polar_customer_id}`);
            console.log(`  Created: ${row.created_at}`);
            console.log(`  DB Record ID: ${row.id}`);
            console.log('');
        }

        // If --delete flag is passed, delete all records
        if (process.argv.includes('--delete')) {
            console.log('Deleting all polar_customer records...');
            await pool.query('DELETE FROM polar_subscription');
            await pool.query('DELETE FROM polar_customer');
            console.log('Done! Users will get new Polar customers on next checkout.');
        } else {
            console.log('To delete stale records, run: npx tsx scripts/check-polar-customers.ts --delete');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
