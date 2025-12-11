/**
 * Cleanup script for stale report locks and failed reports
 *
 * Run with: node scripts/cleanup-stale-reports.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Create PostgreSQL pool with Supabase connection
const pool = new Pool({
    connectionString: process.env.SUPABASE_POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function cleanup() {
    const client = await pool.connect();

    try {
        // Find and list all reports with issues
        console.log('\n=== Reports with locks ===');
        const lockedResult = await client.query(`
            SELECT id, project_id, title, status, locked_by, locked_at, discipline_id, trade_id
            FROM report_templates
            WHERE locked_by IS NOT NULL
        `);

        if (lockedResult.rows.length === 0) {
            console.log('No locked reports found.');
        } else {
            lockedResult.rows.forEach(r => {
                console.log(`- ${r.id}: "${r.title}" (status: ${r.status}, locked_by: ${r.locked_by})`);
            });
        }

        // Find reports stuck in generating status
        console.log('\n=== Reports in "generating" status ===');
        const generatingResult = await client.query(`
            SELECT id, project_id, title, status, locked_by, discipline_id, trade_id
            FROM report_templates
            WHERE status = 'generating'
        `);

        if (generatingResult.rows.length === 0) {
            console.log('No reports stuck in generating status.');
        } else {
            generatingResult.rows.forEach(r => {
                console.log(`- ${r.id}: "${r.title}"`);
            });
        }

        // Clear all locks
        console.log('\n=== Clearing locks ===');
        const clearLocksResult = await client.query(`
            UPDATE report_templates
            SET locked_by = NULL, locked_by_name = NULL, locked_at = NULL, updated_at = NOW()
            WHERE locked_by IS NOT NULL
        `);
        console.log(`Cleared ${clearLocksResult.rowCount} lock(s)`);

        // Reset stuck "generating" reports to "failed"
        console.log('\n=== Resetting stuck generating reports to failed ===');
        const resetResult = await client.query(`
            UPDATE report_templates
            SET status = 'failed', updated_at = NOW()
            WHERE status = 'generating'
        `);
        console.log(`Reset ${resetResult.rowCount} report(s) to failed status`);

        // Delete report_sections for failed reports (to allow clean regeneration)
        console.log('\n=== Cleaning up sections for failed reports ===');
        const failedResult = await client.query(`
            SELECT id FROM report_templates WHERE status = 'failed'
        `);

        let deletedSections = 0;
        for (const r of failedResult.rows) {
            const deleteResult = await client.query(`
                DELETE FROM report_sections WHERE report_id = $1
            `, [r.id]);
            deletedSections += deleteResult.rowCount;
        }
        console.log(`Deleted ${deletedSections} section(s) from failed reports`);

        console.log('\n=== Cleanup complete ===');
        console.log('You can now try generating reports again.');

    } finally {
        client.release();
        await pool.end();
    }
}

cleanup().catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
