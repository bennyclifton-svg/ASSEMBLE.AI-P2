/**
 * SQLite to PostgreSQL Migration Script
 * Exports data from SQLite and imports to PostgreSQL
 *
 * Usage: npx tsx scripts/migrate-sqlite-to-pg.ts
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SQLITE_PATH = process.env.SQLITE_PATH || 'sqlite.db';
const PG_CONNECTION = process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (!PG_CONNECTION) {
    console.error('❌ DATABASE_URL or SUPABASE_POSTGRES_URL environment variable is required');
    process.exit(1);
}

// Tables to migrate in order (respecting foreign key dependencies)
const MIGRATION_ORDER = [
    // Base tables (no dependencies)
    'categories',
    'organizations',
    'file_assets',
    'companies',
    'import_templates',
    'gis_cache',

    // First level dependencies
    'subcategories',
    'users',
    'projects',
    'knowledge_libraries',

    // Second level dependencies
    'sessions',
    'login_attempts',
    'subscriptions',
    'documents',
    'project_details',
    'project_objectives',
    'project_stages',
    'risks',
    'stakeholders',
    'consultant_disciplines',
    'contractor_trades',
    'library_documents',
    'project_snapshots',

    // Third level dependencies
    'versions',
    'consultant_statuses',
    'contractor_statuses',
    'discipline_fee_items',
    'trade_price_items',
    'consultants',
    'contractors',
    'cost_lines',
    'transmittals',
    'addenda',
    'rft_new',
    'evaluations',
    'trr',
    'revision_history',

    // Fourth level dependencies
    'transmittal_items',
    'addendum_transmittals',
    'rft_new_transmittals',
    'trr_transmittals',
    'cost_line_allocations',
    'variations',
    'cost_line_comments',
    'tender_submissions',
    'evaluation_rows',
    'evaluation_non_price_criteria',

    // Final dependencies
    'invoices',
    'evaluation_cells',
    'evaluation_non_price_cells',
];

interface MigrationResult {
    table: string;
    sourceCount: number;
    migratedCount: number;
    success: boolean;
    error?: string;
}

async function migrateTable(
    sqlite: Database.Database,
    pgPool: Pool,
    tableName: string
): Promise<MigrationResult> {
    const result: MigrationResult = {
        table: tableName,
        sourceCount: 0,
        migratedCount: 0,
        success: false,
    };

    try {
        // Check if table exists in SQLite
        const tableExists = sqlite.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(tableName);

        if (!tableExists) {
            console.log(`  ⏭️  Skipping ${tableName} (not found in SQLite)`);
            result.success = true;
            return result;
        }

        // Get all rows from SQLite
        const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];
        result.sourceCount = rows.length;

        if (rows.length === 0) {
            console.log(`  ⏭️  Skipping ${tableName} (empty table)`);
            result.success = true;
            return result;
        }

        // Get column names from first row
        const columns = Object.keys(rows[0]);

        // Build PostgreSQL INSERT statement with ON CONFLICT DO NOTHING for idempotency
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnList = columns.map(c => `"${toSnakeCase(c)}"`).join(', ');
        const insertSql = `INSERT INTO "${toSnakeCase(tableName)}" (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        const client = await pgPool.connect();
        try {
            // Use transaction for data integrity
            await client.query('BEGIN');

            for (const row of rows) {
                const values = columns.map(col => {
                    const value = row[col];
                    // Convert SQLite boolean (0/1) to PostgreSQL boolean
                    if (typeof value === 'number' && (value === 0 || value === 1) &&
                        (col.includes('is_') || col.includes('_enabled') || col.includes('shortlisted') || col.includes('awarded'))) {
                        return value === 1;
                    }
                    return value;
                });

                try {
                    await client.query(insertSql, values);
                    result.migratedCount++;
                } catch (insertError) {
                    // Log but continue - ON CONFLICT handles duplicates
                    console.warn(`    Warning inserting row in ${tableName}:`, insertError);
                }
            }

            await client.query('COMMIT');
            result.success = true;
            console.log(`  ✅ ${tableName}: ${result.migratedCount}/${result.sourceCount} rows migrated`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ ${tableName}: ${result.error}`);
    }

    return result;
}

// Convert camelCase to snake_case
function toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

async function exportToJson(sqlite: Database.Database, outputDir: string): Promise<void> {
    console.log('\n📦 Exporting SQLite data to JSON backup...\n');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const tableName of MIGRATION_ORDER) {
        try {
            const tableExists = sqlite.prepare(
                `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            ).get(tableName);

            if (!tableExists) continue;

            const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
            const filePath = path.join(outputDir, `${tableName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
            console.log(`  📄 Exported ${tableName}: ${rows.length} rows`);
        } catch (error) {
            console.warn(`  ⚠️  Could not export ${tableName}:`, error);
        }
    }
}

async function verifyMigration(
    sqlite: Database.Database,
    pgPool: Pool
): Promise<{ passed: boolean; details: Record<string, { sqlite: number; pg: number }> }> {
    console.log('\n🔍 Verifying migration...\n');

    const details: Record<string, { sqlite: number; pg: number }> = {};
    let allMatch = true;

    for (const tableName of MIGRATION_ORDER) {
        try {
            // SQLite count
            const tableExists = sqlite.prepare(
                `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
            ).get(tableName);

            if (!tableExists) continue;

            const sqliteCount = (sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }).count;

            // PostgreSQL count
            const pgResult = await pgPool.query(`SELECT COUNT(*) as count FROM "${toSnakeCase(tableName)}"`);
            const pgCount = parseInt(pgResult.rows[0].count, 10);

            details[tableName] = { sqlite: sqliteCount, pg: pgCount };

            const match = sqliteCount === pgCount ? '✅' : '❌';
            if (sqliteCount !== pgCount) allMatch = false;

            console.log(`  ${match} ${tableName}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`);
        } catch (error) {
            console.warn(`  ⚠️  Could not verify ${tableName}:`, error);
        }
    }

    return { passed: allMatch, details };
}

async function main() {
    console.log('🚀 SQLite to PostgreSQL Migration\n');
    console.log(`Source: ${SQLITE_PATH}`);
    console.log(`Target: PostgreSQL (connection from env)\n`);

    // Check if SQLite file exists
    if (!fs.existsSync(SQLITE_PATH)) {
        console.error(`❌ SQLite database not found at ${SQLITE_PATH}`);
        process.exit(1);
    }

    // Connect to databases
    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    const pgPool = new Pool({
        connectionString: PG_CONNECTION,
        ssl: { rejectUnauthorized: false },
    });

    try {
        // Test PostgreSQL connection
        console.log('Testing PostgreSQL connection...');
        await pgPool.query('SELECT 1');
        console.log('✅ PostgreSQL connected\n');

        // Export to JSON backup first
        await exportToJson(sqlite, 'migration-backup');

        // Migrate tables
        console.log('\n📊 Migrating tables...\n');
        const results: MigrationResult[] = [];

        for (const tableName of MIGRATION_ORDER) {
            const result = await migrateTable(sqlite, pgPool, tableName);
            results.push(result);
        }

        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalRows = results.reduce((sum, r) => sum + r.migratedCount, 0);

        console.log('\n📈 Migration Summary:');
        console.log(`  Tables migrated: ${successful}/${results.length}`);
        console.log(`  Tables failed: ${failed}`);
        console.log(`  Total rows migrated: ${totalRows}`);

        // Verify
        const verification = await verifyMigration(sqlite, pgPool);

        console.log('\n🏁 Migration Complete!');
        console.log(`  Verification: ${verification.passed ? '✅ PASSED' : '❌ FAILED - Check row counts above'}`);

        if (failed > 0) {
            console.log('\n⚠️  Some tables failed to migrate. Check errors above.');
            console.log('   JSON backup saved to ./migration-backup/ for manual inspection.');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        sqlite.close();
        await pgPool.end();
    }
}

main().catch(console.error);
