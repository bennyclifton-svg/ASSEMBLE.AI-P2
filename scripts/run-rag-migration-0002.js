/**
 * Migration runner for RAG database (Supabase PostgreSQL)
 * Applies 0002_generation_mode migration
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { drizzle } = require('drizzle-orm/postgres-js');
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

  console.log('🔄 Connecting to Supabase PostgreSQL...');

  // Connect to Supabase PostgreSQL
  const queryClient = postgres(process.env.SUPABASE_POSTGRES_URL, { max: 1 });

  try {
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/rag/0002_generation_mode.sql');
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

    console.log(`📝 Found ${statements.length} SQL statement(s)...`);
    if (statements.length > 0) {
      console.log('First statement:', statements[0].substring(0, 100) + '...');
    }

    for (const statement of statements) {
      if (statement) {
        console.log(`   Executing: ${statement.substring(0, 60)}...`);
        await queryClient.unsafe(statement);
      }
    }

    console.log('✅ Migration 0002_generation_mode applied successfully!');
    console.log('');
    console.log('Changes applied:');
    console.log('  - Added generation_mode column to report_templates');
    console.log('  - Default value: ai_assisted');
    console.log('  - Allowed values: data_only, ai_assisted');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('ℹ️  This migration may have already been applied.');
    } else {
      process.exit(1);
    }
  } finally {
    await queryClient.end();
  }
}

main().catch(console.error);
