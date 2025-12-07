/**
 * Migration runner for RAG database (Supabase PostgreSQL)
 * Applies 0004_report_context_ids migration
 * Fix: Add disciplineId and tradeId columns for proper report filtering
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function main() {
  // Check for environment variable
  if (!process.env.SUPABASE_POSTGRES_URL) {
    console.error('Error: SUPABASE_POSTGRES_URL environment variable not set');
    console.log('Please set SUPABASE_POSTGRES_URL in your .env file');
    process.exit(1);
  }

  console.log('Connecting to Supabase PostgreSQL...');

  // Connect to Supabase PostgreSQL
  const queryClient = postgres(process.env.SUPABASE_POSTGRES_URL, { max: 1 });

  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/rag/0004_report_context_ids.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove all comment lines and COMMENT ON statements
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolon and filter empty statements
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.toUpperCase().startsWith('COMMENT ON'));

    console.log(`Found ${statements.length} SQL statement(s)...`);

    for (const statement of statements) {
      if (statement) {
        console.log(`   Executing: ${statement.substring(0, 60)}...`);
        await queryClient.unsafe(statement);
      }
    }

    console.log('Migration 0004_report_context_ids applied successfully!');
    console.log('');
    console.log('Changes applied:');
    console.log('  - Added discipline_id column (TEXT) for consultant discipline filtering');
    console.log('  - Added trade_id column (TEXT) for contractor trade filtering');
    console.log('  - Created indexes on discipline_id and trade_id');

  } catch (error) {
    console.error('Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('This migration may have already been applied.');
    } else {
      process.exit(1);
    }
  } finally {
    await queryClient.end();
  }
}

main().catch(console.error);
