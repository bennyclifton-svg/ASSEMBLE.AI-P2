/**
 * Quick script to check sync status in PostgreSQL
 */
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function checkStatus() {
    const connectionString = process.env.SUPABASE_POSTGRES_URL;
    if (!connectionString) {
        console.error('SUPABASE_POSTGRES_URL not set');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Query all document_set_members
        const result = await pool.query(`
            SELECT
                dsm.id,
                dsm.document_id,
                dsm.document_set_id,
                dsm.sync_status,
                dsm.error_message,
                dsm.synced_at,
                dsm.created_at
            FROM document_set_members dsm
            ORDER BY dsm.created_at DESC
            LIMIT 20
        `);

        console.log('Document Set Members:');
        console.log('='.repeat(80));
        for (const row of result.rows) {
            console.log(`Document ID: ${row.document_id}`);
            console.log(`  Set ID: ${row.document_set_id}`);
            console.log(`  Status: ${row.sync_status}`);
            console.log(`  Error: ${row.error_message || 'none'}`);
            console.log(`  Synced At: ${row.synced_at || 'never'}`);
            console.log('-'.repeat(40));
        }
    } catch (error) {
        console.error('Query error:', error);
    } finally {
        await pool.end();
    }
}

checkStatus();
