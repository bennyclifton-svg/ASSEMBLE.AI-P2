const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL
});

async function check() {
  try {
    console.log('Connecting to:', process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL);

    // Check if sessions table exists
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'sessions'
    `);
    console.log('Sessions table exists:', result.rows.length > 0);

    if (result.rows.length > 0) {
      // Check table structure
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      console.log('Columns:', cols.rows);
    } else {
      console.log('Sessions table does NOT exist!');

      // List all tables
      const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      console.log('All tables in database:', tables.rows.map(r => r.table_name));
    }

  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    await pool.end();
  }
}
check();
