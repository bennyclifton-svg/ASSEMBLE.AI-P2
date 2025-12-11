/**
 * Script to delete test projects (IDs 4-11) and all related data
 * Run with: node scripts/delete-test-projects.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'sqlite.db');

// Project IDs to delete (all test projects, keeping only default-project)
const PROJECT_IDS_TO_DELETE = [
    '1763846607203-o3sndtgt7',  // Test Project 2
    '1763846644094-ejkapoh3y',  // Test Project 3
    '1763872493491-lqfimvdmt',  // New Project 4
    '1764412823356-tjmjjef2a',  // Test Project 5
    '1764480561523-ew3v3jfk9',  // Test Project 6
    '1764480568379-59tp1ps1m',  // Test Project 6
    '1764480630721-ur1uq4twh',  // Test Init Project
    '1764480701439-9bsgkz5ju',  // Test Project 7
    '1764480967302-yswx42c02',  // Test Init Project
    '1764994408331-cjnfkiqok',  // Test Project 8
    '1764995365888-bwrbpydh7',  // Test Project 9
    '1764996936806-v5mk0sobt',  // Test Project 10
    '1764998625360-qodwgzwzm',  // Test Project 11
];

function deleteTestProjects() {
    const db = new Database(DB_PATH);

    try {
        console.log('Starting deletion of test projects:', PROJECT_IDS_TO_DELETE.join(', '));
        console.log('Database path:', DB_PATH);
        console.log('');

        // First, let's see what projects exist
        const existingProjects = db.prepare('SELECT id, name FROM projects WHERE id IN (' + PROJECT_IDS_TO_DELETE.map(() => '?').join(',') + ')').all(...PROJECT_IDS_TO_DELETE);
        console.log('Projects to delete:');
        existingProjects.forEach(p => console.log(`  - ${p.id}: ${p.name}`));
        console.log('');

        if (existingProjects.length === 0) {
            console.log('No matching projects found. Nothing to delete.');
            return;
        }

        // Use a transaction for atomic deletion
        const deleteAll = db.transaction(() => {
            const placeholders = PROJECT_IDS_TO_DELETE.map(() => '?').join(',');

            // Order matters due to foreign key constraints
            // Delete from child tables first, working up to parent tables

            // 1. Transmittal Items (depends on transmittals and versions)
            const transmittalIds = db.prepare(`SELECT id FROM transmittals WHERE project_id IN (${placeholders})`).all(...PROJECT_IDS_TO_DELETE).map(r => r.id);
            if (transmittalIds.length > 0) {
                const tiPlaceholders = transmittalIds.map(() => '?').join(',');
                const tiResult = db.prepare(`DELETE FROM transmittal_items WHERE transmittal_id IN (${tiPlaceholders})`).run(...transmittalIds);
                console.log(`Deleted ${tiResult.changes} transmittal_items`);
            }

            // 2. Transmittals
            const transmittalsResult = db.prepare(`DELETE FROM transmittals WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${transmittalsResult.changes} transmittals`);

            // 3. Versions (depends on documents)
            const documentIds = db.prepare(`SELECT id FROM documents WHERE project_id IN (${placeholders})`).all(...PROJECT_IDS_TO_DELETE).map(r => r.id);
            if (documentIds.length > 0) {
                const docPlaceholders = documentIds.map(() => '?').join(',');
                const versionsResult = db.prepare(`DELETE FROM versions WHERE document_id IN (${docPlaceholders})`).run(...documentIds);
                console.log(`Deleted ${versionsResult.changes} versions`);
            }

            // 4. Documents
            const documentsResult = db.prepare(`DELETE FROM documents WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${documentsResult.changes} documents`);

            // 5. Consultant Statuses (depends on consultant_disciplines)
            const disciplineIds = db.prepare(`SELECT id FROM consultant_disciplines WHERE project_id IN (${placeholders})`).all(...PROJECT_IDS_TO_DELETE).map(r => r.id);
            if (disciplineIds.length > 0) {
                const discPlaceholders = disciplineIds.map(() => '?').join(',');
                const csResult = db.prepare(`DELETE FROM consultant_statuses WHERE discipline_id IN (${discPlaceholders})`).run(...disciplineIds);
                console.log(`Deleted ${csResult.changes} consultant_statuses`);

                // 5b. Discipline Fee Items
                const feeResult = db.prepare(`DELETE FROM discipline_fee_items WHERE discipline_id IN (${discPlaceholders})`).run(...disciplineIds);
                console.log(`Deleted ${feeResult.changes} discipline_fee_items`);
            }

            // 6. Consultant Disciplines
            const disciplinesResult = db.prepare(`DELETE FROM consultant_disciplines WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${disciplinesResult.changes} consultant_disciplines`);

            // 7. Contractor Statuses (depends on contractor_trades)
            const tradeIds = db.prepare(`SELECT id FROM contractor_trades WHERE project_id IN (${placeholders})`).all(...PROJECT_IDS_TO_DELETE).map(r => r.id);
            if (tradeIds.length > 0) {
                const tradePlaceholders = tradeIds.map(() => '?').join(',');
                const ctsResult = db.prepare(`DELETE FROM contractor_statuses WHERE trade_id IN (${tradePlaceholders})`).run(...tradeIds);
                console.log(`Deleted ${ctsResult.changes} contractor_statuses`);

                // 7b. Trade Price Items
                const priceResult = db.prepare(`DELETE FROM trade_price_items WHERE trade_id IN (${tradePlaceholders})`).run(...tradeIds);
                console.log(`Deleted ${priceResult.changes} trade_price_items`);
            }

            // 8. Contractor Trades
            const tradesResult = db.prepare(`DELETE FROM contractor_trades WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${tradesResult.changes} contractor_trades`);

            // 9. Consultants (firms)
            const consultantsResult = db.prepare(`DELETE FROM consultants WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${consultantsResult.changes} consultants`);

            // 10. Contractors (firms)
            const contractorsResult = db.prepare(`DELETE FROM contractors WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${contractorsResult.changes} contractors`);

            // 11. Cost Line Comments (depends on cost_lines)
            const costLineIds = db.prepare(`SELECT id FROM cost_lines WHERE project_id IN (${placeholders})`).all(...PROJECT_IDS_TO_DELETE).map(r => r.id);
            if (costLineIds.length > 0) {
                const clPlaceholders = costLineIds.map(() => '?').join(',');
                const commentsResult = db.prepare(`DELETE FROM cost_line_comments WHERE cost_line_id IN (${clPlaceholders})`).run(...costLineIds);
                console.log(`Deleted ${commentsResult.changes} cost_line_comments`);

                // 11b. Cost Line Allocations
                const allocResult = db.prepare(`DELETE FROM cost_line_allocations WHERE cost_line_id IN (${clPlaceholders})`).run(...costLineIds);
                console.log(`Deleted ${allocResult.changes} cost_line_allocations`);
            }

            // 12. Invoices (may reference variations and cost_lines)
            const invoicesResult = db.prepare(`DELETE FROM invoices WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${invoicesResult.changes} invoices`);

            // 13. Variations (may reference cost_lines)
            const variationsResult = db.prepare(`DELETE FROM variations WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${variationsResult.changes} variations`);

            // 14. Cost Lines
            const costLinesResult = db.prepare(`DELETE FROM cost_lines WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${costLinesResult.changes} cost_lines`);

            // 15. Project Snapshots
            const snapshotsResult = db.prepare(`DELETE FROM project_snapshots WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${snapshotsResult.changes} project_snapshots`);

            // 16. Project Details
            const detailsResult = db.prepare(`DELETE FROM project_details WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${detailsResult.changes} project_details`);

            // 17. Project Objectives
            const objectivesResult = db.prepare(`DELETE FROM project_objectives WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${objectivesResult.changes} project_objectives`);

            // 18. Project Stages
            const stagesResult = db.prepare(`DELETE FROM project_stages WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${stagesResult.changes} project_stages`);

            // 19. Risks
            const risksResult = db.prepare(`DELETE FROM risks WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${risksResult.changes} risks`);

            // 20. Stakeholders
            const stakeholdersResult = db.prepare(`DELETE FROM stakeholders WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${stakeholdersResult.changes} stakeholders`);

            // 21. Revision History
            const revisionResult = db.prepare(`DELETE FROM revision_history WHERE project_id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${revisionResult.changes} revision_history`);

            // 22. Finally, delete the projects themselves
            const projectsResult = db.prepare(`DELETE FROM projects WHERE id IN (${placeholders})`).run(...PROJECT_IDS_TO_DELETE);
            console.log(`Deleted ${projectsResult.changes} projects`);
        });

        deleteAll();

        console.log('');
        console.log('Successfully deleted all test project data');

        // Show remaining projects
        const remaining = db.prepare('SELECT id, name FROM projects ORDER BY CAST(id AS INTEGER)').all();
        console.log('');
        console.log('Remaining projects:');
        remaining.forEach(p => console.log(`  - ${p.id}: ${p.name}`));

    } catch (error) {
        console.error('Error deleting projects:', error);
        throw error;
    } finally {
        db.close();
    }
}

// Run the script
deleteTestProjects();
