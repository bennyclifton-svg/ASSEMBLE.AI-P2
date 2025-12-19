const Database = require('better-sqlite3');
const db = new Database('./sqlite.db');

const projectId = '1765424841568-ah5q5ctn7';

// Generate unique IDs
const genId = () => Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

// New default cost lines
const newCostLines = [
  // FEES (2)
  { section: 'FEES', cost_code: '1.01', activity: 'Council Fees', budget_cents: 0, sort_order: 1 },
  { section: 'FEES', cost_code: '1.02', activity: 'Authority Fees', budget_cents: 0, sort_order: 2 },
  // CONSULTANTS (3)
  { section: 'CONSULTANTS', cost_code: '2.01', activity: 'Stage 1', budget_cents: 0, sort_order: 1 },
  { section: 'CONSULTANTS', cost_code: '2.02', activity: 'Stage 2', budget_cents: 0, sort_order: 2 },
  { section: 'CONSULTANTS', cost_code: '2.03', activity: 'Stage 3', budget_cents: 0, sort_order: 3 },
  // CONSTRUCTION (2)
  { section: 'CONSTRUCTION', cost_code: '3.01', activity: 'Prelims & Margin', budget_cents: 0, sort_order: 1 },
  { section: 'CONSTRUCTION', cost_code: '3.02', activity: 'Trade Costs', budget_cents: 0, sort_order: 2 },
  // CONTINGENCY (1)
  { section: 'CONTINGENCY', cost_code: '4.01', activity: 'Construction', budget_cents: 0, sort_order: 1 },
];

// Get all cost line IDs for this project
const costLineIds = db.prepare('SELECT id FROM cost_lines WHERE project_id = ?').all(projectId).map(r => r.id);
console.log('Cost line IDs to remove:', costLineIds.length);

if (costLineIds.length === 0) {
  console.log('No cost lines found for project');
  db.close();
  process.exit(0);
}

// Start transaction
db.exec('BEGIN TRANSACTION');

try {
  // Clear all referencing tables
  const placeholders = costLineIds.map(() => '?').join(',');

  // Delete allocations
  const delAlloc = db.prepare(`DELETE FROM cost_line_allocations WHERE cost_line_id IN (${placeholders})`).run(...costLineIds);
  console.log('Deleted allocations:', delAlloc.changes);

  // Delete comments
  const delComments = db.prepare(`DELETE FROM cost_line_comments WHERE cost_line_id IN (${placeholders})`).run(...costLineIds);
  console.log('Deleted comments:', delComments.changes);

  // Unlink evaluation rows (set to NULL instead of delete)
  const unlinkEval = db.prepare(`UPDATE evaluation_rows SET cost_line_id = NULL WHERE cost_line_id IN (${placeholders})`).run(...costLineIds);
  console.log('Unlinked evaluation rows:', unlinkEval.changes);

  // Unlink invoices
  const unlinkInvoices = db.prepare('UPDATE invoices SET cost_line_id = NULL WHERE project_id = ?').run(projectId);
  console.log('Unlinked invoices:', unlinkInvoices.changes);

  // Unlink variations
  const unlinkVariations = db.prepare('UPDATE variations SET cost_line_id = NULL WHERE project_id = ?').run(projectId);
  console.log('Unlinked variations:', unlinkVariations.changes);

  // Delete existing cost lines
  const deleteResult = db.prepare('DELETE FROM cost_lines WHERE project_id = ?').run(projectId);
  console.log('Deleted cost lines:', deleteResult.changes);

  // Insert new cost lines
  const insertStmt = db.prepare(`
    INSERT INTO cost_lines (id, project_id, section, cost_code, activity, budget_cents, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const line of newCostLines) {
    insertStmt.run(genId(), projectId, line.section, line.cost_code, line.activity, line.budget_cents, line.sort_order);
  }

  db.exec('COMMIT');
  console.log('\nInserted', newCostLines.length, 'new cost lines');

  // Verify
  const costLines = db.prepare('SELECT section, cost_code, activity, budget_cents FROM cost_lines WHERE project_id = ? ORDER BY section, sort_order').all(projectId);
  console.log('\n=== New cost lines for Greenfield Commercial Tower ===');
  costLines.forEach(l => console.log(`  ${l.section} | ${l.cost_code} | ${l.activity} | $${(l.budget_cents/100).toFixed(2)}`));
  console.log('\nDone!');

} catch (err) {
  db.exec('ROLLBACK');
  console.error('Error:', err.message);
  console.error(err.stack);
}

db.close();
