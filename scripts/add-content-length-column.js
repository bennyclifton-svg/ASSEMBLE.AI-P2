/**
 * Migration script to add content_length column to report_templates table
 * T099l: Content length for Long RFT
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.SUPABASE_POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
});

async function migrate() {
    const client = await pool.connect();
    try {
        // Check if column exists
        const checkResult = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'report_templates'
            AND column_name = 'content_length'
        `);

        if (checkResult.rows.length > 0) {
            console.log('content_length column already exists');
        } else {
            console.log('Adding content_length column...');
            await client.query(`
                ALTER TABLE report_templates
                ADD COLUMN content_length TEXT DEFAULT 'concise'
            `);
            console.log('Column added successfully');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
