/**
 * Cleanup Consultant Discipline Duplicates
 *
 * This script removes duplicate and obsolete consultant disciplines
 * from the database based on the user's review.
 *
 * DUPLICATES TO REMOVE (abbreviated versions):
 * - Civil → Civil Engineer
 * - Electrical → Electrical Engineer
 * - Structural → Structural Engineer
 * - Hydraulic → Hydraulic Engineer
 * - Mechanical → Mechanical Engineer
 * - Landscape → Landscape Architect
 * - ESD → ESD Consultant
 * - Acoustic → Acoustic Consultant
 * - Facade → Façade Engineer
 * - Access → Access Consultant
 * - Geotech → Geotechnical Engineer
 * - Traffic → Traffic Engineer
 * - Vertical Transport → Vertical Transport Consultant
 * - Waste Management → Waste Management Consultant
 * - Survey → Registered Surveyor
 *
 * OBSOLETE (covered by other disciplines):
 * - BASIX (part of ESD/Architect)
 * - NBN (part of Electrical)
 * - Stormwater (part of Civil Engineer)
 * - Wastewater (part of Hydraulic Engineer)
 *
 * RENAMES:
 * - Ecology → Ecologist
 * - Flood → Flood Consultant
 * - Fire Services → Fire Services Engineer
 * - ASP3 → High Voltage Engineer
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path - uses sqlite.db as per src/lib/db/index.ts
const dbPath = path.join(__dirname, '../sqlite.db');
const db = new Database(dbPath);

// Disciplines to remove (exact matches)
const DISCIPLINES_TO_REMOVE = [
  'Civil',
  'Electrical',
  'Structural',
  'Hydraulic',
  'Mechanical',
  'Landscape',
  'ESD',
  'Acoustic',
  'Facade',
  'Access',
  'Geotech',
  'Traffic',
  'Vertical Transport',
  'Waste Management',
  'Survey',
  'BASIX',
  'NBN',
  'Stormwater',
  'Wastewater',
];

// Disciplines to rename
const DISCIPLINES_TO_RENAME = [
  { from: 'Ecology', to: 'Ecologist' },
  { from: 'Flood', to: 'Flood Consultant' },
  { from: 'Fire Services', to: 'Fire Services Engineer' },
  { from: 'ASP3', to: 'High Voltage Engineer' },
];

function getAllProjects() {
  const stmt = db.prepare('SELECT id, name FROM projects ORDER BY name');
  return stmt.all();
}

function getDisciplinesForProject(projectId) {
  const stmt = db.prepare(`
    SELECT id, discipline_name, is_enabled
    FROM consultant_disciplines
    WHERE project_id = ?
    ORDER BY discipline_name
  `);
  return stmt.all(projectId);
}

function getDisciplineReferences(disciplineId) {
  const references = {
    transmittals: 0,
    feeItems: 0,
    costLines: 0,
    documentSets: 0,
  };

  // Check transmittals
  const transmittalStmt = db.prepare(
    'SELECT COUNT(*) as count FROM transmittals WHERE discipline_id = ?'
  );
  references.transmittals = transmittalStmt.get(disciplineId)?.count || 0;

  // Check fee items
  const feeItemsStmt = db.prepare(
    'SELECT COUNT(*) as count FROM discipline_fee_items WHERE discipline_id = ?'
  );
  references.feeItems = feeItemsStmt.get(disciplineId)?.count || 0;

  // Check cost lines
  const costLinesStmt = db.prepare(
    'SELECT COUNT(*) as count FROM cost_lines WHERE discipline_id = ? AND deleted_at IS NULL'
  );
  references.costLines = costLinesStmt.get(disciplineId)?.count || 0;

  return references;
}

function renameDiscipline(disciplineId, newName) {
  const stmt = db.prepare(`
    UPDATE consultant_disciplines
    SET discipline_name = ?
    WHERE id = ?
  `);
  stmt.run(newName, disciplineId);
}

function deleteDiscipline(disciplineId) {
  // Delete related data first
  db.prepare('DELETE FROM consultant_statuses WHERE discipline_id = ?').run(disciplineId);
  db.prepare('DELETE FROM discipline_fee_items WHERE discipline_id = ?').run(disciplineId);
  db.prepare('DELETE FROM transmittals WHERE discipline_id = ?').run(disciplineId);
  db.prepare('UPDATE cost_lines SET discipline_id = NULL WHERE discipline_id = ?').run(disciplineId);

  // Delete the discipline
  db.prepare('DELETE FROM consultant_disciplines WHERE id = ?').run(disciplineId);
}

function analyzeCleanup() {
  console.log('\n=== CONSULTANT DISCIPLINE CLEANUP ANALYSIS ===\n');

  const projects = getAllProjects();
  console.log(`Found ${projects.length} project(s) in database\n`);

  const disciplinesToDelete = [];
  const disciplinesToRename = [];

  for (const project of projects) {
    console.log(`\n📁 Project: ${project.name} (${project.id})`);
    console.log('─'.repeat(60));

    const disciplines = getDisciplinesForProject(project.id);

    // Find disciplines to remove
    for (const discipline of disciplines) {
      if (DISCIPLINES_TO_REMOVE.includes(discipline.discipline_name)) {
        const refs = getDisciplineReferences(discipline.id);
        disciplinesToDelete.push({
          projectId: project.id,
          projectName: project.name,
          id: discipline.id,
          name: discipline.discipline_name,
          enabled: discipline.is_enabled,
          references: refs,
        });
      }
    }

    // Find disciplines to rename
    for (const renameRule of DISCIPLINES_TO_RENAME) {
      const discipline = disciplines.find(d => d.discipline_name === renameRule.from);
      if (discipline) {
        disciplinesToRename.push({
          projectId: project.id,
          projectName: project.name,
          id: discipline.id,
          oldName: renameRule.from,
          newName: renameRule.to,
          enabled: discipline.is_enabled,
        });
      }
    }
  }

  // Display results
  console.log('\n\n=== DISCIPLINES TO DELETE ===\n');
  if (disciplinesToDelete.length === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`Found ${disciplinesToDelete.length} discipline(s) to delete:\n`);
    for (const d of disciplinesToDelete) {
      console.log(`❌ ${d.name} (${d.projectName})`);
      console.log(`   ID: ${d.id}`);
      console.log(`   Enabled: ${d.enabled ? 'Yes' : 'No'}`);
      console.log(`   References: ${d.references.transmittals} transmittals, ${d.references.feeItems} fee items, ${d.references.costLines} cost lines`);
      console.log('');
    }
  }

  console.log('\n=== DISCIPLINES TO RENAME ===\n');
  if (disciplinesToRename.length === 0) {
    console.log('✅ No disciplines to rename!');
  } else {
    console.log(`Found ${disciplinesToRename.length} discipline(s) to rename:\n`);
    for (const d of disciplinesToRename) {
      console.log(`✏️  ${d.oldName} → ${d.newName} (${d.projectName})`);
      console.log(`   ID: ${d.id}`);
      console.log(`   Enabled: ${d.enabled ? 'Yes' : 'No'}`);
      console.log('');
    }
  }

  return { disciplinesToDelete, disciplinesToRename };
}

function executeCleanup(disciplinesToDelete, disciplinesToRename, dryRun = true) {
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
    console.log('To execute cleanup, run: node cleanup-consultant-duplicates.js --execute\n');
    return;
  }

  console.log('\n⚠️  EXECUTING CLEANUP - This will modify the database!\n');

  db.prepare('BEGIN TRANSACTION').run();

  try {
    // Rename disciplines
    console.log('Renaming disciplines...');
    for (const d of disciplinesToRename) {
      console.log(`  ✏️  Renaming "${d.oldName}" to "${d.newName}" in ${d.projectName}`);
      renameDiscipline(d.id, d.newName);
    }

    // Delete disciplines
    console.log('\nDeleting disciplines...');
    for (const d of disciplinesToDelete) {
      console.log(`  ❌ Deleting "${d.name}" from ${d.projectName}`);
      deleteDiscipline(d.id);
    }

    db.prepare('COMMIT').run();
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`   Renamed: ${disciplinesToRename.length} disciplines`);
    console.log(`   Deleted: ${disciplinesToDelete.length} disciplines`);
  } catch (error) {
    db.prepare('ROLLBACK').run();
    console.error('\n❌ Error during cleanup:', error);
    console.error('Transaction rolled back - no changes were made');
    throw error;
  }
}

// Main execution
function main() {
  const isExecute = process.argv.includes('--execute');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Consultant Discipline Cleanup Script                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const { disciplinesToDelete, disciplinesToRename } = analyzeCleanup();

  if (disciplinesToDelete.length === 0 && disciplinesToRename.length === 0) {
    console.log('\n✅ Database is clean! No duplicates or renames needed.\n');
    process.exit(0);
  }

  executeCleanup(disciplinesToDelete, disciplinesToRename, !isExecute);

  if (!isExecute) {
    console.log('\n📝 Summary:');
    console.log(`   • ${disciplinesToDelete.length} disciplines will be deleted`);
    console.log(`   • ${disciplinesToRename.length} disciplines will be renamed`);
    console.log('\n💡 Review the changes above and run with --execute to apply them.');
  }

  db.close();
}

main();
